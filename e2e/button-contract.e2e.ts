import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright-core';
import type { Server } from 'node:http';
import { resolveToken, type TokenSourceV2 } from '../lib/figma-tokens';
import { close, expectedColor, launch, openCanvas, parseColor, setAttrs, setMarkup, startServer, themeAttrs } from './harness';

const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));
const styles = ['Atlas', 'Selene', 'Helios', 'Ares'];
const themes = ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'];
const hues = ['Blue', 'Purple', 'Orange', 'Sky'];
const variants = ['primary', 'secondary', 'danger', 'warning', 'danger-subtle', 'ghost', 'dashed'];
let browser: Browser, server: Server, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser?.close(); server?.close(); });
const read = (page: Page, id: string) => page.locator(id).evaluate(el => {
  const button = el.shadowRoot!.querySelector('button')!, cs = getComputedStyle(button), ring = getComputedStyle(button, '::after');
  return { fill: cs.backgroundColor, color: cs.color, border: cs.borderTopColor, radius: cs.borderTopLeftRadius, height: cs.height, font: cs.fontSize, line: cs.lineHeight, shadow: cs.boxShadow, outline: cs.outlineStyle, disabled: button.disabled, busy: button.getAttribute("aria-busy"), hostDisabled: el.hasAttribute("disabled"), hover: button.matches(":hover"), ring: ring.borderTopColor, ringWidth: ring.borderTopWidth, ringContent: ring.content };
});

test('Button anatomy consumes its component aliases, including nested density and local token overrides', async () => {
  const page = await openCanvas(browser, base);
  await setMarkup(page, '<div data-sp-mode-density="Compact"><sp-button id="b" style="--sp-button-font-size-base:18px;--sp-button-line-height-base:24px;--sp-button-icon-size-base:22px;--sp-button-focus-width:3px;--sp-button-focus-offset:6px;--sp-button-focus-radius:18px"><svg slot="start" aria-hidden="true"></svg>Save</sp-button></div>');
  await page.keyboard.press('Tab');
  const got = await read(page, '#b');
  assert.equal(got.height, '32px');
  assert.equal(got.font, '18px', 'component font alias must reach the rendered label');
  assert.equal(got.line, '24px');
  assert.equal(got.ringWidth, '3px');
  const geometry = await page.locator('#b').evaluate(el => {
    const b = el.shadowRoot!.querySelector('button')!, ring = getComputedStyle(b, '::after');
    return { icon: getComputedStyle(el.shadowRoot!.querySelector('.icon')!).width, radius: ring.borderRadius, growth: Math.round(parseFloat(ring.width) - b.getBoundingClientRect().width) };
  });
  assert.deepEqual(geometry, { icon: '22px', radius: '18px', growth: 12 });
  await page.close();
});

test('loading announces unavailable activation without losing its name or keyboard focus', async () => {
  const page = await openCanvas(browser, base);
  await setMarkup(page, '<sp-button id="b" loading>Save changes</sp-button>');
  const button = page.getByRole('button', { name: 'Save changes', exact: true });
  assert.equal(await button.getAttribute('aria-busy'), 'true');
  assert.equal(await button.getAttribute('aria-disabled'), 'true');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
  await page.locator('#b').evaluate(async el => { (el as any).loading = false; await (el as any).updateComplete; });
  assert.equal(await button.getAttribute('aria-disabled'), null);
  await page.close();
});

test('clearing disabled restores pointer and keyboard activation after the form-associated callback', async () => {
  const page = await openCanvas(browser, base);
  await setMarkup(page, '<sp-button id="b">Save</sp-button><sp-icon-button id="icon" label="Add"></sp-icon-button>');
  for (const id of ['b', 'icon']) {
    await page.locator('#' + id).evaluate(async el => {
      (el as any).disabled = true; await (el as any).updateComplete;
      (el as any).disabled = false; await (el as any).updateComplete;
    });
    assert.equal((await read(page, '#' + id)).disabled, false, `${id} must re-enable the native button`);
    await page.locator('#' + id).evaluate(el => (el as HTMLElement).focus());
    assert.equal(await page.evaluate(() => document.activeElement?.id), id, 'focus works immediately after updateComplete');
    await page.locator('#' + id).evaluate(el => { (el as any).clicks = 0; el.addEventListener('click', () => (el as any).clicks++); });
    await page.locator('#' + id).click(); await page.locator('#' + id).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#' + id).evaluate(el => (el as any).clicks), 2);
  }
  await page.close();
});

test('fieldset transitions and overlapping own disabled state settle with updateComplete', async () => {
  const page = await openCanvas(browser, base);
  await setMarkup(page, '<fieldset id="f"><sp-button id="b">Save</sp-button></fieldset>');
  const states = await page.locator('#b').evaluate(async el => {
    const b = el as any, f = document.querySelector<HTMLFieldSetElement>('#f')!;
    const states: boolean[] = [];
    f.disabled = true; await b.updateComplete; states.push(b.shadowRoot.querySelector('button').disabled);
    b.disabled = true; await b.updateComplete;
    b.disabled = false; await b.updateComplete; states.push(b.shadowRoot.querySelector('button').disabled);
    f.disabled = false; await b.updateComplete; states.push(b.shadowRoot.querySelector('button').disabled);
    b.focus(); return { states, active: document.activeElement?.id };
  });
  assert.deepEqual(states, { states: [true, true, false], active: 'b' });
  await page.close();
});

test('keyboard focus has one System indicator and preserves it in forced colors', async () => {
  const page = await openCanvas(browser, base);
  await setMarkup(page, '<sp-button id="b">Save</sp-button>');
  await page.keyboard.press('Tab');
  assert.equal((await read(page, '#b')).outline, 'none', 'custom ring replaces the native outline');
  await page.emulateMedia({ forcedColors: 'active' });
  const got = await read(page, '#b');
  const highlight = await page.evaluate(() => { const n = document.createElement('i'); n.style.color = 'Highlight'; document.body.append(n); const c = getComputedStyle(n).color; n.remove(); return c; });
  assert.equal(got.ringWidth, '2px');
  assert.equal(got.ring, highlight, 'forced-colors focus uses the user system Highlight');
  await page.close();
});

test('all themes preserve Button anatomy, nested LTR/RTL slots, and independent Brand/System feedback', async () => {
  const page = await openCanvas(browser, base);
  const icon = (slot: string) => `<svg slot="${slot}" aria-hidden="true" viewBox="0 0 20 20"></svg>`;
  await setMarkup(page, `<div dir="ltr"><div id="scope" dir="rtl">${variants.map(v => `<sp-button id="${v}" variant="${v}">${icon('start')}Continue${icon('end')}</sp-button>`).join('')}<sp-button id="small" size="sm">${icon('start')}Small</sp-button><div style="width:120px"><sp-button id="long">${icon('start')}Export every selected record${icon('end')}</sp-button></div><sp-button id="busy" loading>Continue</sp-button></div></div>`);
  let combinations = 0;
  for (const style of styles) for (const theme of themes) for (const hue of hues) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, ...themeAttrs(theme), primary: hue, density });
    const assign = { style, 'semantic-color': theme, primary: hue, density };
    for (const dir of ['ltr', 'rtl']) {
      await page.locator('#scope').evaluate((el, dir) => el.setAttribute('dir', dir), dir);
      const positions = await page.locator('#primary').evaluate(el => { const b = el.shadowRoot!.querySelector('button')!; const start = el.querySelector('[slot=start]')!.getBoundingClientRect(), label = el.shadowRoot!.querySelector('.label')!.getBoundingClientRect(), end = el.querySelector('[slot=end]')!.getBoundingClientRect(); return { dir: getComputedStyle(b).direction, start: start.x, label: label.x, end: end.x }; });
      assert.equal(positions.dir, dir);
      assert.ok(dir === 'ltr' ? positions.start < positions.label && positions.label < positions.end : positions.end < positions.label && positions.label < positions.start);
    }
    const got = await page.locator('#scope').evaluate(el => [...el.querySelectorAll('sp-button')].map(host => { const b = host.shadowRoot!.querySelector('button')!, cs = getComputedStyle(b); return { id: host.id, fill: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, height: cs.height, font: cs.fontSize, line: cs.lineHeight, shadow: cs.boxShadow, width: b.getBoundingClientRect().width }; }));
    for (const item of got.filter(x => variants.includes(x.id))) {
      for (const [prop, part] of [['fill', 'background'], ['color', 'foreground']] as const) assert.ok(close(parseColor(item[prop]), expectedColor(source, `style.style.button.${item.id}.${part}.default`, assign)), `${style}/${theme}/${hue}/${density}/${item.id}/${part}`);
      assert.equal(item.radius, `${resolveToken(source, 'style.style.button.radius', assign)}px`);
      assert.equal(item.shadow, 'none');
    }
    assert.equal(got[0].height, density === 'Relaxed' ? '40px' : '32px');
    assert.equal(got[0].font, density === 'Relaxed' ? '15px' : '14px');
    assert.equal(got[0].line, density === 'Relaxed' ? '22px' : '20px');
    assert.equal(got.find(x => x.id === 'small')!.height, density === 'Relaxed' ? '32px' : '28px');
    assert.equal(got.find(x => x.id === 'small')!.font, density === 'Relaxed' ? '14px' : '13px');
    assert.equal(got.find(x => x.id === 'small')!.line, density === 'Relaxed' ? '20px' : '18px');
    assert.equal(await page.locator('#small').evaluate(el => getComputedStyle(el.shadowRoot!.querySelector('.icon')!).width), '16px');
    assert.ok(got.find(x => x.id === 'long')!.width <= 120);
    await page.locator('#busy').focus();
    const ring = await read(page, '#busy');
    assert.notEqual(ring.ringContent, 'none');
    assert.ok(close(parseColor(ring.ring), expectedColor(source, 'semantic-color.color.system.focus', assign)));
    combinations++;
  }
  assert.equal(combinations, 128);
  await page.close();
});

test('real hover and held-pointer pressed states respect each Style recipe and blocked states', async () => {
  const page = await openCanvas(browser, base);
  await setMarkup(page, variants.map(v => `<sp-button id="${v}" variant="${v}">Save</sp-button>`).join(''));
  for (const style of styles) for (const theme of themes) {
    await setAttrs(page, { style, ...themeAttrs(theme), primary: 'Purple' });
    const assign = { style, 'semantic-color': theme, primary: 'Purple' };
    for (const variant of variants) {
      const b = page.locator('#' + variant);
      for (const state of ['hover', 'pressed']) {
        await b.hover();
        if (state === 'pressed') await page.mouse.down();
        const got = await read(page, '#' + variant);
        for (const [prop, part] of [['fill', 'background'], ['color', 'foreground'], ['border', 'border']] as const) assert.ok(close(parseColor(got[prop]), expectedColor(source, `style.style.button.${variant}.${part}.${state}`, assign)), `${style}/${theme}/${variant}/${state}/${part}: ${got[prop]} ${JSON.stringify(got)}`);
        if (state === 'pressed') await page.mouse.up();
      }
      await b.evaluate(async el => { (el as any).loading = true; await (el as any).updateComplete; });
      await b.hover(); await page.mouse.down();
      const busy = await read(page, '#' + variant);
      assert.ok(close(parseColor(busy.fill), expectedColor(source, `style.style.button.${variant}.background.default`, assign)));
      await page.mouse.up();
      await b.evaluate(async el => { (el as any).loading = false; (el as any).disabled = true; await (el as any).updateComplete; });
      await b.hover(); await page.mouse.down();
      const disabled = await read(page, '#' + variant);
      if (variant !== 'ghost') assert.ok(close(parseColor(disabled.fill), expectedColor(source, 'semantic-color.color.surface.disabled', assign)));
      assert.ok(close(parseColor(disabled.color), expectedColor(source, 'semantic-color.color.foreground.disabled', assign)));
      await page.mouse.up();
      await b.evaluate(async el => { (el as any).disabled = false; await (el as any).updateComplete; });
    }
  }
  await page.close();
});
