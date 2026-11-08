// One-time: remove unused schema imports and underscore unused `req` params in
// server/functions/*/index.ts (TS6133 noUnusedLocals/noUnusedParameters).
import fs from 'fs';
import path from 'path';

const functionsDir = path.resolve('server/functions');
let fixed = 0;
for (const dir of fs.readdirSync(functionsDir)) {
  const file = path.join(functionsDir, dir, 'index.ts');
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  // remove unused schema import (schema imported but never referenced elsewhere)
  const schemaName = `${dir}Schema`;
  const uses = src.split(new RegExp(`\\b${schemaName}\\b`)).length - 1;
  if (uses === 1) {
    // only the import mentions it
    src = src.replace(new RegExp(`^import \\{ ${schemaName} \\} from "\./schema";\r?\n`, 'm'), '');
  }
  // underscore unused `req: Request` in exported express handlers
  src = src.replace(/(export const \w+ = async) \(req: Request, res: Response\)/g, '$1 (_req: Request, res: Response)');
  if (src !== before) {
    fs.writeFileSync(file, src);
    fixed++;
    console.log('fixed', file);
  }
}
console.log('files fixed:', fixed);
