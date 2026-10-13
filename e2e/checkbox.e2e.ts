import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser } from 'playwright-core';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { close, expectedColor, launch, openCanvas, parseColor, setAttrs, setMarkup, startServer, themeAttrs } from './harness';
import type { TokenSourceV2 } from '../lib/figma-tokens';
const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));

let browser: Browser, server: Server, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser?.close(); server?.close(); });
const open = async () => {
  const page = await openCanvas(browser, base);
  assert.ok(await page.evaluate(() => !!customElements.get('sp-checkbox')), 'production Checkbox is registered');
  return page;
};

// Missing checked capture, duplicate change bridging, or accidental Enter handling breaks this contract.
test('native Checkbox captures Space and pointer activation with one event pair and accessible mixed state', async () => {
  const page = await open();
  await setMarkup(page, '<sp-checkbox id="b" label="Accept terms" description="Read the terms first"></sp-checkbox>');
  await page.locator('#b').evaluate(el => { (el as any).events = []; for (const name of ['input', 'change']) el.addEventListener(name, () => (el as any).events.push(name)); });
  const input = page.getByRole('checkbox', { name: 'Accept terms', exact: true });
  await input.focus(); await input.press('Space'); assert.equal(await input.isChecked(), true);
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).events]), [true, ['input', 'change']]);
  await input.press('Enter'); assert.equal(await input.isChecked(), true);
  await page.getByText('Accept terms', { exact: true }).click(); assert.equal(await input.isChecked(), false);
  await page.locator('#b').evaluate(async el => { (el as any).indeterminate = true; await (el as any).updateComplete; });
  assert.match(await page.locator('#b').ariaSnapshot(), /checked=mixed/);
  await input.press('Space'); assert.equal(await input.isChecked(), true);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).indeterminate), false);
  await page.close();
});

test('current checked state submits once, preserves defaultChecked, resets and restores mixed state', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><sp-checkbox id="b" label="Terms" name="terms" value="accepted" checked></sp-checkbox><sp-checkbox label="Other" name="other"></sp-checkbox><button type="reset">Reset</button></form>');
  const data = () => page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]);
  assert.deepEqual(await data(), [['terms', 'accepted']]);
  await page.getByRole('checkbox', { name: 'Terms', exact: true }).uncheck(); assert.deepEqual(await data(), []);
  assert.equal(await page.locator('#b').getAttribute('checked'), '');
  await page.getByRole('button', { name: 'Reset' }).click(); assert.equal(await page.getByRole('checkbox', { name: 'Terms', exact: true }).isChecked(), true);
  await page.locator('#b').evaluate(async el => { (el as any).checked = false; (el as any).indeterminate = true; await (el as any).updateComplete; });
  assert.deepEqual(await data(), [], 'indeterminate does not invent a form value');
  await page.getByRole('button', { name: 'Reset' }).click(); assert.equal(await page.locator('#b').evaluate(el => (el as any).indeterminate), false);
  await page.locator('#b').evaluate(async el => { (el as any).formStateRestoreCallback('[false,true]'); await (el as any).updateComplete; });
  assert.match(await page.locator('#b').ariaSnapshot(), /checked=mixed/);
  await page.locator('#b').evaluate(async el => { (el as any).checked = true; await (el as any).updateComplete; });
  assert.deepEqual(await data(), [['terms', 'accepted']], 'checked controls submission even when mixed');
  await page.close();
});

test('required/custom validity blocks submit and disabled fieldsets exclude values without losing checked state', async () => {
  const page = await open();
  await setMarkup(page, '<form><fieldset><sp-checkbox id="b" label="Required terms" name="terms" required></sp-checkbox></fieldset><button>Send</button></form>');
  await page.evaluate(() => { (window as any).sent = 0; document.querySelector('form')!.addEventListener('submit', e => { e.preventDefault(); (window as any).sent++; }); });
  await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.evaluate(() => (window as any).sent), 0);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).validity.valueMissing), true);
  await page.getByRole('checkbox', { name: 'Required terms' }).check(); await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.evaluate(() => (window as any).sent), 1);
  await page.locator('#b').evaluate(el => (el as any).setCustomValidity('Review this choice')); await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.evaluate(() => (window as any).sent), 1);
  await page.locator('#b').evaluate(el => (el as any).setCustomValidity(''));
  await page.locator('fieldset').evaluate(el => (el as HTMLFieldSetElement).disabled = true);
  await page.waitForFunction(() => document.querySelector('sp-checkbox')!.shadowRoot!.querySelector('input')!.disabled);
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), []);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checked), true);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), true);
  await page.locator('fieldset').evaluate(el => (el as HTMLFieldSetElement).disabled = false);
  await page.waitForFunction(() => !document.querySelector('sp-checkbox')!.shadowRoot!.querySelector('input')!.disabled);
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), [['terms', 'on']]);
  await page.close();
});

test('disabled activation is blocked and cancellation rolls back native state without editing events', async () => {
  const page = await open();
  await setMarkup(page, '<sp-checkbox id="b" label="Unavailable" disabled checked indeterminate error="Review"></sp-checkbox>');
  await page.locator('#b').evaluate(el => { (el as any).inputs = 0; el.addEventListener('input', () => (el as any).inputs++); (el as HTMLElement).click(); });
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).indeterminate, (el as any).inputs]), [true, true, 0]);
  await page.locator('#b').evaluate(async el => { (el as any).disabled = false; (el as any).error = ''; await (el as any).updateComplete; el.addEventListener('click', e => e.preventDefault()); (el as HTMLElement).click(); });
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).indeterminate, (el as any).inputs]), [true, true, 0]);
  await page.close();
});

test('programmatic properties update forms without events and dirty checked state survives default changes', async () => {
  const page = await open(); await setMarkup(page, '<form><sp-checkbox id="b" label="Choice" name="choice"></sp-checkbox></form>');
  await page.locator('#b').evaluate(async el => { (el as any).events = 0; el.addEventListener('change', () => (el as any).events++); (el as any).checked = true; (el as any).value = 'yes'; await (el as any).updateComplete; });
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), [['choice', 'yes']]);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).events), 0);
  await page.locator('#b').evaluate(async el => { (el as any).checked = false; el.setAttribute('checked', ''); await (el as any).updateComplete; });
  assert.equal(await page.getByRole('checkbox', { name: 'Choice' }).isChecked(), false);
  await page.locator('form').evaluate(el => (el as HTMLFormElement).reset()); assert.equal(await page.getByRole('checkbox', { name: 'Choice' }).isChecked(), true);
  await page.close();
});

test('slotted and external labels/descriptions stay accessible and external label clicks activate exactly once', async () => {
  const page = await open();
  await setMarkup(page, '<sp-checkbox id="b"><span slot="label">Slotted label</span><span slot="description">Supporting text</span></sp-checkbox><label for="x" id="l">External label</label><p id="d">External hint</p><sp-checkbox id="x" described-by="d"></sp-checkbox>');
  assert.equal(await page.getByRole('checkbox', { name: 'Slotted label' }).count(), 1);
  await page.getByText('External label', { exact: true }).click(); await page.waitForFunction(() => (document.querySelector('#x') as any).checked);
  assert.equal(await page.getByRole('checkbox', { name: 'External label' }).isChecked(), true);
  await page.locator('#l').evaluate(el => el.textContent = 'Renamed label'); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('checkbox', { name: 'Renamed label' }).count(), 1);
  await page.locator('#b [slot=label]').evaluate(el => el.textContent = 'Updated slot'); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('checkbox', { name: 'Updated slot' }).count(), 1);
  const cdp = await page.context().newCDPSession(page); const tree = await cdp.send('Accessibility.getFullAXTree');
  const ax = tree.nodes.find(n => n.role?.value === 'checkbox' && n.name?.value === 'Renamed label'); assert.equal(ax?.description?.value, 'External hint');
  await page.close();
});

test('canceling an external label click after the internal listener prevents activation and editing events', async () => {
  const page = await open(); await setMarkup(page, '<label for="b">External choice</label><sp-checkbox id="b"></sp-checkbox>');
  await page.locator('#b').evaluate(el => { (el as any).events = []; for (const name of ['input', 'change']) el.addEventListener(name, () => (el as any).events.push(name)); el.addEventListener('click', e => e.preventDefault()); });
  await page.getByText('External choice', { exact: true }).click(); await page.waitForTimeout(30);
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).events]), [false, []]);
  await page.close();
});

test('host click blocks synchronously disabled state before the next reactive render', async () => {
  const page = await open(); await setMarkup(page, '<sp-checkbox id="b" label="Choice"></sp-checkbox>');
  const state = await page.locator('#b').evaluate(el => { let events = 0; el.addEventListener('input', () => events++); (el as any).disabled = true; (el as HTMLElement).click(); return [(el as any).checked, events]; });
  assert.deepEqual(state, [false, 0]); await page.close();
});

test('defaultChecked property reflects the reset attribute while preserving dirty current state', async () => {
  const page = await open(); await setMarkup(page, '<form><sp-checkbox id="b" label="Choice"></sp-checkbox></form>');
  await page.locator('#b').evaluate(async el => { (el as any).defaultChecked = true; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').getAttribute('checked'), ''); assert.equal(await page.getByRole('checkbox', { name: 'Choice' }).isChecked(), true);
  await page.locator('#b').evaluate(async el => { (el as any).checked = true; (el as any).defaultChecked = false; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').getAttribute('checked'), null); assert.equal(await page.getByRole('checkbox', { name: 'Choice' }).isChecked(), true);
  await page.locator('form').evaluate(el => (el as HTMLFormElement).reset()); assert.equal(await page.getByRole('checkbox', { name: 'Choice' }).isChecked(), false);
  await page.close();
});

test('external label names omit hidden decorations and refresh when visibility or association changes', async () => {
  const page = await open(); await setMarkup(page, '<label id="l" for="b">Choice <span aria-hidden="true">Decoration</span><span hidden>Hidden</span></label><sp-checkbox id="b"></sp-checkbox>');
  assert.equal(await page.getByRole('checkbox', { name: 'Choice', exact: true }).count(), 1);
  await page.locator('#l [aria-hidden]').evaluate(el => el.setAttribute('aria-hidden', 'false')); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('checkbox', { name: 'Choice Decoration', exact: true }).count(), 1);
  await page.locator('#l').evaluate(el => el.remove()); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('checkbox', { name: 'Choice Decoration', exact: true }).count(), 0);
  await page.locator('#b').evaluate(async el => { (el as any).ariaLabel = 'Explicit choice'; await (el as any).updateComplete; });
  assert.equal(await page.getByRole('checkbox', { name: 'Explicit choice' }).count(), 1);
  await page.close();
});

test('external label for and host id changes update both old and newly associated accessible names', async () => {
  const page = await open(); await setMarkup(page, '<label id="l" for="x">Choice</label><sp-checkbox id="x"></sp-checkbox><sp-checkbox id="y"></sp-checkbox>');
  await page.locator('#l').evaluate(el => (el as HTMLLabelElement).htmlFor = 'y'); await page.waitForTimeout(30);
  assert.match(await page.locator('#y').ariaSnapshot(), /checkbox "Choice"/); assert.doesNotMatch(await page.locator('#x').ariaSnapshot(), /Choice/);
  await page.locator('#y').evaluate(el => el.id = 'new-id'); await page.waitForTimeout(30);
  assert.doesNotMatch(await page.locator('#new-id').ariaSnapshot(), /Choice/);
  await page.locator('#l').evaluate(el => (el as HTMLLabelElement).htmlFor = 'new-id'); await page.waitForTimeout(30);
  assert.match(await page.locator('#new-id').ariaSnapshot(), /Choice/);
  await page.close();
});

test('all 128 themes preserve fixed geometry, Style selection radii, Density text and brand-independent selected colors', async () => {
  const page = await open(); await setMarkup(page, '<sp-checkbox id="b" label="Theme choice" checked></sp-checkbox>');
  for (const style of ['Atlas', 'Selene', 'Helios', 'Ares']) for (const theme of ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast']) for (const primary of ['Blue', 'Purple', 'Orange', 'Sky']) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, primary, density, ...themeAttrs(theme) });
    const v = await page.locator('#b').evaluate(el => { const box = el.shadowRoot!.querySelector('.box')!, target = el.shadowRoot!.querySelector('.target')!, mark = el.shadowRoot!.querySelector('.mark')!, label = el.shadowRoot!.querySelector('.label')!, c = getComputedStyle(box); return { width: box.getBoundingClientRect().width, height: box.getBoundingClientRect().height, target: target.getBoundingClientRect().width, radius: c.borderRadius, fill: c.backgroundColor, color: getComputedStyle(mark).backgroundColor, glyph: mark.getBoundingClientRect().width, font: getComputedStyle(label).fontSize, gap: getComputedStyle(el.shadowRoot!.querySelector('.row')!).columnGap }; });
    assert.equal(v.width, 20); assert.equal(v.height, 20); assert.equal(v.target, 44); assert.equal(v.glyph, 16);
    assert.equal(v.radius, ({ Atlas: '4px', Selene: '8px', Helios: '12px', Ares: '0px' })[style]);
    assert.equal(v.font, density === 'Relaxed' ? '15px' : '14px'); assert.equal(v.gap, density === 'Relaxed' ? '8px' : '6px');
    const assign = { style, 'semantic-color': theme, primary, density };
    assert.ok(close(parseColor(v.fill), expectedColor(source, 'semantic-color.color.system.control.default', assign)), JSON.stringify({ style, theme, primary, density, v }));
    assert.ok(close(parseColor(v.color), expectedColor(source, 'semantic-color.color.system.control.foreground', assign)));
  }
  await page.close();
});

test('hover/pressed use System and invalid focus keeps Danger with a separate System ring; disabled overrides both', async () => {
  const page = await open(); await setMarkup(page, '<sp-checkbox id="b" label="Choice" checked></sp-checkbox><button>After</button>');
  const input = page.getByRole('checkbox', { name: 'Choice' });
  const style = () => page.locator('#b .box').evaluate(el => { const c = getComputedStyle(el), ring = getComputedStyle(el, '::after'); return { fill: c.backgroundColor, border: c.borderColor, width: c.borderTopWidth, ring: ring.borderColor, ringWidth: ring.borderTopWidth, ringContent: ring.content }; });
  await input.hover(); assert.ok(close(parseColor((await style()).fill), expectedColor(source, 'semantic-color.color.system.control.hover', {})));
  await page.mouse.down(); assert.ok(close(parseColor((await style()).fill), expectedColor(source, 'semantic-color.color.system.control.active', {}))); await page.mouse.up();
  await page.locator('#b').evaluate(async el => { (el as any).invalid = true; await (el as any).updateComplete; }); await page.getByRole('button', { name: 'After' }).focus(); await page.keyboard.press('Shift+Tab');
  const s = await style(); assert.ok(close(parseColor(s.border), expectedColor(source, 'semantic-color.color.danger.default', {}))); assert.ok(close(parseColor(s.ring), expectedColor(source, 'semantic-color.color.system.focus', {})), JSON.stringify({ s, focused: await input.evaluate(el => [el.matches(':focus'), el.matches(':focus-visible'), document.activeElement?.tagName]) })); assert.equal(s.ringWidth, '2px');
  await page.locator('#b').evaluate(async el => { (el as any).disabled = true; await (el as any).updateComplete; }); assert.ok(close(parseColor((await style()).fill), expectedColor(source, 'semantic-color.color.surface.disabled', {})));
  await page.close();
});

test('forced colors retain checked and mixed marks, visible boundaries and keyboard focus', async () => {
  const page = await open(); await page.emulateMedia({ forcedColors: 'active' });
  await setMarkup(page, '<sp-checkbox id="b" label="Contrast" checked></sp-checkbox>'); const input = page.getByRole('checkbox', { name: 'Contrast' }); await input.focus();
  const c = await page.locator('#b').evaluate(el => { const box = el.shadowRoot!.querySelector('.box')!, m = el.shadowRoot!.querySelector('.mark')!; return { border: getComputedStyle(box).borderColor, fill: getComputedStyle(box).backgroundColor, mark: getComputedStyle(m).backgroundColor, mask: getComputedStyle(m).maskImage, ring: getComputedStyle(box, '::after').borderTopWidth }; });
  assert.notEqual(c.border, 'rgba(0, 0, 0, 0)'); assert.notEqual(c.fill, c.mark); assert.notEqual(c.mask, 'none'); assert.equal(c.ring, '2px');
  await page.locator('#b').evaluate(async el => { (el as any).indeterminate = true; await (el as any).updateComplete; }); assert.match(await page.locator('#b').ariaSnapshot(), /checked=mixed/);
  await page.close();
});

test('nested theme overrides and RTL long labels wrap without overflow at 320 and 390px', async () => {
  const page = await open();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    await setMarkup(page, '<section data-sp-mode-style="Helios" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" data-sp-mode-primary="Purple" dir="rtl"><div data-sp-mode-style="Ares" data-sp-mode-density="Compact"><sp-checkbox id="b" label="A long selection label that wraps and stays inside this narrow container" description="The description must also wrap without changing the target size" checked></sp-checkbox></div></section>');
    const v = await page.locator('#b').evaluate(el => { const label = el.shadowRoot!.querySelector('.label')!, box = el.shadowRoot!.querySelector('.box')!; return { overflow: document.documentElement.scrollWidth > innerWidth, radius: getComputedStyle(box).borderRadius, dir: getComputedStyle(label).direction, left: box.getBoundingClientRect().left, labelRight: label.getBoundingClientRect().right, font: getComputedStyle(label).fontSize }; });
    assert.equal(v.overflow, false); assert.equal(v.radius, '0px'); assert.equal(v.dir, 'rtl'); assert.equal(v.font, '14px'); assert.ok(v.left > v.labelRight);
  }
  await page.close();
});
