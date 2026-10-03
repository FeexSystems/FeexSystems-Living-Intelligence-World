import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spec } from '../server/lib/docs/swagger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.join(__dirname, '../docs/api');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const outputPath = path.join(docsDir, 'openapi.json');

try {
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(`✅ OpenAPI specification exported to ${outputPath}`);
} catch (error) {
  console.error('❌ Failed to export OpenAPI specification:', error);
  process.exit(1);
}
