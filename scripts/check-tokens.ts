// Validate Git-authored definitions and their generated CSS, without reading Figma.
import { readFile } from 'node:fs/promises';
import { renderCSSV2 } from '../lib/figma-tokens';
import { validateTokenOwnership } from '../lib/token-ownership';

const read = async (p: string) => readFile(p, 'utf8');
if (process.argv.length > 2) throw new Error('tokens:check accepts no export path. Use pnpm tokens:drift <export.json> for Figma comparison.');
const source = validateTokenOwnership(JSON.parse(await read('tokens/source.json')));
const problems: string[] = [];

if ((await read('public/tokens.css')) !== renderCSSV2(source)) problems.push('public/tokens.css is stale. Run pnpm tokens:build.');

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Authored tokens are valid and CSS is current (${source.tokens.length} tokens, version ${source.version}).`);
