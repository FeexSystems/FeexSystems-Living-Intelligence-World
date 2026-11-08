// One-time: generate stub files for barrel re-exports that point at missing modules.
// Reads tc.txt (tsc output) and creates an empty typed placeholder for each missing
// ./relative module referenced from a server/modules/**/index.ts barrel.
import fs from 'fs';
import path from 'path';

const lines = fs.readFileSync('tc.txt', 'utf8')
  .split(/\r?\n/)
  .filter(l => l.includes('server/modules') && l.includes('TS2307'));

const created = new Set();
for (const line of lines) {
  const m = line.match(/^(server\/modules\/.+?\.ts)\(\d+,\d+\): error TS2307: Cannot find module '(\.\/[^']+)'/);
  if (!m) continue;
  const [, barrel, rel] = m;
  const target = path.join(path.dirname(barrel), rel + '.ts');
  const abs = path.resolve(target);
  if (created.has(abs) || fs.existsSync(abs)) continue;
  const name = path.basename(rel);
  fs.writeFileSync(abs, `/**\n * TODO: implement the ${name} unit for this module layer.\n * Placeholder created to satisfy the barrel re-export; add domain types,\n * use-case functions, repository adapters, or presenters here.\n */\nexport {};\n`);
  created.add(abs);
  console.log('created', target);
}
console.log('total created:', created.size);
