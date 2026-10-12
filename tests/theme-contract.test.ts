import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFigmaExport, modeDependencies, resolveToken, validateTokensV2, type TokenSourceV2 } from '../lib/figma-tokens';
import { validateTokenOwnership } from '../lib/token-ownership';

const source = () => JSON.parse(readFileSync('tokens/source.json', 'utf8')) as TokenSourceV2;
const baseline = () => importFigmaExport(JSON.parse(readFileSync('tokens/figma/spartan-ds.export.json', 'utf8')));
const modes = ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'];
const hues = ['Blue', 'Purple', 'Orange', 'Sky'];
const styles = ['Atlas', 'Selene', 'Helios', 'Ares'];

test('family recipes cannot reach back into Component and primitives cannot acquire semantic dependencies', () => {
  let s = source();
  s.tokens.find(t => t.key === 'style.style.surface.background')!.values.Atlas = { alias: 'component.dialog.backdrop.default' };
  assert.throws(() => validateTokenOwnership(s), /style.*component/i);
  s = source();
  s.tokens.find(t => t.key === 'primitives.space.4')!.values.Value = { alias: 'semantic-color.contrast.border-width.default' };
  assert.throws(() => validateTokenOwnership(s), /primitives.*semantic-color/i);
});

test('custom collection ownership does not accidentally use inherited Object properties', () => {
  const s=source();
  s.collections.push({key:'constructor',name:'Custom collection',cssPrefix:'custom',modes:[{name:'Value'}]});
  s.tokens.push({key:'constructor.gap',name:'gap',collection:'constructor',type:'FLOAT',unit:'px',values:{Value:{alias:'primitives.space.4'}}});
  assert.doesNotThrow(()=>validateTokenOwnership(s));
});

test('dedicated primitive Brand ramps preserve all hue values and can change without recoloring System', () => {
  const s = source(), old = baseline();
  for (const hue of hues) for (const t of old.tokens.filter(t => t.collection === 'primary')) {
    const step = t.key.split('.').at(-1)!;
    const brandKey = `primitives.color.brand.${hue.toLowerCase()}.${step}`;
    assert.deepEqual(resolveToken(s, brandKey), resolveToken(old, t.key, { primary: hue }));
    assert.deepEqual(s.tokens.find(x => x.key === t.key)!.values[hue], { alias: brandKey });
  }
  const color = { r: 0.3, g: 0.2, b: 0.6, a: 1 };
  s.tokens.find(t => t.key === 'primitives.color.brand.purple.600')!.values.Value = color;
  assert.deepEqual(resolveToken(s, 'semantic-color.color.brand.default', { primary: 'Purple' }), color);
  assert.deepEqual(resolveToken(s, 'semantic-color.color.system.focus', { primary: 'Purple' }), resolveToken(old, 'semantic-color.color.focus-ring.default', { primary: 'Blue' }));
});

test('System selection, focus and all field feedback dependencies are independent of Primary', () => {
  const s = source(), deps = modeDependencies(s);
  const keys = ['semantic-color.color.system.focus', 'semantic-color.color.system.control.default', 'semantic-color.color.focus-ring.default', 'style.style.field.border.focus', 'style.style.field.border.hover', 'component.button.focus-color', 'component.selection.background.checked'];
  for (const key of keys) {
    assert.ok(!deps.get(key)?.includes('primary'), key);
    for (const mode of modes) for (const style of styles) {
      const values = hues.map(primary => resolveToken(s, key, { primary, style, 'semantic-color': mode }));
      values.forEach(value => assert.deepEqual(value, values[0], `${key}/${mode}/${style}`));
    }
  }
});

test('family density aliases preserve size tiers and add named repeated-content spacing', () => {
  const s = source();
  const expected: Record<string, number[]> = {
    'component.field.height.small': [32, 28], 'component.field.height.base': [40, 32],
    'component.table.row.min-height': [40, 32], 'component.table.cell.padding-y': [8, 4],
    'component.menu.item.min-height': [32, 28], 'component.form.group.gap': [16, 12],
    'component.chart.legend.gap': [12, 8], 'component.card.padding-x': [16, 16],
    'component.card.padding-y': [20, 20], 'component.surface.content.padding': [24, 16],
  };
  for (const [key, values] of Object.entries(expected)) assert.deepEqual(['Relaxed', 'Compact'].map(density => resolveToken(s, key, { density })), values, key);
  assert.deepEqual(['Relaxed', 'Compact'].map(density => resolveToken(s, 'density.density.control.font-size.base', { density })), [15, 14]);
  assert.deepEqual(['Relaxed', 'Compact'].map(density => resolveToken(s, 'density.density.control.icon-size.base', { density })), [20, 18]);
});

test('field appearance changes treatment while Style owns shape and semantic contrast owns boundaries', () => {
  const s = source();
  assert.deepEqual(styles.map(style => resolveToken(s, 'style.style.field.multiline.radius', { style })), [8, 12, 16, 0]);
  for (const style of styles) for (const mode of modes) {
    const at = (key: string) => resolveToken(s, key, { style, 'semantic-color': mode });
    assert.equal(at('style.style.field.outlined.side-width'), mode.includes('High Contrast') ? 2 : 1);
    assert.equal(at('style.style.field.filled.side-width'), mode.includes('High Contrast') ? 2 : 0);
    assert.deepEqual(at('style.style.field.outlined.background'), at('semantic-color.color.surface.default'));
    assert.deepEqual(at('style.style.field.filled.background'), at('semantic-color.color.surface.muted'));
  }
  assert.doesNotThrow(() => validateTokensV2(s));
});

test('migration preserves every existing identity and value except documented system-feedback routes', () => {
  const s = source(), old = baseline(), current = new Map(s.tokens.map(t => [t.key, t]));
  assert.deepEqual(s.collections, old.collections);
  const changed = new Set<string>();
  for (const token of old.tokens) {
    assert.deepEqual(current.get(token.key)?.figma, token.figma, token.key);
    for (const style of styles) for (const primary of hues) for (const mode of modes) for (const density of ['Relaxed', 'Compact']) {
      const assign = { style, primary, 'semantic-color': mode, density };
      if (JSON.stringify(resolveToken(s, token.key, assign)) !== JSON.stringify(resolveToken(old, token.key, assign))) changed.add(token.key);
    }
  }
  assert.deepEqual([...changed].sort(), ['semantic-color.color.focus-ring.default', 'style.style.field.border.focus', 'style.style.field.border.hover']);
});
