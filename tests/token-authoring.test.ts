import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { renderCSSV2, resolveToken, validateTokensV2, type TokenSourceV2 } from '../lib/figma-tokens';
import { diffTokenSources } from '../lib/token-drift';

const repo = resolve('.');
const production = () => JSON.parse(readFileSync('tokens/source.json', 'utf8')) as TokenSourceV2;
const authored = () => ({
  schema: 'spartan.tokens.v2', version: 'code-1',
  collections: [
    { key: 'layout', name: 'Layout', cssPrefix: 'layout', modes: [{ name: 'Relaxed' }, { name: 'Compact' }] },
    { key: 'control', name: 'Control', cssPrefix: '', modes: [{ name: 'Default' }] },
  ],
  tokens: [
    { key: 'layout.height', name: 'height', collection: 'layout', type: 'FLOAT', unit: 'px', values: { Relaxed: 40, Compact: 32 } },
    { key: 'control.height', name: 'height', collection: 'control', type: 'FLOAT', unit: 'px', values: { Default: { alias: 'layout.height' } } },
  ],
});

test('code-only collections, modes and cross-collection aliases generate without Figma metadata', () => {
  const s = validateTokensV2(authored());
  assert.equal(resolveToken(s, 'control.height', { layout: 'Compact' }), 32);
  const css = renderCSSV2(s);
  assert.match(css, /--sp-height: var\(--sp-layout-height\)/);
  assert.match(css, /data-sp-mode-layout="Compact"/);
  assert.match(css, /32px/);
});

test('authored inputs reject invalid names, bindings, values and alias graphs', () => {
  const invalid = (edit: (s: any) => void, message: RegExp) => {
    const s = authored(); edit(s); assert.throws(() => validateTokensV2(s), message);
  };
  invalid(s => { s.collections[0].cssPrefix = 'bad; prefix'; }, /prefix/i);
  invalid(s => { s.tokens[0].key = 'elsewhere.height'; }, /collection.*key|key.*collection/i);
  invalid(s => { s.tokens[0].figma = { id: '', key: 'known' }; }, /Figma/i);
  invalid(s => { s.tokens.forEach((t: any) => { t.figma = { id: 'same', key: 'same' }; }); }, /Duplicate Figma/i);
  invalid(s => { s.collections[0].modes[1].figmaId = ''; }, /Figma/i);
  invalid(s => { s.tokens[0].values.Compact = Infinity; }, /FLOAT/);
  invalid(s => { s.tokens[0].type = 'COLOR'; delete s.tokens[0].unit; s.tokens[0].values = { Relaxed: { alpha: { color: { r: 2, g: 0, b: 0, a: 1 }, opacity: 20 } }, Compact: { r: 0, g: 0, b: 0, a: 1 } }; }, /alpha color/i);
  invalid(s => { s.tokens[1].values.Default.alias = 'missing'; }, /alias/i);
  invalid(s => { s.tokens[1].unit = 'percent'; }, /unit mismatch/);
  invalid(s => { s.tokens[0].values.Relaxed = { alias: 'control.height' }; }, /cycle/i);
  invalid(s => { delete s.tokens[0].values.Compact; }, /modes/);
});

test('distinct authored mode names cannot collapse onto the same CSS toggle', () => {
  const s = authored();
  s.collections[0].modes = [{ name: 'Small Screen' }, { name: 'Small-Screen' }];
  s.tokens[0].values = { 'Small Screen': 40, 'Small-Screen': 32 } as any;
  assert.throws(() => renderCSSV2(s), /mode.*CSS|CSS.*mode/i);
});

test('different authored axes cannot generate a shared CSS toggle name', () => {
  const s = {
    schema: 'spartan.tokens.v2', version: 'code-1',
    collections: [
      { key: 'size', name: 'Size', cssPrefix: 'size', modes: [{ name: 'Large Screen' }, { name: 'Small' }] },
      { key: 'size-large', name: 'Large Size', cssPrefix: 'large', modes: [{ name: 'Other' }, { name: 'Screen' }] },
    ],
    tokens: [
      { key: 'size.width', name: 'width', collection: 'size', type: 'FLOAT', unit: 'px', values: { 'Large Screen': 100, Small: 50 } },
      { key: 'size-large.width', name: 'width', collection: 'size-large', type: 'FLOAT', unit: 'px', values: { Other: 20, Screen: 30 } },
    ],
  };
  assert.throws(() => renderCSSV2(s), /CSS.*toggle|toggle.*CSS/i);
});

test('drift reserves known identities so a replacement token at the old key is reported as an addition', () => {
  const evidence = validateTokensV2({
    schema: 'spartan.tokens.v2', version: 'evidence',
    collections: [{ key: 'control', name: 'Control', cssPrefix: '', modes: [{ name: 'Default' }] }],
    tokens: [{ key: 'control.old', name: 'old', collection: 'control', type: 'FLOAT', unit: 'px', figma: { id: 'known-id', key: 'known-key' }, values: { Default: 20 } }],
  });
  const renamed = { ...evidence.tokens[0], key: 'control.renamed', name: 'renamed' };
  const replacement = { ...evidence.tokens[0], figma: undefined, values: { Default: 30 } };
  for (const tokens of [[replacement, renamed], [renamed, replacement]]) {
    const drift = diffTokenSources({ ...evidence, version: 'authored', tokens }, evidence);
    assert.equal(drift.added.length, 1);
    assert.match(drift.added[0], /control\.old/);
    assert.equal(drift.renamed.length, 1);
    assert.deepEqual(drift.identities, []);
    assert.deepEqual(drift.changed, []);
  }
});

function workspace(run: (dir: string) => void) {
  const dir = mkdtempSync(resolve(tmpdir(), 'spartan-authoring-'));
  try {
    for (const name of ['scripts', 'lib']) cpSync(resolve(repo, name), resolve(dir, name), { recursive: true });
    symlinkSync(resolve(repo, 'node_modules'), resolve(dir, 'node_modules'), 'dir');
    mkdirSync(resolve(dir, 'tokens/figma'), { recursive: true });
    mkdirSync(resolve(dir, 'public'));
    writeFileSync(resolve(dir, 'package.json'), readFileSync('package.json'));
    writeFileSync(resolve(dir, 'pnpm-workspace.yaml'), 'packages: ["."]\nverifyDepsBeforeRun: false\n');
    writeFileSync(resolve(dir, 'tokens/source.json'), readFileSync('tokens/source.json'));
    writeFileSync(resolve(dir, 'tokens/figma/spartan-ds.export.json'), readFileSync('tokens/figma/spartan-ds.export.json'));
    run(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const node = (dir: string, script: string, args: string[] = []) => spawnSync(process.execPath, ['--import', 'tsx', resolve(dir, 'scripts', script), ...args], { cwd: dir, encoding: 'utf8' });
const success = (result: ReturnType<typeof node>) => assert.equal(result.status, 0, result.stdout + result.stderr);

test('real token commands preserve a deliberate edit and unbound token through two builds without a Figma snapshot', () => workspace(dir => {
  const s = production();
  const edited = s.tokens.find(t => t.key === 'primitives.space.4')!;
  for (const mode of Object.keys(edited.values)) edited.values[mode] = 17;
  s.tokens.push({ key: 'component.authored.height', name: 'authored/height', collection: 'component', type: 'FLOAT', unit: 'px', values: { Value: { alias: 'density.density.control.height.base' } } } as TokenSourceV2['tokens'][number]);
  const mode = s.collections.find(c => c.key === 'component')!.modes[0].name;
  s.tokens.at(-1)!.values = { [mode]: { alias: 'component.button.height.base' } };
  const original = JSON.stringify(s);
  writeFileSync(resolve(dir, 'tokens/source.json'), original);
  rmSync(resolve(dir, 'tokens/figma/spartan-ds.export.json'));
  let first = '';
  for (let i = 0; i < 2; i++) {
    execFileSync('pnpm', ['tokens:build'], { cwd: dir, stdio: 'pipe' });
    assert.equal(readFileSync(resolve(dir, 'tokens/source.json'), 'utf8'), original);
    const css = readFileSync(resolve(dir, 'public/tokens.css'), 'utf8');
    assert.match(css, /--sp-prim-space-4: 17px/);
    assert.match(css, /--sp-authored-height: var\(--sp-button-height-base\)/);
    if (i) assert.equal(css, first); else first = css;
    success(node(dir, 'check-tokens.ts'));
  }
}));

test('Figma import produces a separate review candidate and refuses overwriting source or an existing candidate', () => workspace(dir => {
  const before = readFileSync(resolve(dir, 'tokens/source.json'), 'utf8');
  success(node(dir, 'import-figma-tokens.ts'));
  const candidate = resolve(dir, 'tokens/figma/import-candidate.json');
  assert.ok(JSON.parse(readFileSync(candidate, 'utf8')).tokens.length > 0);
  assert.equal(readFileSync(resolve(dir, 'tokens/source.json'), 'utf8'), before);
  assert.notEqual(node(dir, 'import-figma-tokens.ts').status, 0);
  const blocked = node(dir, 'import-figma-tokens.ts', ['--out', 'tokens/source.json']);
  assert.notEqual(blocked.status, 0);
  assert.equal(readFileSync(resolve(dir, 'tokens/source.json'), 'utf8'), before);
}));

test('token checks catch stale CSS without treating intended authoring differences as Figma drift', () => workspace(dir => {
  success(node(dir, 'build-tokens.ts'));
  writeFileSync(resolve(dir, 'public/tokens.css'), 'stale');
  const result = node(dir, 'check-tokens.ts');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tokens:build/);
}));

test('explicit drift reports authored changes without mutating authored source, snapshot or CSS', () => workspace(dir => {
  success(node(dir, 'build-tokens.ts'));
  success(node(dir, 'check-figma-drift.ts'));
  const s = production();
  s.tokens.find(t => t.key === 'primitives.space.4')!.values.Value = 17;
  writeFileSync(resolve(dir, 'tokens/source.json'), JSON.stringify(s));
  const paths = ['tokens/source.json', 'tokens/figma/spartan-ds.export.json', 'public/tokens.css'];
  const before = paths.map(p => readFileSync(resolve(dir, p), 'utf8'));
  const drift = node(dir, 'check-figma-drift.ts');
  assert.equal(drift.status, 1, drift.stderr);
  assert.match(drift.stdout + drift.stderr, /space\.4/);
  assert.deepEqual(paths.map(p => readFileSync(resolve(dir, p), 'utf8')), before);
}));
