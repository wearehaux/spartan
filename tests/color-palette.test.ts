import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLOR_EXCLUSIONS, PAIRINGS, SECTIONS, SOURCE, aliasTrace, buildGroups, colorTokens, contrastRatio, parseCssColor, semanticAttrs, toHex } from '../packages/components/src/foundations/colors/color-model';
import { resolveToken, tokenCssName, type Rgba, type TokenSourceV2 } from '../lib/figma-tokens';

const css = readFileSync('public/tokens.css', 'utf8');

test('the Colors page reads the committed production token source, not a copy', () => {
  assert.deepEqual(SOURCE, JSON.parse(readFileSync('tokens/source.json', 'utf8')));
});

test('every production COLOR token is on the page exactly once, or is a documented exclusion', () => {
  const shown = buildGroups().flatMap(g => g.entries.map(e => e.token.key));
  assert.equal(new Set(shown).size, shown.length, 'a token appears in two groups');
  const excluded = COLOR_EXCLUSIONS.map(e => e.key);
  for (const e of COLOR_EXCLUSIONS) assert.ok(e.reason.trim().length > 10, `exclusion ${e.key} needs a reason`);
  const all = colorTokens().map(t => t.key);
  assert.deepEqual([...shown, ...excluded].sort(), [...all].sort());
  assert.equal(all.length, SOURCE.tokens.filter(t => t.type === 'COLOR').length);
  // Every collection that has COLOR tokens maps to a named section.
  const sections = new Set(SECTIONS.map(s => s.id));
  for (const g of buildGroups()) assert.ok(sections.has(g.section));
});

test('each shown token names a CSS variable that the generated CSS declares', () => {
  for (const g of buildGroups()) for (const e of g.entries) {
    assert.equal(e.cssVar, tokenCssName(e.token, SOURCE));
    assert.ok(css.includes(`${e.cssVar}:`), `${e.cssVar} is not declared in public/tokens.css`);
  }
});

test('alias traces end at a literal and match the resolver for every mode combination', () => {
  const primaries = SOURCE.collections.find(c => c.key === 'primary')!.modes.map(m => m.name);
  const byKey = new Map(SOURCE.tokens.map(t => [t.key, t]));
  for (const token of colorTokens()) for (const primary of primaries) for (const mode of ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'] as const) {
    const trace = aliasTrace(token.key, { primary, ...semanticAttrs(mode) });
    const last = trace.links.at(-1);
    if (last) {
      const end = byKey.get(last.key)!;
      assert.ok(!JSON.stringify(end.values[last.mode]).includes('alias') || 'alpha' in (end.values[last.mode] as object), `${token.key} does not end at a literal`);
    }
    // The end of the chain resolves to the same color as the token itself.
    if (last && !trace.opacity) {
      const a = resolveToken(SOURCE, token.key, { primary, 'semantic-color': mode }) as Rgba;
      const b = resolveToken(SOURCE, last.key, { primary, 'semantic-color': mode }) as Rgba;
      assert.deepEqual(a, b, `${token.key} / ${primary} / ${mode}`);
    }
  }
});

test('a semantic primary role traces through the Primary mode to a primitive', () => {
  const t = aliasTrace('semantic-color.color.primary.default', { primary: 'Orange', ...semanticAttrs('Light') });
  // Compatibility primary roles now pass through Brand semantics and a dedicated primitive ramp.
  assert.deepEqual(t.links.map(l => [l.collection, l.mode]), [['semantic-color', 'Light'], ['primary', 'Orange'], ['primitives', 'Value']]);
  assert.equal(t.links.at(-1)!.key, 'primitives.color.brand.orange.600');
  assert.equal(t.opacity, undefined);
  // A translucent role reports its opacity, here a percent token from 04 Semantic Foundation.
  const drawer = aliasTrace('semantic-color.color.backdrop.drawer', { ...semanticAttrs('Light') });
  assert.deepEqual(drawer.links.map(l => l.name), ['color/neutral/1000']);
  assert.ok(drawer.opacity && 'links' in drawer.opacity && drawer.opacity.links[0].collection === 'semantic-foundation');
});

test('every pairing names semantic color tokens that exist', () => {
  const keys = new Set(SOURCE.tokens.filter(t => t.collection === 'semantic-color' && t.type === 'COLOR').map(t => t.key));
  for (const p of PAIRINGS) { assert.ok(keys.has(p.surface), p.surface); assert.ok(keys.has(p.text), p.text); }
});

test('color parsing and contrast follow WCAG', () => {
  assert.deepEqual(parseCssColor('rgb(255, 0, 128)'), { r: 255, g: 0, b: 128, a: 1 });
  assert.deepEqual(parseCssColor('color(srgb 1 0 0.5 / 0.5)'), { r: 255, g: 0, b: 127.5, a: 0.5 });
  assert.equal(parseCssColor('not a color'), null);
  assert.equal(toHex({ r: 255, g: 255, b: 255, a: 1 }), '#FFFFFF');
  assert.equal(toHex({ r: 0, g: 0, b: 0, a: 0.5 }), '#00000080');
  const white = { r: 255, g: 255, b: 255, a: 1 }, black = { r: 0, g: 0, b: 0, a: 1 };
  assert.equal(contrastRatio(white, black)!.toFixed(2), '21.00');
  assert.equal(contrastRatio(white, white), 1);
  assert.equal(contrastRatio(white, { ...black, a: 0.5 }), null, 'a translucent color has no ratio');
});

test('the source type still has the collections the page maps', () => {
  const s: TokenSourceV2 = SOURCE;
  assert.deepEqual(s.collections.filter(c => s.tokens.some(t => t.collection === c.key && t.type === 'COLOR')).map(c => c.key).sort(), ['component', 'primary', 'primitives', 'semantic-color', 'style']);
});
