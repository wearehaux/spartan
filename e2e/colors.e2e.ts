// Foundations / Colors in Chromium: every swatch value is read from the live CSS variable and must
// equal the token resolver's value for the selected Primary and Semantic Color modes.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Browser } from 'playwright-core';
import type { Server } from 'node:http';
import { tokenCssName, type TokenSourceV2 } from '../lib/figma-tokens';
import { close, expectedColor, launch, startServer } from './harness';

const fromHex = (hex: string) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1 });

const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));
const colors = source.tokens.filter(t => t.type === 'COLOR');
const HUES = source.collections.find(c => c.key === 'primary')!.modes.map(m => m.name);
const MODES = source.collections.find(c => c.key === 'semantic-color')!.modes.map(m => m.name);

let server: Server, browser: Browser, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser.close(); server.close(); });

const open = async (story: string, args = '') => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${base}/iframe.html?id=${story}&viewMode=story${args}`);
  await page.waitForFunction(() => document.body.classList.contains('sb-show-main') && document.querySelector('sb-color-palette')?.shadowRoot?.querySelector('[data-token], [data-pair]'));
  return page;
};

describe('Foundations / Colors', () => {
  test('shows every COLOR token with its name, CSS variable, and a resolved value', async () => {
    const page = await open('foundations-colors--all');
    const rows = await page.evaluate(() => [...document.querySelector('sb-color-palette')!.shadowRoot!.querySelectorAll<HTMLElement>('[data-token]')].map(el => ({
      key: el.dataset.token!,
      name: el.querySelector('.name')!.textContent!,
      cssVar: el.querySelector('.var')!.textContent!,
      value: el.querySelector('[data-value]')!.textContent!,
    })));
    assert.equal(rows.length, colors.length);
    assert.deepEqual(rows.map(r => r.key).sort(), colors.map(t => t.key).sort());
    for (const r of rows) {
      const t = colors.find(x => x.key === r.key)!;
      assert.equal(r.name, t.name);
      assert.equal(r.cssVar, tokenCssName(t, source));
      assert.match(r.value, /^#[0-9A-F]{6}([0-9A-F]{2})?$/, `${r.key} value "${r.value}"`);
    }
    await page.close();
  });

  test('swatches equal the resolver for all 16 Primary and Semantic Color mode combinations', async () => {
    const page = await open('foundations-colors--all');
    let checked = 0;
    for (const primary of HUES) for (const mode of MODES) {
      const shown = await page.evaluate(async ({ primary, mode }) => {
        const el = document.querySelector<HTMLElement & { primary: string; semanticColor: string; updateComplete: Promise<boolean> }>('sb-color-palette')!;
        el.primary = primary; el.semanticColor = mode;
        await el.updateComplete;
        return Object.fromEntries([...el.shadowRoot!.querySelectorAll<HTMLElement>('[data-token]')].map(t => [t.dataset.token!, t.querySelector('[data-value]')!.textContent!]));
      }, { primary, mode });
      const wrong: string[] = [];
      for (const t of colors) {
        const hex = shown[t.key];
        const got = fromHex(hex);
        // Style is Atlas, the default with no attribute.
        if (!close(got, expectedColor(source, t.key, { primary, 'semantic-color': mode }), 1)) wrong.push(`${t.key}: ${hex}`);
        checked++;
      }
      assert.deepEqual(wrong.slice(0, 3), [], `${primary} / ${mode}: ${wrong.length} wrong`);
    }
    assert.equal(checked, colors.length * 16);
    await page.close();
  });

  test('the Storybook controls (URL args) set the modes the swatches use', async () => {
    const page = await open('foundations-colors--semantic-roles', '&args=primary:Orange;semanticColor:Dark+High+Contrast');
    const state = await page.evaluate(() => {
      const el = document.querySelector('sb-color-palette')!;
      const token = el.shadowRoot!.querySelector<HTMLElement>('[data-token="semantic-color.color.primary.default"]')!;
      return { scheme: el.getAttribute('data-sp-mode-color-scheme'), contrast: el.getAttribute('data-sp-mode-contrast'), hue: el.getAttribute('data-sp-mode-primary'), value: token.querySelector('[data-value]')!.textContent!, alias: token.querySelector('summary')!.textContent!.trim() };
    });
    assert.deepEqual([state.scheme, state.contrast, state.hue], ['Dark', 'High', 'Orange']);
    const want = expectedColor(source, 'semantic-color.color.primary.default', { primary: 'Orange', 'semantic-color': 'Dark High Contrast' });
    assert.ok(close(fromHex(state.value), want, 1), `${state.value} vs ${JSON.stringify(want)}`);
    assert.match(state.alias, /^Alias of color\/brand\//);
    await page.close();
  });

  test('pairings in every mode compute a ratio from the resolved colors and never claim a pass', async () => {
    const page = await open('foundations-colors--pairings-in-every-mode');
    const text = await page.evaluate(() => [...document.querySelectorAll('sb-color-palette')].map(p => [...p.shadowRoot!.querySelectorAll('[data-ratio]')].map(r => r.textContent!)));
    assert.equal(text.length, 4);
    for (const mode of text) {
      assert.ok(mode.length > 0);
      for (const t of mode) { assert.match(t, /^Contrast (\d+\.\d\d:1|not computed)/); assert.doesNotMatch(t, /pass|AA|AAA/i); }
    }
    // The ratios differ between modes, so they follow the selected Semantic Color mode.
    assert.notDeepEqual(text[0], text[1]);
    await page.close();
  });
});
