const fs = require('fs');
const s = fs.readFileSync('tc.txt', 'utf16le').replace(/^\uFEFF/, '');
const lines = s.split(/\r?\n/).filter(l => l.includes('error TS'));

// Group by error code
const byCode = {};
for (const l of lines) {
  const m = l.match(/error (TS\d+)/);
  if (m) byCode[m[1]] = (byCode[m[1]] || 0) + 1;
}
console.log('--- by error code ---');
for (const [c, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) console.log(n, c);

// Missing modules
const missing = {};
for (const l of lines) {
  const m = l.match(/Cannot find module '([^']+)'/);
  if (m) missing[m[1]] = (missing[m[1]] || 0) + 1;
}
if (Object.keys(missing).length) {
  console.log('--- missing modules ---');
  for (const [m, c] of Object.entries(missing).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(c, m);
}
