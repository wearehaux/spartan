// An explicit read-only comparison; drift never imports into authored definitions.
import { readFile } from 'node:fs/promises';
import { importFigmaExport, validateTokensV2 } from '../lib/figma-tokens';
import { diffTokenSources } from '../lib/token-drift';

if (process.argv.length > 3) throw new Error('Usage: pnpm tokens:drift [export.json]');
const path = process.argv[2] ?? 'tokens/figma/spartan-ds.export.json';
const authored = validateTokensV2(JSON.parse(await readFile('tokens/source.json', 'utf8')));
const evidence = importFigmaExport(JSON.parse(await readFile(path, 'utf8')));
const drift = diffTokenSources(authored, evidence);
let count = 0;
for (const [kind, items] of Object.entries(drift)) for (const item of items) {
  console.log(`Figma drift (${kind}): ${item}`); count++;
}
if (count) {
  console.log(`${count} differences against ${path}. Review authored intent and Figma evidence; no files were changed.`);
  process.exitCode = 1;
} else console.log(`No token drift against ${path} (${authored.tokens.length} tokens). No files were changed.`);
