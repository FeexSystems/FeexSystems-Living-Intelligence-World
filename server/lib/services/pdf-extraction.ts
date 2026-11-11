import { inflateRawSync, inflateSync } from 'zlib';

/**
 * PDF text extraction service (Mission 005, P3).
 *
 * Attempts to extract embedded text from PDF documents without external
 * dependencies. Uses Node's built-in zlib to decompress FlateDecode streams
 * commonly found in PDF content streams.
 *
 * Safety contract:
 *   - Never claims extraction succeeded when it did not run.
 *   - Returns null when extraction cannot be performed (scanned/image PDFs,
 *     corrupted files, unsupported compression).
 *   - Callers must treat null as EXTRACTION_UNAVAILABLE.
 */

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

const PDF_HEADER = '%PDF-';
const STREAM_START = 'stream';
const STREAM_END = 'endstream';
const FILTER_FLATE = '/FlateDecode';

/**
 * Find all stream byte ranges in the PDF that use FlateDecode compression.
 */
function findFlateStreams(buffer: Buffer): Array<{ start: number; end: number }> {
  const streams: Array<{ start: number; end: number }> = [];
  const content = buffer.toString('latin1');

  let pos = 0;
  while ((pos = content.indexOf(STREAM_START, pos)) !== -1) {
    // Look backwards for the filter declaration within a reasonable window.
    const dictStart = Math.max(0, pos - 2000);
    const dict = content.slice(dictStart, pos);

    if (!dict.includes(FILTER_FLATE)) {
      pos += STREAM_START.length;
      continue;
    }

    // Find the actual stream data start (after "stream\r\n" or "stream\n").
    const streamKeywordEnd = pos + STREAM_START.length;
    let dataStart = streamKeywordEnd;
    if (content[streamKeywordEnd] === '\r') dataStart = streamKeywordEnd + 2;
    else if (content[streamKeywordEnd] === '\n') dataStart = streamKeywordEnd + 1;

    const endPos = content.indexOf(STREAM_END, dataStart);
    if (endPos === -1) {
      pos += STREAM_START.length;
      continue;
    }

    streams.push({ start: dataStart, end: endPos });
    pos = endPos + STREAM_END.length;
  }

  return streams;
}

/**
 * Extract printable text from a decompressed PDF content stream.
 * PDF text is wrapped in parentheses or angle brackets; we extract
 * text-showing operators (Tj, TJ) and string literals.
 */
function extractTextFromStream(decompressed: Buffer): string {
  const content = decompressed.toString('latin1');
  const textParts: string[] = [];

  // Match Tj: (string) Tj — single string show
  const tjRegex = /\(([^\)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(content)) !== null) {
    // Capture group 1 always exists when the regex matches.
    if (match[1] !== undefined) textParts.push(match[1]);
  }

  // Match TJ: [ (string1) (string2) ... ] TJ — array show
  const tjArrayRegex = /\[\s*\(([^\)]*)\)\s*\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(content)) !== null) {
    if (match[1] !== undefined) textParts.push(match[1]);
  }

  return textParts.join('\n');
}

/**
 * Attempt to extract embedded text from a PDF buffer.
 * Returns null if the file is not a valid PDF, contains no extractable
 * text streams, or decompression fails.
 */
export function extractPdfText(buffer: Buffer): PdfExtractionResult | null {
  const header = buffer.toString('latin1', 0, 1000);
  if (!header.includes(PDF_HEADER)) return null;

  const streams = findFlateStreams(buffer);
  if (streams.length === 0) return null;

  let allText = '';
  for (const stream of streams) {
    const compressed = buffer.slice(stream.start, stream.end);
    let decompressed: Buffer;
    try {
      decompressed = inflateRawSync(compressed);
    } catch {
      // Try with zlib header (some PDFs wrap with zlib header)
      try {
        decompressed = inflateSync(compressed);
      } catch {
        continue;
      }
    }
    const text = extractTextFromStream(decompressed);
    if (text.trim()) allText += text + '\n\f\n'; // form-feed between pages
  }

  if (!allText.trim()) return null;

  // Approximate page count by counting form feeds + 1
  const pageCount = Math.max(1, (allText.match(/\f/g) || []).length + 1);

  return {
    text: allText.trim(),
    pageCount,
  };
}