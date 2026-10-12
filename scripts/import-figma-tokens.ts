import { readFile, writeFile } from 'node:fs/promises';
import { importFigmaExport } from '../lib/figma-tokens';
import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXPORT = 'tokens/figma/spartan-ds.export.json';
const OUT = 'tokens/figma/import-candidate.json';

// One collection or token per line keeps diffs reviewable.
export function stringifySource(s: ReturnType<typeof importFigmaExport>) {
  const { collections, tokens, ...head } = s;
  const lines = (items: unknown[]) => items.map(i => '    ' + JSON.stringify(i)).join(',\n');
  return `{\n  "schema": ${JSON.stringify(head.schema)},\n  "version": ${JSON.stringify(head.version)},\n${head.source ? '  "source": ' + JSON.stringify(head.source) + ',\n' : ''}  "collections": [\n${lines(collections)}\n  ],\n  "tokens": [\n${lines(tokens)}\n  ]\n}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  let input = EXPORT, output = OUT;
  if (args[0] && !args[0].startsWith('--')) input = args.shift()!;
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--out' || !args[1] || args[1].startsWith('--')) throw new Error('Usage: pnpm tokens:import [export.json] [--out candidate.json]');
    output = args[1];
  }
  if (resolve(output) === resolve('tokens/source.json')) throw new Error('Refusing to overwrite the Git-authored tokens/source.json. Import to a separate candidate and review the diff.');
  const source = importFigmaExport(JSON.parse(await readFile(input, 'utf8')));
  await writeFile(output, stringifySource(source), { flag: 'wx' });
  console.log(`Wrote review candidate ${output} (${source.tokens.length} tokens). Authored tokens/source.json was not changed. Review and merge intended changes manually.`);
}
