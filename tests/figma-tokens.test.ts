import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assignmentFromAttributes, diffExports, hasDrift, importFigmaExport, modeDependencies, renderCSSV2, resolveToken, resolvedCss, validateTokensV2, type FigmaExport, type Rgba, type TokenSourceV2 } from '../lib/figma-tokens';

const snapshot = (): FigmaExport => JSON.parse(readFileSync('tokens/figma/spartan-ds.export.json', 'utf8'));
const production = (): TokenSourceV2 => JSON.parse(readFileSync('tokens/source.json', 'utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

test('the Figma snapshot holds the seven collections, modes, and variable counts in Spartan DS', () => {
  const ex = snapshot();
  assert.deepEqual(ex.collections.map(c => [c.name, c.variables.length]).sort(), [['01 Primitives', 183], ['02 Primary', 13], ['03 Semantic Color', 84], ['04 Semantic Foundation', 58], ['05 Component', 66], ['06 Density', 62], ['07 Style', 81]]);
  const modes = Object.fromEntries(ex.collections.map(c => [c.name, c.modes.map(m => m.name)]));
  assert.deepEqual(modes['02 Primary'], ['Blue', 'Purple', 'Orange', 'Sky']);
  assert.deepEqual(modes['03 Semantic Color'], ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast']);
  assert.deepEqual(modes['06 Density'], ['Relaxed', 'Compact']);
  assert.deepEqual(modes['07 Style'], ['Atlas', 'Selene', 'Helios', 'Ares']);
  const style = ex.collections.find(c => c.name === '07 Style')!;
  assert.equal(style.id, '848:16');
  assert.deepEqual(style.modes.map(m => m.id), ['848:0', '848:1', '848:2', '848:3']);
  const ids = ex.collections.flatMap(c => c.variables.map(v => v.id));
  assert.equal(new Set(ids).size, 547);
  assert.equal(new Set(ex.collections.flatMap(c => c.variables.map(v => v.key))).size, 547);
});

test('committed CSS is generated from the Git-authored source', () => {
  assert.equal(readFileSync('public/tokens.css', 'utf8'), renderCSSV2(production()));
});

test('cross-collection alias chains resolve to the values read from Figma in both density modes', () => {
  const s = production();
  const px = (key: string, density: string) => resolveToken(s, key, { density });
  // Component -> Density -> Primitives, in 06 Density's Relaxed and Compact modes.
  assert.deepEqual([px('component.button.height.base', 'Relaxed'), px('component.button.height.base', 'Compact')], [40, 32]);
  assert.deepEqual([px('component.button.height.sm', 'Relaxed'), px('component.button.height.sm', 'Compact')], [32, 28]);
  assert.deepEqual([px('component.button.height.xs', 'Relaxed'), px('component.button.height.xs', 'Compact')], [24, 24]);
  assert.deepEqual([px('component.button.height.lg', 'Relaxed'), px('component.button.height.lg', 'Compact')], [40, 32]);
  assert.deepEqual([px('component.button.outer-padding-x.base', 'Relaxed'), px('component.button.outer-padding-x.base', 'Compact')], [10, 6]);
  assert.deepEqual([px('component.button.outer-padding-x.sm', 'Relaxed'), px('component.button.outer-padding-x.sm', 'Compact')], [8, 6]);
  assert.deepEqual([px('component.button.label-padding-x.base', 'Relaxed'), px('component.button.label-padding-x.base', 'Compact')], [6, 6]);
  assert.deepEqual([px('component.button.label-padding-x.sm', 'Relaxed'), px('component.button.label-padding-x.sm', 'Compact')], [4, 4]);
  assert.deepEqual([px('density.density.control.icon-size.base', 'Relaxed'), px('density.density.control.icon-size.base', 'Compact')], [20, 18]);
  assert.equal(px('semantic-foundation.radius.control', 'Relaxed'), 8);
  assert.equal(px('semantic-foundation.radius.pill', 'Compact'), 9999);
  // Semantic Foundation reaches into Semantic Color (contrast modes) and back out to Primitives.
  assert.deepEqual(['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'].map(m => resolveToken(s, 'semantic-foundation.border-width.default', { 'semantic-color': m })), [1, 1, 2, 2]);
});

test('semantic colors resolve through every Semantic Color mode and Primary hue', () => {
  const s = production();
  const at = (mode: string, hue: string) => resolveToken(s, 'semantic-color.color.primary.default', { 'semantic-color': mode, primary: hue }) as Rgba;
  assert.deepEqual(at('Light', 'Blue'), { r: 0, g: 0.427451, b: 0.807843, a: 1 });
  assert.deepEqual(at('Light', 'Purple'), { r: 0.537255, g: 0.2, b: 0.894118, a: 1 });
  assert.deepEqual(at('Dark', 'Orange'), { r: 0.678431, g: 0.313726, b: 0, a: 1 });
  assert.deepEqual(at('Light High Contrast', 'Sky'), { r: 0, g: 0.254902, b: 0.329412, a: 1 });
  assert.deepEqual(at('Dark High Contrast', 'Sky'), { r: 0.486275, g: 0.85098, b: 0.988235, a: 1 });
  // Alpha-bound colors keep the aliased color and the percent opacity.
  const subtle = resolveToken(s, 'semantic-color.color.danger.subtle.default', { 'semantic-color': 'Dark' });
  assert.deepEqual(subtle, { alpha: { color: { r: 1, g: 0.494118, b: 0.466667, a: 1 }, opacity: 20 } });
});

test('mode dependencies are detected per token, including aliases that cross collections', () => {
  const deps = modeDependencies(production());
  assert.deepEqual(deps.get('component.button.height.base'), ['density']);
  assert.deepEqual(deps.get('component.badge.padding-x'), []);
  assert.deepEqual(deps.get('primitives.space.4'), []);
  assert.deepEqual(deps.get('semantic-color.color.primary.default'), ['primary', 'semantic-color']);
  assert.deepEqual(deps.get('semantic-color.color.surface.default'), ['semantic-color']);
  assert.deepEqual(deps.get('semantic-foundation.border-width.default'), ['semantic-color']);
  // Style, Semantic Color, and Primary can all matter to one token.
  assert.deepEqual(deps.get('style.style.field.border.hover'), ['primary', 'semantic-color', 'style']);
  assert.deepEqual(deps.get('style.style.button.radius'), ['style']);
  assert.deepEqual(deps.get('style.style.button.secondary.border.default'), ['semantic-color', 'style']);
  assert.equal(Math.max(...[...deps.values()].map(d => d.length)), 3);
});

// ---- A small cascade simulator, independent of the generator ----

type Rule = { selectors: string[][]; order: number; decls: Map<string, string> };
function parseCSS(css: string): Rule[] {
  const rules: Rule[] = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null, order = 0;
  while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, '')))) {
    const selectors = m[1].split(',').map(x => x.trim()).filter(Boolean).map(sel => sel === ':root' ? [':root'] : [...sel.matchAll(/\[(data-sp-mode-[a-z-]+)="([^"]+)"\]/g)].map(a => `${a[1]}=${a[2]}`));
    const decls = new Map([...m[2].matchAll(/(--[a-z0-9_-]+):\s*([^;]*);/g)].map(d => [d[1], d[2].trim()] as const));
    rules.push({ selectors, order: order++, decls });
  }
  return rules;
}
const INVALID = Symbol('guaranteed-invalid');
// var() substitution as a browser does it: an empty value is valid and wins over the fallback,
// while a guaranteed-invalid value (initial, or never declared) uses the fallback.
function substitute(text: string, lookup: (name: string) => string | typeof INVALID): string | typeof INVALID {
  let out = '', i = 0;
  for (;;) {
    const at = text.indexOf('var(', i);
    if (at < 0) return out + text.slice(i);
    out += text.slice(i, at);
    let depth = 1, j = at + 4, comma = -1;
    for (; j < text.length && depth; j++) {
      if (text[j] === '(') depth++;
      else if (text[j] === ')') depth--;
      else if (text[j] === ',' && depth === 1 && comma < 0) comma = j - (at + 4);
    }
    const inner = text.slice(at + 4, j - 1);
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    let value = lookup(name);
    if (value === INVALID) {
      if (comma < 0) return INVALID;
      const fallback = substitute(inner.slice(comma + 1), lookup);
      if (fallback === INVALID) return INVALID;
      value = fallback;
    }
    out += value;
    i = j;
  }
}
// Computes custom properties down a chain of elements; each element's attrs are
// { attribute key: value } without the data-sp-mode- prefix. var() resolves at the element that
// declares it, and an element's computed values are inherited by the next one.
function computeChain(rules: Rule[], chain: Record<string, string>[]) {
  let inherited = new Map<string, string | typeof INVALID>();
  for (let depth = 0; depth < chain.length; depth++) {
    const attrs = new Set(Object.entries(chain[depth]).map(([k, v]) => `data-sp-mode-${k}=${v}`));
    const winners = new Map<string, { spec: number; order: number; value: string }>();
    for (const r of rules) for (const sel of r.selectors) {
      const hit = sel[0] === ':root' ? depth === 0 : sel.every(a => attrs.has(a));
      if (!hit) continue;
      const spec = sel[0] === ':root' ? 1 : sel.length;
      for (const [name, value] of r.decls) {
        const cur = winners.get(name);
        if (!cur || spec > cur.spec || (spec === cur.spec && r.order > cur.order)) winners.set(name, { spec, order: r.order, value });
      }
    }
    const memo = new Map<string, string | typeof INVALID>();
    const resolving: string[] = [];
    const lookup = (name: string): string | typeof INVALID => {
      const w = winners.get(name);
      if (!w) return inherited.get(name) ?? INVALID;
      if (memo.has(name)) return memo.get(name)!;
      if (resolving.includes(name)) throw new Error('cycle ' + resolving.join('>'));
      resolving.push(name);
      const value = w.value === 'initial' ? INVALID : substitute(w.value, lookup);
      resolving.pop();
      memo.set(name, value);
      return value;
    };
    const next = new Map(inherited);
    for (const name of winners.keys()) {
      const v = lookup(name);
      next.set(name, v === INVALID ? v : v.replace(/\s+/g, ' ').trim());
    }
    inherited = next;
  }
  return inherited;
}
// Expected value of a token for attribute settings, through the code-boundary translation.
const lit = (s: TokenSourceV2, key: string, attrs: Record<string, string>) => resolvedCss(s, key, assignmentFromAttributes(s, attrs));
const cssVar = (s: TokenSourceV2, key: string) => {
  const t = s.tokens.find(x => x.key === key)!, c = s.collections.find(x => x.key === t.collection)!;
  return '--sp-' + (c.cssPrefix ? c.cssPrefix + '-' : '') + key.split('.').slice(1).join('-');
};
const axisValues = (s: TokenSourceV2, collection: string, axis?: string) => {
  const c = s.collections.find(x => x.key === collection)!;
  return axis ? c.axes!.find(a => a.key === axis)!.values : c.modes.map(m => m.name);
};
// Every style, hue, color scheme, contrast, and density setting: 4 x 4 x 2 x 2 x 2 = 128.
function combos(s: TokenSourceV2) {
  const out: Record<string, string>[] = [];
  for (const style of axisValues(s, 'style')) for (const primary of axisValues(s, 'primary')) for (const scheme of axisValues(s, 'semantic-color', 'color-scheme')) for (const contrast of axisValues(s, 'semantic-color', 'contrast')) for (const density of axisValues(s, 'density')) out.push({ style, primary, 'color-scheme': scheme, contrast, density });
  return out;
}
const everyToken = (s: TokenSourceV2, got: Map<string, string | typeof INVALID>, attrs: Record<string, string>, label: string) => {
  const wrong = s.tokens.filter(t => got.get(cssVar(s, t.key)) !== lit(s, t.key, attrs)).map(t => t.key);
  assert.deepEqual(wrong.slice(0, 5), [], `${label}: ${wrong.length} tokens differ from ${JSON.stringify(attrs)}`);
};

test('generated CSS resolves every token to the Figma-resolved value for all 128 style, hue, color scheme, contrast, and density combinations on one element', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  const all = combos(s);
  assert.equal(all.length, 128);
  for (const attrs of all) everyToken(s, computeChain(rules, [attrs]), attrs, 'one element');
});

test('an element with no attributes is Atlas, Blue, Light, normal contrast, Relaxed', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  everyToken(s, computeChain(rules, [{}]), { style: 'Atlas', primary: 'Blue', 'color-scheme': 'Light', contrast: 'Normal', density: 'Relaxed' }, 'defaults');
});

test('every axis is independent: any single-attribute change on a nested element keeps the other four settings', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  const outer = { style: 'Selene', primary: 'Orange', 'color-scheme': 'Dark', contrast: 'High', density: 'Compact' };
  const other: Record<string, string> = { style: 'Ares', primary: 'Sky', 'color-scheme': 'Light', contrast: 'Normal', density: 'Relaxed' };
  for (const key of Object.keys(outer)) {
    everyToken(s, computeChain(rules, [outer, { [key]: other[key] }]), { ...outer, [key]: other[key] }, `nested ${key}`);
    everyToken(s, computeChain(rules, [outer, { x: 'y' }, { [key]: other[key] }]), { ...outer, [key]: other[key] }, `two levels down, ${key}`);
  }
});

test('high contrast turns on and off again over any scheme and style without touching them', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  for (const style of axisValues(s, 'style')) for (const scheme of ['Light', 'Dark']) {
    const base = { style, primary: 'Purple', 'color-scheme': scheme, density: 'Relaxed' };
    const on = computeChain(rules, [{ ...base, contrast: 'High' }]);
    const off = computeChain(rules, [{ ...base, contrast: 'High' }, { contrast: 'Normal' }]);
    everyToken(s, on, { ...base, contrast: 'High' }, 'on');
    everyToken(s, off, { ...base, contrast: 'Normal' }, 'switched off again');
    // High contrast changes the semantic modes: Light High Contrast and Dark High Contrast.
    assert.deepEqual(assignmentFromAttributes(s, { 'color-scheme': scheme, contrast: 'High' }), { 'semantic-color': `${scheme} High Contrast` });
  }
});

test('a nested density override re-resolves component tokens in its subtree', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  const outer = { primary: 'Blue', 'color-scheme': 'Dark', density: 'Relaxed' };
  const got = computeChain(rules, [outer, { density: 'Compact' }]);
  assert.equal(got.get('--sp-button-height-base'), '32px');
  assert.equal(got.get('--sp-button-outer-padding-x-base'), '6px');
  everyToken(s, got, { ...outer, density: 'Compact' }, 'nested density');
});

test('nested color scheme overrides re-resolve semantic tokens and keep contrast, style, hue, and density', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  const outer = { style: 'Helios', primary: 'Blue', 'color-scheme': 'Light', contrast: 'High', density: 'Compact' };
  everyToken(s, computeChain(rules, [outer, { 'color-scheme': 'Dark' }]), { ...outer, 'color-scheme': 'Dark' }, 'Dark inside Light high contrast');
});

test('CSS generation is deterministic, uses inherited toggles, and declares each token once', () => {
  const s = production(), css = renderCSSV2(s);
  assert.equal(css, renderCSSV2(clone(s)));
  // Defaults on :root, then each attribute value sets only its own axis' toggles.
  assert.match(css, /:root \{[^}]*--_sp-not-style-atlas: initial;[^}]*--_sp-not-style-selene: ;/);
  assert.match(css, /\[data-sp-mode-contrast="High"\] \{\s*--_sp-not-contrast-normal: ;\s*--_sp-not-contrast-high: initial;\s*\}/);
  assert.match(css, /--sp-density-control-height-base: var\(--_sp-not-density-relaxed, 40px\) var\(--_sp-not-density-compact, 32px\);/);
  assert.match(css, /--sp-button-height-base: var\(--sp-density-control-height-base\);/);
  assert.match(css, /--sp-prim-opacity-50: 50%;/);
  // No selector combines attributes, and no legacy combined attribute exists.
  assert.doesNotMatch(css, /\]\[data-sp-mode-/);
  assert.doesNotMatch(css, /data-sp-mode-semantic-color/);
  const declared = [...css.matchAll(/^  (--sp-[a-z0-9-]+):/gm)].map(m => m[1]);
  assert.equal(declared.length, s.tokens.length);
  assert.equal(new Set(declared).size, declared.length);
});

// ---- Failures must be explicit ----

const failing = (mutate: (ex: FigmaExport) => void, pattern: RegExp) => {
  const ex = clone(snapshot());
  mutate(ex);
  assert.throws(() => importFigmaExport(ex), pattern);
};
const variable = (ex: FigmaExport, name: string) => ex.collections.flatMap(c => c.variables).find(v => v.name === name)!;

test('import fails on unresolved aliases', () => failing(ex => { variable(ex, 'button/height/sm').values = [{ a: '999:999' }]; }, /Unresolved alias in component\.button\.height\.sm\/Value/));
test('import fails on alias type mismatches', () => failing(ex => { variable(ex, 'button/height/sm').values = [{ a: '6:72' }]; }, /type mismatch/));
test('import fails on alias cycles', () => failing(ex => { variable(ex, 'button/height/base').values = [{ a: '10:7' }]; }, /cycle/));
test('import fails on unmapped collections', () => failing(ex => { ex.collections[0].name = '07 Mystery'; }, /Unmapped Figma collection "07 Mystery"/));
test('import fails on unsupported value shapes', () => failing(ex => { variable(ex, 'badge/gap').values = [{ nope: 1 } as never]; }, /Unsupported value shape at component\.badge\.gap\/Value/));
test('import fails on non-finite numbers', () => failing(ex => { variable(ex, 'badge/gap').values = [Infinity]; }, /Non-finite/));
test('import fails when a variable lacks a value for a mode', () => failing(ex => { variable(ex, 'density/control/gap').values = [8]; }, /1 values for 2 modes/));
test('import fails on FLOAT families without a unit rule', () => failing(ex => { variable(ex, 'badge/gap').name = 'mystery/gap'; }, /No unit rule for FLOAT token "mystery\/gap"/));
test('import fails on CSS name collisions', () => failing(ex => { variable(ex, 'badge/padding-y').name = 'badge/padding-x'; }, /collision|Token keys must be unique/));
test('import fails when an alpha opacity does not reference a percent token', () => failing(ex => {
  const v = variable(ex, 'color/danger/subtle/default');
  v.values[0] = { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:5:9' }, opacity: { type: 'VARIABLE_ALIAS', id: 'VariableID:53:5' } };
}, /must reference a percent token/));
test('import fails on colors outside 0 to 1', () => failing(ex => { variable(ex, 'dialog/backdrop/default').values = [[2, 0, 0, 1]]; }, /Invalid color/));

test('validation rejects hand-edited source files with the same explicit errors', () => {
  const edit = (f: (s: TokenSourceV2) => void) => { const s = clone(production()); f(s); return () => validateTokensV2(s); };
  const token = (s: TokenSourceV2, key: string) => s.tokens.find(t => t.key === key)!;
  assert.throws(edit(s => { token(s, 'component.button.height.sm').values.Value = { alias: 'density.missing' }; }), /Unresolved alias/);
  assert.throws(edit(s => { delete token(s, 'density.density.control.gap').values.Compact; }), /cover exactly the modes/);
  assert.throws(edit(s => { token(s, 'component.badge.gap').unit = 'percent'; token(s, 'component.badge.padding-x').values.Value = { alias: 'component.badge.gap' }; }), /unit mismatch/);
  assert.throws(edit(s => { s.schema = 'spartan.tokens.v1' as never; }), /spartan\.tokens\.v2/);
});

test('drift diff reports added, removed, renamed, changed variables and mode changes', () => {
  const next = clone(snapshot());
  assert.equal(hasDrift(diffExports(snapshot(), next)), false);
  const density = next.collections.find(c => c.name === '06 Density')!;
  density.variables.find(v => v.name === 'density/control/height/base')!.values = [44, 32];
  density.variables.find(v => v.name === 'density/control/gap')!.name = 'density/control/spacing';
  density.variables.pop();
  density.modes.push({ id: '53:9', name: 'Spacious' });
  next.collections.find(c => c.name === '05 Component')!.variables.push({ id: '10:999', key: 'k', name: 'chip/height', type: 'FLOAT', values: [28] });
  const d = diffExports(snapshot(), next);
  assert.equal(d.changed.length, 1);
  assert.match(d.changed[0], /density\/control\/height\/base: \[40,32\] -> \[44,32\]/);
  assert.deepEqual(d.renamed, ['06 Density / density/control/gap -> density/control/spacing']);
  assert.deepEqual(d.added, ['05 Component / chip/height']);
  assert.equal(d.removed.length, 1);
  assert.match(d.modes[0], /modes changed in 06 Density/);
});

test('assembling saved Figma outputs verifies every line against its hash', async () => {
  const { assemble, fnv } = await import('../scripts/assemble-figma-export');
  const head = JSON.stringify({ collection: { id: '1:1', key: 'k', name: '05 Component', modes: [{ id: '1:2', name: 'Value' }] } });
  const row = (n: number) => JSON.stringify({ id: `1:${n}`, key: `k${n}`, name: `badge/gap${n}`, type: 'FLOAT', values: [n] });
  const out = (lines: string[], total?: number) => (total ? `total=${total}\n` : '') + lines.join('\n') + '\n#HASHES ' + lines.map(fnv).join(',');
  const info = { key: 'F', name: 'Spartan DS' };
  const result = assemble([{ name: 'a.txt', text: out([head, row(3)], 2) }, { name: 'b.txt', text: out([row(4)], 2) }], info, '2026-01-01');
  assert.deepEqual(result.collections[0].variables.map(v => v.id), ['1:3', '1:4']);
  const corrupt = out([head, row(3)], 2).replace('"badge/gap3"', '"badge/gap9"');
  assert.throws(() => assemble([{ name: 'a.txt', text: corrupt }], info, '2026-01-01'), /does not match its hash/);
  assert.throws(() => assemble([{ name: 'a.txt', text: out([head, row(3)], 2) }], info, '2026-01-01'), /expected 2 variables, assembled 1/);
  assert.throws(() => assemble([{ name: 'a.txt', text: head }], info, '2026-01-01'), /missing #HASHES/);
});

// ---- 07 Style ----

const STYLES = ['Atlas', 'Selene', 'Helios', 'Ares'];
const styleValues = (key: string, extra: Record<string, string> = {}) => STYLES.map(style => resolveToken(production(), key, { style, ...extra }));

test('style radius, border, and side widths match the Figma style specification', () => {
  // Atlas 8 px, Selene 12 px, Helios pill (9999), Ares 0, per the Style modes document.
  assert.deepEqual(styleValues('style.style.button.radius'), [8, 12, 9999, 0]);
  assert.deepEqual(styleValues('style.style.field.radius'), [8, 12, 9999, 0]);
  assert.deepEqual(styleValues('style.style.field.focus-radius'), [12, 16, 9999, 4]);
  assert.deepEqual(styleValues('style.style.surface.radius'), [12, 12, 16, 0]);
  // Ares draws an underline: no side borders. Helios borders are stronger (2 px in normal themes).
  assert.deepEqual(styleValues('style.style.field.side-width', { 'semantic-color': 'Light' }), [1, 1, 2, 0]);
  assert.deepEqual(styleValues('style.style.field.side-width-error', { 'semantic-color': 'Light' }), [2, 2, 2, 0]);
  assert.deepEqual(styleValues('style.style.field.border-width', { 'semantic-color': 'Light' }), [1, 1, 2, 2]);
  assert.deepEqual(styleValues('style.style.button.border-width', { 'semantic-color': 'Light' }), [1, 1, 1, 1]);
});

test('style colors: Selene hides the secondary border until high contrast, Ares strengthens it, Button has no shadows', () => {
  const s = production();
  const border = (style: string, theme: string) => resolveToken(s, 'style.style.button.secondary.border.default', { style, 'semantic-color': theme });
  const rule = (theme: string, name: string) => resolveToken(s, `semantic-color.color.border.${name}`, { 'semantic-color': theme });
  assert.deepEqual(border('Atlas', 'Light'), rule('Light', 'default'));
  assert.deepEqual(border('Selene', 'Light'), { r: 0, g: 0, b: 0, a: 0 });
  assert.deepEqual(border('Selene', 'Dark'), { r: 0, g: 0, b: 0, a: 0 });
  assert.deepEqual(border('Selene', 'Light High Contrast'), rule('Light High Contrast', 'default'));
  assert.deepEqual(border('Helios', 'Light'), rule('Light', 'default'));
  assert.deepEqual(border('Ares', 'Dark'), rule('Dark', 'strong'));
  // Primary, Danger, and Warning keep their solid semantic fills in every style.
  for (const variant of ['primary', 'danger', 'warning']) for (const state of ['default', 'hover', 'pressed']) {
    const fills = styleValues(`style.style.button.${variant}.background.${state}`, { 'semantic-color': 'Dark', primary: 'Purple' });
    assert.ok(fills.every(f => JSON.stringify(f) === JSON.stringify(fills[0])), `${variant}/${state} changes with style`);
  }
  // Button shadows are transparent in all four styles.
  for (const name of ['ambient', 'edge', 'raised']) for (const theme of ['Light', 'Dark']) {
    for (const v of styleValues(`style.style.shadow.control.${name}`, { 'semantic-color': theme })) assert.equal((v as Rgba).a, 0, `${name} shadow`);
  }
  // Only Helios shows the Input shadow.
  const shadow = styleValues('style.style.field.shadow', { 'semantic-color': 'Light' });
  assert.deepEqual(shadow.map(v => (typeof v === 'object' && 'alpha' in v ? 'alpha' : 'none')), ['none', 'none', 'alpha', 'none']);
});

test('the style selector is its own attribute, Atlas is the default, and generated names match Figma code syntax', () => {
  const s = production(), css = renderCSSV2(s);
  assert.deepEqual(s.collections.find(c => c.key === 'style')!.modes.map(m => m.name), STYLES);
  for (const mode of STYLES) assert.match(css, new RegExp(`\\[data-sp-mode-style="${mode}"\\]`));
  assert.match(css, /--sp-style-button-radius: var\(--_sp-not-style-atlas, var\(--sp-radius-control\)\) var\(--_sp-not-style-selene, var\(--sp-prim-radius-lg\)\) var\(--_sp-not-style-helios, var\(--sp-radius-pill\)\)/);
  // The names Figma already gives the 07 Style variables are the names the code generates.
  const named = s.tokens.filter(t => t.figma?.codeSyntax?.startsWith('var(--sp-'));
  assert.equal(named.length, 86, '81 style variables and 5 color/style helpers');
  assert.ok(named.every(t => t.collection === 'style' || t.key.startsWith('semantic-color.color.style.')));
  for (const t of named) assert.equal(`var(${cssVar(s, t.key)})`, t.figma?.codeSyntax, t.key);
});

test('nested style overrides re-resolve style tokens and keep the outer scheme, contrast, hue, and density', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  const outer = { style: 'Atlas', primary: 'Orange', 'color-scheme': 'Dark', contrast: 'High', density: 'Compact' };
  for (const inner of ['Selene', 'Helios', 'Ares']) {
    const got = computeChain(rules, [outer, { style: inner }]);
    everyToken(s, got, { ...outer, style: inner }, `nested ${inner}`);
    assert.equal(got.get('--sp-style-button-radius'), lit(s, 'style.style.button.radius', { style: inner }));
  }
});

test('the style tokens that depend on three collections resolve with their own mode set on an ancestor', () => {
  const s = production(), rules = parseCSS(renderCSSV2(s));
  // style.field.border.hover depends on Style, Semantic Color, and Primary. The style is set far above
  // the element that changes the hue, and the scheme in between, which the earlier design could not do.
  for (const style of STYLES) for (const primary of ['Blue', 'Sky']) for (const scheme of ['Light', 'Dark']) {
    const got = computeChain(rules, [{ style, contrast: 'High' }, { 'color-scheme': scheme }, { primary }]);
    const attrs = { style, contrast: 'High', 'color-scheme': scheme, primary };
    assert.equal(got.get('--sp-style-field-border-hover'), lit(s, 'style.style.field.border.hover', attrs), JSON.stringify(attrs));
  }
});

// ---- Refresh tooling ----

test('the manifest diff finds added, changed, and removed variables without a full export', async () => {
  const { manifestDiff, hasManifestDrift } = await import('../scripts/diff-figma-manifest');
  const { fnv } = await import('../scripts/assemble-figma-export');
  const snap = snapshot();
  const manifest = (ex: FigmaExport) => ex.collections.map(c => {
    const head = fnv(JSON.stringify({ collection: { id: c.id, key: c.key, name: c.name, modes: c.modes } }));
    return `${c.name}|${head}|${c.variables.length}|` + c.variables.map(v => `${v.id}:${fnv(JSON.stringify({ id: v.id, key: v.key, name: v.name, type: v.type, css: v.css, values: v.values }))}`).join(',');
  }).join('\n');
  assert.equal(hasManifestDrift(manifestDiff(snap, manifest(snap))), false);
  const next = clone(snap);
  const density = next.collections.find(c => c.name === '06 Density')!;
  density.variables.find(v => v.name === 'density/control/height/base')!.values = [44, 32];
  density.variables.pop();
  next.collections.find(c => c.name === '05 Component')!.variables.push({ id: '10:999', key: 'k', name: 'chip/height', type: 'FLOAT', values: [28] });
  next.collections.pop();
  const diff = manifestDiff(snap, manifest(next));
  const by = Object.fromEntries(diff.map(d => [d.collection, d]));
  assert.deepEqual(by['06 Density'].changed, ['53:6']);
  assert.equal(by['06 Density'].removed.length, 1);
  assert.deepEqual(by['05 Component'].added, ['10:999']);
  assert.equal(by['07 Style'].removed.length, 81);
  assert.ok(hasManifestDrift(diff));
});

test('a partial refresh merges changed variables into the base snapshot and a full header replaces a collection', async () => {
  const { assemble, fnv } = await import('../scripts/assemble-figma-export');
  const base = snapshot();
  const density = base.collections.find(c => c.name === '06 Density')!;
  const out = (lines: string[], total?: number) => (total ? `total=${total}\n` : '') + lines.join('\n') + '\n#HASHES ' + lines.map(fnv).join(',');
  const row = (id: string, value: number) => JSON.stringify({ id, key: `k${id}`, name: `density/new/${id}`, type: 'FLOAT', values: [value, value] });
  const head = JSON.stringify({ collection: { id: density.id, key: density.key, name: density.name, modes: density.modes, partial: true } });
  const existing = density.variables[0];
  const changed = JSON.stringify({ ...existing, values: [99, 98] });
  const merged = assemble([{ name: 'a.txt', text: out([head, changed, row('53:900', 5)], 2) }], base.file, '2026-02-02', base);
  const after = merged.collections.find(c => c.name === '06 Density')!;
  assert.equal(after.variables.length, density.variables.length + 1);
  assert.deepEqual(after.variables.find(v => v.id === existing.id)!.values, [99, 98]);
  assert.equal(merged.collections.length, base.collections.length, 'untouched collections stay');
  assert.deepEqual(merged.collections.map(c => c.name), base.collections.map(c => c.name), 'base order is kept');
  assert.throws(() => assemble([{ name: 'a.txt', text: out([JSON.stringify({ collection: { id: '999:9', key: 'x', name: 'ghost', modes: [], partial: true } })]) }], base.file, '2026-02-02', base), /not in the base snapshot/);
  const full = JSON.stringify({ collection: { id: density.id, key: density.key, name: density.name, modes: density.modes } });
  const replaced = assemble([{ name: 'a.txt', text: out([full, row('53:901', 7)], 1) }], base.file, '2026-02-02', base);
  assert.equal(replaced.collections.find(c => c.name === '06 Density')!.variables.length, 1);
});

// ---- Color scheme and contrast axes ----

test('the semantic color modes are split into color scheme and contrast axes at the code boundary', () => {
  const s = production();
  const c = s.collections.find(x => x.key === 'semantic-color')!;
  assert.deepEqual(c.modes.map(m => m.name), ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'], 'the Figma modes stay as source data');
  assert.deepEqual(c.axes, [{ key: 'color-scheme', values: ['Light', 'Dark'] }, { key: 'contrast', values: ['Normal', 'High'] }]);
  const assign = (attrs: Record<string, string>) => assignmentFromAttributes(s, attrs)['semantic-color'];
  assert.equal(assign({ 'color-scheme': 'Light' }), 'Light');
  assert.equal(assign({ 'color-scheme': 'Dark' }), 'Dark');
  assert.equal(assign({ contrast: 'High' }), 'Light High Contrast', 'high contrast alone keeps the default Light scheme');
  assert.equal(assign({ 'color-scheme': 'Dark', contrast: 'High' }), 'Dark High Contrast');
  assert.equal(assign({ 'color-scheme': 'Dark', contrast: 'Normal' }), 'Dark');
  assert.deepEqual(assignmentFromAttributes(s, { style: 'Ares', density: 'Compact' }), { style: 'Ares', density: 'Compact' }, 'collections that are not mentioned stay unset');
  assert.throws(() => assign({ 'color-scheme': 'Sepia' }), /Sepia is not a value of color-scheme/);
  // resolveToken takes axis values as well as a combined mode.
  assert.deepEqual(resolveToken(s, 'semantic-color.color.border.default', { 'color-scheme': 'Dark', contrast: 'High' }), resolveToken(s, 'semantic-color.color.border.default', { 'semantic-color': 'Dark High Contrast' }));
});

test('high contrast keeps the current protections in every style: heavier borders and the high contrast colors', () => {
  const s = production();
  for (const style of STYLES) for (const scheme of ['Light', 'Dark']) {
    const at = (contrast: string, key: string) => resolveToken(s, key, { ...assignmentFromAttributes(s, { style, 'color-scheme': scheme, contrast }) });
    assert.equal(at('Normal', 'semantic-foundation.border-width.default'), 1);
    assert.equal(at('High', 'semantic-foundation.border-width.default'), 2);
    assert.equal(at('High', 'semantic-foundation.border-width.emphasis'), 3);
    // Selene's secondary border is hidden in normal contrast and restored in high contrast.
    const border = at('Normal', 'style.style.button.secondary.border.default');
    const highBorder = at('High', 'style.style.button.secondary.border.default');
    if (style === 'Selene') {
      assert.equal((border as Rgba).a, 0);
      assert.ok((highBorder as Rgba).a > 0, `Selene ${scheme} high contrast restores the border`);
    }
    // The same semantic mode as Figma's Light/Dark High Contrast.
    assert.deepEqual(at('High', 'semantic-color.color.foreground.muted'), resolveToken(s, 'semantic-color.color.foreground.muted', { 'semantic-color': `${scheme} High Contrast` }));
  }
});

test('axis definitions fail explicitly when they do not cover the modes', () => {
  const edit = (f: (c: TokenSourceV2['collections'][number]) => void) => { const s = clone(production()); f(s.collections.find(c => c.key === 'semantic-color')!); return () => validateTokensV2(s); };
  assert.throws(edit(c => { delete c.modeAxes!['Dark High Contrast']; }), /Mode "Dark High Contrast" of semantic-color has no axis mapping/);
  assert.throws(edit(c => { c.modeAxes!['Dark High Contrast'] = { ...c.modeAxes!.Dark }; }), /must cover every combination of its axes exactly once/);
  assert.throws(edit(c => { c.modeAxes!.Dark['color-scheme'] = 'Sepia'; }), /maps axis color-scheme to "Sepia"/);
  assert.throws(edit(c => { c.axes![0].key = 'density'; }), /Axis key "density" of semantic-color must be a unique slug/);
  assert.throws(edit(c => { delete c.axes; }), /modeAxes without axes/);
  assert.throws(edit(c => { c.axes![1].values = ['High', 'Normal']; c.modeAxes!.Light.contrast = 'Normal'; }), /first mode of semantic-color must be every axis' first value/);
  failing(ex => { ex.collections.find(c => c.name === '03 Semantic Color')!.modes[3].name = 'Dark Contrast'; }, /Mode "Dark Contrast" of "03 Semantic Color" has no axis mapping/);
});
