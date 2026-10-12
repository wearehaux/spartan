// Chromium's own CSS cascade against the token resolver: every generated custom property, in every
// combination of style, hue, color scheme, contrast, and density, plus nested mode overrides.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Browser } from 'playwright-core';
import type { Server } from 'node:http';
import { assignmentFromAttributes, modeDependencies, renderCSSV2, resolvedCss, tokenCssName, type TokenSourceV2 } from '../lib/figma-tokens';
import { canon, launch, openCanvas, startServer } from './harness';

const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));
const deps = modeDependencies(source);
const names = new Map(source.tokens.map(t => [t.key, tokenCssName(t, source)]));
const axis = (collection: string, key?: string) => {
  const c = source.collections.find(x => x.key === collection)!;
  return key ? c.axes!.find(a => a.key === key)!.values : c.modes.map(m => m.name);
};
const STYLES = axis('style'), HUES = axis('primary'), SCHEMES = axis('semantic-color', 'color-scheme'), CONTRASTS = axis('semantic-color', 'contrast'), DENSITIES = axis('density');
const expectedFor = (attrs: Record<string, string>) => Object.fromEntries(source.tokens.map(t => [names.get(t.key)!, canon(resolvedCss(source, t.key, assignmentFromAttributes(source, attrs)))]));

let server: Server, browser: Browser, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser.close(); server.close(); });

describe('generated token CSS in Chromium', () => {
  test('every token resolves to the authored value for all 128 style, hue, color scheme, contrast, and density combinations', async () => {
    const page = await openCanvas(browser, base);
    let checked = 0;
    for (const style of STYLES) for (const primary of HUES) for (const scheme of SCHEMES) for (const contrast of CONTRASTS) for (const density of DENSITIES) {
      const attrs = { style, primary, 'color-scheme': scheme, contrast, density };
      const expected = expectedFor(attrs);
      const actual = await page.evaluate(({ attrs, names }) => {
        const root = document.documentElement;
        for (const [k, v] of Object.entries(attrs)) root.setAttribute(`data-sp-mode-${k}`, v);
        const cs = getComputedStyle(root);
        return Object.fromEntries(names.map(name => [name, cs.getPropertyValue(name)]));
      }, { attrs, names: Object.keys(expected) });
      const wrong = Object.entries(expected).filter(([name, value]) => canon(actual[name]) !== value).map(([name, value]) => `${name}: got "${actual[name].trim()}" want "${value}"`);
      assert.deepEqual(wrong.slice(0, 3), [], `${JSON.stringify(attrs)}: ${wrong.length} wrong`);
      checked += source.tokens.length;
    }
    assert.equal(checked, source.tokens.length * 128);
    await page.close();
  });

  test('an element with no attributes is Atlas, Blue, Light, normal contrast, and Relaxed', async () => {
    const page = await openCanvas(browser, base);
    const expected = expectedFor({ style: 'Atlas', primary: 'Blue', 'color-scheme': 'Light', contrast: 'Normal', density: 'Relaxed' });
    const actual = await page.evaluate(names => {
      const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries(names.map(name => [name, cs.getPropertyValue(name)]));
    }, Object.keys(expected));
    assert.deepEqual(Object.entries(expected).filter(([name, value]) => canon(actual[name]) !== value).slice(0, 3), []);
    await page.close();
  });

  test('new code-only collections inherit and override density aliases without Figma identities', async () => {
    const authored = structuredClone(source);
    delete authored.source;
    authored.collections.push({ key: 'code-control', name: 'Code Control', cssPrefix: 'code', modes: [{ name: 'Default' }] });
    authored.tokens.push({ key: 'code-control.height', name: 'height', collection: 'code-control', type: 'FLOAT', unit: 'px', values: { Default: { alias: 'component.button.height.base' } } });
    const page = await browser.newPage();
    await page.setContent('<div data-sp-mode-density="Compact"><p id="compact">Compact</p><div data-sp-mode-density="Relaxed"><p id="relaxed">Relaxed</p></div></div>');
    await page.addStyleTag({ content: renderCSSV2(authored) });
    const values = await page.evaluate(() => ['compact', 'relaxed'].map(id => getComputedStyle(document.getElementById(id)!).getPropertyValue('--sp-code-height').trim()));
    assert.deepEqual(values, ['32px', '40px']);
    await page.close();
  });

  test('the style radius follows the Style Modes document: Atlas 8, Selene 12, Helios pill, Ares 0', async () => {
    const page = await openCanvas(browser, base);
    const radius = (style: string) => page.evaluate(style => {
      document.documentElement.setAttribute('data-sp-mode-style', style);
      return getComputedStyle(document.documentElement).getPropertyValue('--sp-style-button-radius').trim();
    }, style);
    assert.deepEqual([await radius('Atlas'), await radius('Selene'), await radius('Helios'), await radius('Ares')], ['8px', '12px', '9999px', '0px']);
    await page.close();
  });

  test('a nested override of any one setting leaves the other four, at one or two levels down, for every token', async () => {
    const page = await openCanvas(browser, base);
    const outer = { style: 'Selene', primary: 'Orange', 'color-scheme': 'Dark', contrast: 'High', density: 'Compact' };
    const other: Record<string, string> = { style: 'Ares', primary: 'Sky', 'color-scheme': 'Light', contrast: 'Normal', density: 'Relaxed' };
    for (const key of Object.keys(outer)) {
      const expected = expectedFor({ ...outer, [key]: other[key] });
      const actual = await page.evaluate(({ outer, key, value, names }) => {
        const root = document.documentElement;
        for (const [k, v] of Object.entries(outer)) root.setAttribute(`data-sp-mode-${k}`, v);
        document.getElementById('storybook-root')!.innerHTML = `<div><div id="deep" data-sp-mode-${key}="${value}"><p id="leaf">x</p></div></div>`;
        const cs = getComputedStyle(document.getElementById('leaf')!);
        return Object.fromEntries(names.map(name => [name, cs.getPropertyValue(name)]));
      }, { outer, key, value: other[key], names: Object.keys(expected) });
      const wrong = Object.entries(expected).filter(([name, value]) => canon(actual[name]) !== value).map(([name, value]) => `${name}: got "${actual[name].trim()}" want "${value}"`);
      assert.deepEqual(wrong.slice(0, 3), [], `nested ${key}: ${wrong.length} wrong`);
    }
    await page.close();
  });

  test('high contrast switches on and off again on a nested element without touching style, scheme, hue, or density', async () => {
    const page = await openCanvas(browser, base);
    const base_ = { style: 'Helios', primary: 'Purple', 'color-scheme': 'Dark', density: 'Compact' };
    const names = Object.keys(expectedFor({ ...base_, contrast: 'Normal' }));
    const read = (markup: string) => page.evaluate(({ attrs, markup, names }) => {
      for (const [k, v] of Object.entries(attrs)) document.documentElement.setAttribute(`data-sp-mode-${k}`, v);
      document.getElementById('storybook-root')!.innerHTML = markup;
      const cs = getComputedStyle(document.getElementById('leaf')!);
      return Object.fromEntries(names.map(name => [name, cs.getPropertyValue(name)]));
    }, { attrs: base_, markup, names });
    const same = (actual: Record<string, string>, attrs: Record<string, string>) => Object.entries(expectedFor(attrs)).filter(([name, value]) => canon(actual[name]) !== value).slice(0, 3);
    assert.deepEqual(same(await read('<div data-sp-mode-contrast="High"><p id="leaf">x</p></div>'), { ...base_, contrast: 'High' }), [], 'on');
    assert.deepEqual(same(await read('<div data-sp-mode-contrast="High"><div data-sp-mode-contrast="Normal"><p id="leaf">x</p></div></div>'), { ...base_, contrast: 'Normal' }), [], 'on, then off again');
    await page.close();
  });

  test('the three-collection token re-resolves with its settings spread over three nesting levels', async () => {
    const fixture = structuredClone(source);
    const field = fixture.tokens.find(t => t.key === 'style.style.field.border.hover')!;
    for (const mode of ['Helios', 'Ares']) field.values[mode] = { alias: 'semantic-color.color.primary.text' };
    assert.deepEqual(modeDependencies(fixture).get(field.key), ['primary', 'semantic-color', 'style']);
    const page = await openCanvas(browser, base);
    await page.addStyleTag({ content: renderCSSV2(fixture) });
    for (const style of STYLES) for (const primary of HUES) for (const scheme of SCHEMES) {
      const got = await page.evaluate(({ style, primary, scheme }) => {
        document.getElementById('storybook-root')!.innerHTML = `<div data-sp-mode-style="${style}" data-sp-mode-contrast="High"><div data-sp-mode-color-scheme="${scheme}"><div data-sp-mode-primary="${primary}"><p id="leaf">x</p></div></div></div>`;
        return getComputedStyle(document.getElementById('leaf')!).getPropertyValue('--sp-style-field-border-hover');
      }, { style, primary, scheme });
      const attrs = { style, contrast: 'High', 'color-scheme': scheme, primary };
      assert.equal(canon(got), canon(resolvedCss(fixture, 'style.style.field.border.hover', assignmentFromAttributes(fixture, attrs))), JSON.stringify(attrs));
    }
    await page.close();
  });
});
