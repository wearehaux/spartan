import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { validateTokensV2, renderCSSV2, tokenCssName } from '../lib/figma-tokens';

const require = createRequire(import.meta.url);
const source = () => validateTokensV2(JSON.parse(readFileSync('tokens/source.json', 'utf8')));
const read = (p: string) => readFileSync(new URL(`../packages/components/src/components/${p}`, import.meta.url), 'utf8');

test('package exports resolve to built JavaScript, types, and the generated token CSS', () => {
  const pkg = JSON.parse(readFileSync(require.resolve('@spartan/components/package.json'), 'utf8'));
  for (const [entry, target] of Object.entries<any>(pkg.exports)) {
    if (typeof target === 'object') {
      assert.ok(require.resolve(`@spartan/components${entry.slice(1)}`), entry);
      readFileSync(new URL(target.types, new URL('../packages/components/', import.meta.url)));
    }
  }
  assert.equal(readFileSync(require.resolve('@spartan/components/tokens.css'), 'utf8'), renderCSSV2(source()));
});

test('consumer import registers all elements once and keeps their public properties', async () => {
  const { SpButton, SpIconButton, SpInput, SpTextarea, SpCheckbox, SpRadioGroup, SpRadioGroupItem } = await import('@spartan/components');
  await import('@spartan/components/button');
  await import('@spartan/components/icon-button');
  await import('@spartan/components/input');
  await import('@spartan/components/textarea');
  await import('@spartan/components/checkbox');
  await import('@spartan/components/radio-group');
  assert.equal(customElements.get('sp-button'), SpButton);
  assert.equal(customElements.get('sp-icon-button'), SpIconButton);
  assert.equal(customElements.get('sp-input'), SpInput);
  assert.equal(SpInput.formAssociated, true);
  assert.equal(customElements.get('sp-textarea'), SpTextarea);
  assert.equal(SpTextarea.formAssociated, true);
  assert.equal(customElements.get('sp-checkbox'), SpCheckbox);
  assert.equal(SpCheckbox.formAssociated, true);
  assert.equal(customElements.get('sp-radio-group'), SpRadioGroup);
  assert.equal(customElements.get('sp-radio-group-item'), SpRadioGroupItem);
  assert.equal(SpRadioGroup.formAssociated, true);
  assert.equal(SpButton.formAssociated, true);
  assert.deepEqual(Object.keys(SpButton.properties), ['variant', 'type', 'disabled', 'name', 'value', 'size', 'loading']);
  assert.deepEqual(Object.keys(SpIconButton.properties), ['variant', 'type', 'disabled', 'name', 'value', 'size', 'label']);
});

test('component styles only reference variables the token build emits', () => {
  const s = source();
  const emitted = new Set(s.tokens.map(t => tokenCssName(t, s)));
  for (const file of ['shared/action.styles.ts', 'button/sp-button.styles.ts', 'icon-button/sp-icon-button.styles.ts', 'input/sp-input.styles.ts', 'shared/field.styles.ts', 'textarea/sp-textarea.styles.ts', 'checkbox/sp-checkbox.styles.ts', 'radio-group/sp-radio-group.styles.ts']) {
    for (const name of new Set(read(file).match(/--sp-[a-z0-9-]+/g) ?? [])) assert.ok(emitted.has(name), `${file} uses ${name}, which no token produces`);
  }
});

test('component styles contain no hard-coded colors, sizes, or radii outside the spinner dimensions and focus ring', () => {
  for (const file of ['shared/action.styles.ts', 'button/sp-button.styles.ts', 'icon-button/sp-icon-button.styles.ts', 'input/sp-input.styles.ts', 'shared/field.styles.ts', 'textarea/sp-textarea.styles.ts', 'checkbox/sp-checkbox.styles.ts', 'radio-group/sp-radio-group.styles.ts']) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, `${file} has a literal color`);
    for (const m of css.matchAll(/(width|height|padding[a-z-]*|border-radius|font-size|line-height|gap|min-width):\s*([^;]+);/g)) {
      const value = m[2].trim();
      assert.ok(!/^\d/.test(value) || /^(0|100%|1|2px|8px|12px|16px|1\.25px)(?![\w.])/.test(value), `${file}: ${m[0]}`);
    }
  }
});

test('stories exist for every variant, size, and state in the Figma sets', () => {
  const button = read('button/sp-button.stories.ts');
  for (const v of ['primary', 'secondary', 'danger', 'ghost', 'dashed', 'danger-subtle', 'warning']) assert.match(button, new RegExp(`'${v}'`));
  for (const story of ['Variants', 'Sizes', 'Styles', 'Directions', 'WithIcons', 'Disabled', 'Loading', 'Density', 'InForm']) assert.match(button, new RegExp(`export const ${story}\\b`));
  const icon = read('icon-button/sp-icon-button.stories.ts');
  for (const s of ['xs', 'sm', 'base']) assert.match(icon, new RegExp(`'${s}'`));
  assert.deepEqual(readdirSync(new URL('../packages/components/src/components', import.meta.url)).sort(), ['button', 'checkbox', 'icon-button', 'input', 'radio-group', 'shared', 'textarea']);
});

test('Button takes its shape, fills, and borders from the Style collection and has no shadow or shape API', () => {
  const action = read('shared/action.styles.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const button = read('button/sp-button.ts');
  const s = source();
  const emitted = new Set(s.tokens.map(t => tokenCssName(t, s)));
  assert.doesNotMatch(action, /box-shadow|--_shadow|shadow/, 'buttons carry no shadow');
  assert.doesNotMatch(button + read('button/define.ts'), /ButtonShape|declare shape|shape:|this\.shape/, 'the obsolete shape API is gone');
  assert.match(action, /border-radius:\s*var\(--sp-style-button-radius\)/);
  assert.match(action, /var\(--sp-style-button-border-width\)/);
  assert.match(action, /--_focus-radius:\s*var\(--sp-button-focus-radius\)/);
  // Every variant maps fill, foreground, and border for default, hover, and pressed.
  for (const v of ['primary', 'secondary', 'danger', 'ghost', 'dashed', 'danger-subtle', 'warning'])
    for (const part of ['background', 'foreground', 'border'])
      for (const state of ['default', 'hover', 'pressed']) {
        const name = `--sp-style-button-${v}-${part}-${state}`;
        assert.ok(emitted.has(name), `${name} is not emitted`);
        assert.ok(action.includes(name), `${name} is not used`);
      }
});

test('Button layout uses logical properties so an inherited or nested dir mirrors it', () => {
  const css = ['shared/action.styles.ts', 'button/sp-button.styles.ts'].map(read).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\b(margin|padding|border)-(left|right)\b|(?<![-\w])(left|right)\s*:|text-align:\s*(left|right)/, 'physical left/right in Button styles');
  assert.match(css, /padding-inline:/);
});
