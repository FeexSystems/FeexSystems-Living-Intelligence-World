/**
 * Minimal WebM/EBML inspector — prints track video dimensions and duration.
 * Usage: node scripts/tmp-webm-probe.mjs <file.webm>
 */
import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/tmp-webm-probe.mjs <file.webm>");
  process.exit(1);
}
const buf = fs.readFileSync(path);

let p = 0;
/** Number of bytes in a VINT given its first byte (marker bit position). */
function vintLength(first) {
  for (let i = 0; i < 8; i++) {
    if (first & (0x80 >> i)) return i + 1;
  }
  return 0;
}
function readId() {
  const first = buf[p++];
  const length = vintLength(first);
  if (length <= 1) return first;
  // ID values keep their length-marker bits (unlike sizes).
  let value = first;
  for (let i = 1; i < length; i++) value = value * 256 + buf[p++];
  return value;
}
function readSize() {
  const first = buf[p++];
  // Determine VINT length from the leading marker bit.
  let length = vintLength(first);
  if (length === 0) return -1;
  // Value is length*7 bits: first byte contributes (length-1)*7 bits of value
  // (the top `length` bits are marker + unused), remaining bytes contribute 7.
  // Size values are unsigned: all bits of continuation bytes count.
  let value = first & (0xff >> length);
  let allOnes = value === (0xff >> length);
  for (let i = 1; i < length; i++) {
    const b = buf[p++];
    value = value * 256 + b;
    if (b !== 0xff) allOnes = false;
  }
  // Unknown-size VINT (all value bits set) => element runs to end of parent.
  if (allOnes) return -1;
  return value;
}
function readUint(size) {
  let v = 0;
  for (let i = 0; i < size; i++) v = v * 256 + buf[p + i];
  p += size;
  return v;
}
function readFloat(size) {
  // EBML stores floats big-endian.
  let v;
  if (size === 4) v = buf.readFloatBE(p);
  else if (size === 8) v = buf.readDoubleBE(p);
  p += size;
  return v;
}
function readString(size) {
  const s = buf.toString("utf8", p, p + size);
  p += size;
  return s.replace(/\0+$/, "");
}

// EBML element ids we care about
const ID = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  Info: 0x1549a966,
  TimecodeScale: 0x2ad7b1,
  Duration: 0x4489,
  Tracks: 0x1654ae6b,
  TrackEntry: 0xae,
  TrackNumber: 0xd7,
  TrackType: 0x83,
  CodecID: 0x86,
  Video: 0xe0,
  PixelWidth: 0xb0,
  PixelHeight: 0xba,
  DisplayWidth: 0x54b0,
  DisplayHeight: 0x54ba,
  Cluster: 0x1f43b675,
  Timecode: 0xe7,
  SimpleBlock: 0xa3,
};

const results = { tracks: [], duration: null, timecodeScale: null, clusters: 0 };
let currentTrack = null;

function walk(end, depth) {
  while (p < end) {
    const start = p;
    if (p + 2 > end) break;
    const id = readId();
    const size = readSize();
    const dataStart = p;
    // Unknown-size element: it consumes the rest of the parent.
    const dataEnd = size === -1 ? end : dataStart + size;

    switch (id) {
      case ID.EBML:
      case ID.Segment:
      case ID.Info:
      case ID.Tracks:
      case ID.Video:
        p = dataStart;
        walk(dataEnd, depth + 1);
        break;
      case ID.TimecodeScale:
        results.timecodeScale = readUint(size);
        break;
      case ID.Duration:
        results.duration = readFloat(size);
        break;
      case ID.TrackEntry:
        // A new track starts; parse its children at this level.
        currentTrack = {};
        p = dataStart;
        walk(dataEnd, depth + 1);
        results.tracks.push(currentTrack);
        currentTrack = null;
        break;
      case ID.TrackNumber:
        if (currentTrack) currentTrack.number = readUint(size);
        break;
      case ID.CodecID:
        if (currentTrack) currentTrack.codec = readString(size);
        break;
      case ID.PixelWidth:
        if (currentTrack) currentTrack.width = readUint(size);
        break;
      case ID.PixelHeight:
        if (currentTrack) currentTrack.height = readUint(size);
        break;
      case ID.DisplayWidth:
        if (currentTrack) currentTrack.displayWidth = readUint(size);
        break;
      case ID.DisplayHeight:
        if (currentTrack) currentTrack.displayHeight = readUint(size);
        break;
      case ID.TrackType:
        if (currentTrack) currentTrack.type = readUint(size);
        break;
      case ID.Cluster:
        results.clusters++;
        break;
      default:
        break;
    }
    p = dataEnd;
    if (p <= start) break;
  }
}

p = 0;
walk(buf.length, 0);

console.log(JSON.stringify({ file: path, ...results }, null, 2));
