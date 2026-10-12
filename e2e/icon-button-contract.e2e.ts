import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright-core';
import type { Server } from 'node:http';
import { resolveToken, type TokenSourceV2 } from '../lib/figma-tokens';
import { close, expectedColor, launch, openCanvas, parseColor, setAttrs, setMarkup, startServer, themeAttrs } from './harness';

const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));
const variants = ['primary', 'secondary', 'danger', 'ghost', 'dashed'];
const sizes = ['xs', 'sm', 'base'];
const styles = ['Atlas', 'Selene', 'Helios', 'Ares'];
const themes = ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'];
const icon = '<svg role="img" aria-label="Decorative glyph" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="currentColor" /></svg>';
let browser: Browser, server: Server, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser?.close(); server?.close(); });
const open = () => openCanvas(browser, base, 'components-icon-button--playground');
const read = (page: Page, selector: string) => page.locator(selector).evaluate(el => {
  const button = el.shadowRoot!.querySelector('button')!, glyph = el.shadowRoot!.querySelector('.icon')!;
  const b = button.getBoundingClientRect(), i = glyph.getBoundingClientRect(), cs = getComputedStyle(button), ring = getComputedStyle(button, '::after');
  return { width: b.width, height: b.height, iconWidth: i.width, iconHeight: i.height, centered: Math.abs(i.x + i.width / 2 - b.x - b.width / 2) < .1 && Math.abs(i.y + i.height / 2 - b.y - b.height / 2) < .1, fill: cs.backgroundColor, color: cs.color, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, borderStyle: cs.borderTopStyle, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, ringColor: ring.borderTopColor, ringWidth: ring.borderTopWidth, ringRadius: ring.borderTopLeftRadius, ringContent: ring.content, ringGrowth: Math.round(parseFloat(ring.width) - b.width), disabled: button.disabled };
});

test('Icon Button anatomy and focus consume local component aliases rather than Button or Density names', async () => {
  const page = await open();
  for (const size of sizes) {
    await setMarkup(page, `<sp-icon-button id="b" size="${size}" label="Add" style="--sp-icon-button-size-${size}:36px;--sp-icon-button-icon-size-${size}:18px;--sp-icon-button-focus-width:3px;--sp-icon-button-focus-offset:5px;--sp-icon-button-focus-radius:10px;--sp-icon-button-focus-color:rgb(20,40,60)">${icon}</sp-icon-button>`);
    await page.locator('#b').focus();
    const got = await read(page, '#b');
    assert.deepEqual([got.width, got.height, got.iconWidth, got.iconHeight], [36, 36, 18, 18]);
    assert.ok(got.centered);
    assert.deepEqual([got.ringWidth, got.ringRadius, got.ringGrowth], ['3px', '10px', 10]);
    assert.ok(close(parseColor(got.ringColor), { r: 20, g: 40, b: 60, a: 1 }));
  }
  await page.close();
});

test('the required action label trims whitespace, updates its name, and hides decorative slot content', async () => {
  const page = await open(); const warnings: string[] = [];
  page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await setMarkup(page, `<sp-icon-button id="b" label="  Add item  ">${icon}</sp-icon-button>`);
  assert.equal(await page.locator('#b button').getAttribute('aria-label'), 'Add item');
  assert.doesNotMatch(await page.locator('#b').ariaSnapshot(), /Decorative glyph/);
  await page.locator('#b').evaluate(async el => { (el as any).label = 'Remove item'; await (el as any).updateComplete; });
  assert.match(await page.locator('#b').ariaSnapshot(), /button "Remove item"/);
  await page.locator('#b').evaluate(async el => { (el as any).label = '   '; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b button').getAttribute('aria-label'), null);
  assert.ok(warnings.some(w => /needs a `label`/.test(w)), 'a label that becomes blank must warn');
  await page.locator('#b').evaluate(async el => { (el as any).label = 'Continue'; await (el as any).updateComplete; });
  await page.locator('#b').evaluate(async el => { el.removeAttribute('label'); await (el as any).updateComplete; });
  assert.equal(await page.locator('#b button').getAttribute('aria-label'), null, 'removing the attribute must clear a stale action name without crashing');
  await page.close();
});

test('toolbar layout keeps square targets when space is tight, and icon replacement preserves geometry and name', async () => {
  const page = await open();
  await setMarkup(page, `<div style="display:flex;width:80px">${[0, 1, 2].map(n => `<sp-icon-button id="b${n}" label="Add ${n}">${icon}</sp-icon-button>`).join('')}</div>`);
  for (const n of [0, 1, 2]) {
    const got = await read(page, '#b' + n);
    assert.deepEqual([got.width, got.height], [40, 40], 'the toolbar must wrap or scroll rather than squeeze targets');
  }
  await page.locator('#b0').evaluate(el => { el.innerHTML = '<img alt="Decorative replacement" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22/%3E">'; });
  const got = await read(page, '#b0'); assert.ok(got.centered); assert.equal(got.iconWidth, 20);
  assert.match(await page.locator('#b0').ariaSnapshot(), /button "Add 0"/);
  assert.doesNotMatch(await page.locator('#b0').ariaSnapshot(), /Decorative replacement/);
  await page.close();
});

test('all 128 theme combinations render every variant and size with Style, Density and System ownership', async () => {
  const page = await open();
  await setMarkup(page, `<div dir="ltr"><div id="scope" dir="rtl">${variants.flatMap(v => sizes.map(s => `<sp-icon-button id="${v}-${s}" variant="${v}" size="${s}" label="${v} ${s}">${icon}</sp-icon-button>`)).join('')}</div></div>`);
  let combinations = 0;
  for (const style of styles) for (const theme of themes) for (const hue of ['Blue', 'Purple', 'Orange', 'Sky']) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, ...themeAttrs(theme), primary: hue, density });
    const assign = { style, 'semantic-color': theme, primary: hue, density };
    for (const variant of variants) for (const size of sizes) {
      const got = await read(page, `#${variant}-${size}`);
      const box = size === 'xs' ? 24 : size === 'sm' ? density === 'Relaxed' ? 32 : 28 : density === 'Relaxed' ? 40 : 32;
      const glyph = size === 'base' ? density === 'Relaxed' ? 20 : 18 : 16;
      assert.deepEqual([got.width, got.height, got.iconWidth, got.iconHeight], [box, box, glyph, glyph]);
      assert.ok(got.centered); assert.equal(got.shadow, 'none');
      assert.equal(got.radius, `${resolveToken(source, 'style.style.button.radius', assign)}px`);
      assert.equal(got.borderStyle, variant === 'dashed' ? 'dashed' : 'solid');
      for (const [prop, part] of [['fill', 'background'], ['color', 'foreground'], ['border', 'border']] as const) assert.ok(close(parseColor(got[prop]), expectedColor(source, `style.style.button.${variant}.${part}.default`, assign)), `${style}/${theme}/${hue}/${density}/${variant}/${size}/${part}`);
    }
    await page.locator('#primary-xs').focus(); const focus = await read(page, '#primary-xs');
    assert.notEqual(focus.ringContent, 'none'); assert.equal(focus.ringWidth, '2px'); assert.equal(focus.ringGrowth, 8);
    assert.ok(close(parseColor(focus.ringColor), expectedColor(source, 'semantic-color.color.system.focus', assign)));
    combinations++;
  }
  assert.equal(combinations, 128); await page.close();
});

test('real held-pointer and hover states follow every style and preserve disabled state for all sizes', async () => {
  const page = await open();
  await setMarkup(page, variants.flatMap(v => sizes.map(s => `<sp-icon-button id="${v}-${s}" variant="${v}" size="${s}" label="${v} ${s}">${icon}</sp-icon-button>`)).join(''));
  for (const style of styles) for (const theme of themes) {
    await setAttrs(page, { style, ...themeAttrs(theme), primary: 'Purple' });
    const assign = { style, 'semantic-color': theme, primary: 'Purple' };
    for (const variant of variants) for (const size of sizes) {
      const id = `#${variant}-${size}`, b = page.locator(id);
      for (const state of ['hover', 'pressed']) {
        await b.hover(); if (state === 'pressed') await page.mouse.down();
        const got = await read(page, id);
        for (const [prop, part] of [['fill', 'background'], ['color', 'foreground'], ['border', 'border']] as const) assert.ok(close(parseColor(got[prop]), expectedColor(source, `style.style.button.${variant}.${part}.${state}`, assign)), `${style}/${theme}/${variant}/${size}/${state}/${part}`);
        if (state === 'pressed') await page.mouse.up();
      }
      await b.evaluate(async el => { (el as any).disabled = true; await (el as any).updateComplete; });
      await b.hover(); await page.mouse.down(); const got = await read(page, id);
      assert.ok(got.disabled); assert.ok(close(parseColor(got.color), expectedColor(source, 'semantic-color.color.foreground.disabled', assign)));
      if (variant === 'ghost') assert.equal(parseColor(got.fill).a, 0);
      else assert.ok(close(parseColor(got.fill), expectedColor(source, 'semantic-color.color.surface.disabled', assign)));
      await page.mouse.up(); await b.evaluate(async el => { (el as any).disabled = false; await (el as any).updateComplete; });
    }
  }
  await page.close();
});

test('Icon Button Tab, Enter, Space and fieldset re-enabling work for every variant and size', async () => {
  const page = await open();
  for (const variant of variants) for (const size of sizes) {
    await setMarkup(page, `<fieldset id="f"><sp-icon-button id="off" disabled label="Unavailable"></sp-icon-button><sp-icon-button id="b" variant="${variant}" size="${size}" label="Add">${icon}</sp-icon-button></fieldset>`);
    await page.locator('#b').evaluate(el => { (el as any).clicks = 0; el.addEventListener('click', () => (el as any).clicks++); });
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
    await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    assert.equal(await page.locator('#b').evaluate(el => (el as any).clicks), 2);
    await page.locator('#b').evaluate(async el => { const f = document.querySelector<HTMLFieldSetElement>('#f')!; f.disabled = true; await (el as any).updateComplete; });
    assert.equal((await read(page, '#b')).disabled, true);
    await page.locator('#b').evaluate(async el => { const f = document.querySelector<HTMLFieldSetElement>('#f')!; f.disabled = false; await (el as any).updateComplete; (el as HTMLElement).focus(); });
    assert.equal((await read(page, '#b')).disabled, false); assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
    await page.locator('#b').click(); assert.equal(await page.locator('#b').evaluate(el => (el as any).clicks), 3);
    await page.locator('#b').evaluate(el => (el as HTMLElement).blur());
  }
  await page.close();
});

test('Icon Button submits its name/value, resets forms, and respects native validation', async () => {
  const page = await open();
  await setMarkup(page, `<form id="f"><input id="field" name="title" required value="Draft"><sp-icon-button id="save" label="Save" type="submit" name="intent" value="save">${icon}</sp-icon-button><sp-icon-button id="reset" label="Reset" type="reset">${icon}</sp-icon-button></form>`);
  await page.evaluate(() => { document.querySelector('#f')!.addEventListener('submit', e => { e.preventDefault(); (window as any).sent = [...new FormData(e.target as HTMLFormElement, (e as SubmitEvent).submitter)]; }); });
  await page.locator('#save').focus(); await page.keyboard.press('Space');
  assert.deepEqual(await page.evaluate(() => (window as any).sent), [['title', 'Draft'], ['intent', 'save']]);
  await page.locator('#field').fill(''); await page.evaluate(() => { (window as any).sent = null; });
  await page.locator('#save').click(); assert.equal(await page.evaluate(() => (window as any).sent), null);
  await page.locator('#reset').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('#field').inputValue(), 'Draft');
  assert.equal(await page.locator('#f > button').count(), 0, 'temporary submitter is removed');
  await page.close();
});

test('named form controls cannot shadow Icon Button submit and reset actions', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><input name="requestSubmit" value="Draft"><sp-icon-button id="save" label="Save" type="submit"></sp-icon-button><sp-icon-button id="reset" label="Reset" type="reset"></sp-icon-button></form>');
  await page.evaluate(() => { document.querySelector('#f')!.addEventListener('submit', e => { e.preventDefault(); (window as any).submitted = true; }); });
  await page.locator('#save').click();
  assert.equal(await page.evaluate(() => (window as any).submitted), true);
  await page.locator('input').fill('Changed'); await page.locator('#reset').click();
  assert.equal(await page.locator('input').inputValue(), 'Draft');
  await page.close();
});

test('nested local settings inherit unmodified axes, preserve RTL glyph orientation and forced-colors focus', async () => {
  const page = await open();
  await setAttrs(page, { style: 'Helios', primary: 'Purple', density: 'Compact', 'color-scheme': 'Dark', contrast: 'High' });
  await setMarkup(page, `<div dir="rtl"><div data-sp-mode-style="Ares" data-sp-mode-density="Relaxed" data-sp-mode-primary="Sky"><sp-icon-button id="b" label="Next">${icon}</sp-icon-button><div dir="ltr"><sp-icon-button id="child" size="xs" label="Add">${icon}</sp-icon-button></div></div></div>`);
  const got = await read(page, '#b'); assert.equal(got.width, 40); assert.equal(got.radius, '0px');
  assert.ok(close(parseColor(got.fill), expectedColor(source, 'style.style.button.primary.background.default', { style: 'Ares', primary: 'Sky', density: 'Relaxed', 'semantic-color': 'Dark High Contrast' })));
  const dirs = await page.evaluate(() => ['b', 'child'].map(id => { const el = document.getElementById(id)!; return { dir: getComputedStyle(el.shadowRoot!.querySelector('button')!).direction, transform: getComputedStyle(el.querySelector('svg')!).transform }; }));
  assert.deepEqual(dirs, [{ dir: 'rtl', transform: 'none' }, { dir: 'ltr', transform: 'none' }]);
  await page.locator('#b').focus(); await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  assert.equal((await read(page, '#b')).ringWidth, '2px');
  const highlight = await page.evaluate(() => { const el = document.createElement('i'); el.style.color = 'Highlight'; document.body.append(el); const color = getComputedStyle(el).color; el.remove(); return color; });
  assert.equal((await read(page, '#b')).ringColor, highlight);
  await page.close();
});
