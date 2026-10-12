import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright-core';
import type { Server } from 'node:http';
import { resolveToken, type TokenSourceV2 } from '../lib/figma-tokens';
import { close, expectedColor, launch, openCanvas, parseColor, setAttrs, setMarkup, startServer, themeAttrs } from './harness';

const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));
let browser: Browser, server: Server, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser?.close(); server?.close(); });
const open = async () => {
  const page = await openCanvas(browser, base);
  assert.ok(await page.evaluate(() => !!customElements.get('sp-input')), 'package must register the production Input');
  return page;
};
const read = (page: Page, id = '#b') => page.locator(id).evaluate(el => {
  const field = el.shadowRoot!.querySelector('.field')!, input = el.shadowRoot!.querySelector('input')!, cs = getComputedStyle(field), ring = getComputedStyle(field, '::after');
  return { height: field.getBoundingClientRect().height, fill: cs.backgroundColor, border: cs.borderBottomColor, side: cs.borderLeftWidth, bottom: cs.borderBottomWidth, radius: cs.borderRadius, shadow: cs.boxShadow, font: getComputedStyle(input).fontSize, line: getComputedStyle(input).lineHeight, focus: input.matches(':focus-visible'), ring: ring.borderColor, ringWidth: ring.borderTopWidth, ringContent: ring.content, value: input.value, disabled: input.disabled, readonly: input.readOnly, invalid: input.getAttribute('aria-invalid') };
});

test('Input registers, edits without duplicate events or caret loss, and exposes accessible labels/descriptions', async () => {
  const page = await open();
  await setMarkup(page, '<sp-input id="b" label="Email" description="We use this to reply" name="email" value="Draft"></sp-input>');
  const input = page.getByRole('textbox', { name: 'Email', exact: true });
  await page.locator('#b').evaluate(el => { (el as any).inputs = 0; (el as any).changes = 0; el.addEventListener('input', () => (el as any).inputs++); el.addEventListener('change', () => (el as any).changes++); });
  await page.getByText('Email', { exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
  await input.fill('Hello'); await input.press('ArrowLeft'); await input.press('x'); await input.press('Tab');
  assert.equal(await page.locator('#b').evaluate(el => (el as any).value), 'Hellxo');
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).inputs, (el as any).changes]), [2, 1]);
  assert.match(await page.locator('#b').ariaSnapshot(), /Email/);
  const rel = await input.evaluate(el => { const id = el.getAttribute('aria-describedby'); return id && el.getRootNode() instanceof ShadowRoot ? (el.getRootNode() as ShadowRoot).getElementById(id)?.textContent?.trim() : ''; });
  assert.equal(rel, 'We use this to reply');
  await page.close();
});

test('Input submits current values, honors default submitter, reset/defaultValue and state restoration', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><sp-input id="b" label="Title" name="title" value="Draft"></sp-input><sp-button type="submit" name="intent" value="save">Save</sp-button><sp-button type="reset">Reset</sp-button></form>');
  await page.evaluate(() => { (window as any).sent = []; document.querySelector('#f')!.addEventListener('submit', e => { e.preventDefault(); (window as any).sent.push([...new FormData(e.target as HTMLFormElement, (e as SubmitEvent).submitter)]); }); });
  await page.getByRole('textbox', { name: 'Title' }).fill('Edited'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).sent.length === 1);
  assert.deepEqual(await page.evaluate(() => (window as any).sent), [[['title', 'Edited'], ['intent', 'save']]]);
  await page.getByRole('button', { name: 'Reset' }).click(); assert.equal((await read(page)).value, 'Draft');
  await page.locator('#b').evaluate(async el => { (el as any).value = 'Current'; el.setAttribute('value', 'New default'); await (el as any).updateComplete; });
  assert.equal((await read(page)).value, 'Current');
  await page.getByRole('button', { name: 'Reset' }).click(); assert.equal((await read(page)).value, 'New default');
  await page.locator('#b').evaluate(async el => { (el as any).formStateRestoreCallback('Restored', 'restore'); await (el as any).updateComplete; });
  assert.equal((await read(page)).value, 'Restored');
  assert.equal(await page.locator('#b').getAttribute('value'), 'New default', 'current value must not reflect into markup');
  await page.close();
});

test('native email/number constraints and custom errors block submission; readonly/disabled and fieldsets behave correctly', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><fieldset id="group"><sp-input id="b" label="Email" type="email" name="email" required></sp-input></fieldset><sp-button type="submit">Save</sp-button></form>');
  await page.getByRole('button', { name: 'Save' }).click();
  assert.equal(await page.locator('#b').evaluate(el => (el as any).validity.valueMissing), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
  await page.getByRole('textbox', { name: 'Email' }).fill('wrong');
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), false);
  await page.getByRole('textbox', { name: 'Email' }).fill('name@example.com');
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), true);
  await page.locator('#b').evaluate(async el => { (el as any).setCustomValidity('Already registered'); await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), false);
  await page.locator('#b').evaluate(async el => { (el as any).setCustomValidity(''); (el as any).readOnly = true; await (el as any).updateComplete; });
  await page.locator('#b').focus(); await page.keyboard.type('ignored'); assert.equal((await read(page)).value, 'name@example.com');
  await page.locator('#b').evaluate(async el => { document.querySelector<HTMLFieldSetElement>('#group')!.disabled = true; await (el as any).updateComplete; });
  assert.equal((await read(page)).disabled, true);
  assert.deepEqual(await page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#f')!)]), []);
  await page.locator('#b').evaluate(async el => { document.querySelector<HTMLFieldSetElement>('#group')!.disabled = false; (el as any).readOnly = false; (el as any).type = 'number'; (el as any).min = '2'; (el as any).max = '8'; (el as any).step = '2'; (el as any).value = '3'; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').evaluate(el => (el as any).validity.stepMismatch), true);
  await page.locator('#b').evaluate(async el => { (el as any).value = '4'; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), true);
  await page.close();
});

test('Default and local appearances consume Field recipes across all 128 themes and both sizes', async () => {
  const page = await open();
  await setMarkup(page, '<sp-input id="b" aria-label="Example" placeholder="Enter a value"></sp-input>');
  let count = 0;
  for (const style of ['Atlas', 'Selene', 'Helios', 'Ares']) for (const theme of ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast']) for (const hue of ['Blue', 'Purple', 'Orange', 'Sky']) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, ...themeAttrs(theme), primary: hue, density });
    const assign = { style, 'semantic-color': theme, primary: hue, density };
    for (const appearance of ['default', 'outlined', 'filled']) for (const size of ['sm', 'base']) {
      await page.locator('#b').evaluate(async (el, { appearance, size }) => { (el as any).appearance = appearance; (el as any).size = size; await (el as any).updateComplete; }, { appearance, size });
      const got = await read(page);
      assert.equal(got.height, size === 'sm' ? density === 'Relaxed' ? 32 : 28 : density === 'Relaxed' ? 40 : 32);
      assert.equal(got.font, size === 'sm' ? density === 'Relaxed' ? '14px' : '13px' : density === 'Relaxed' ? '15px' : '14px');
      assert.equal(got.radius, `${resolveToken(source, 'component.field.radius', assign)}px`);
      const fill = appearance === 'default' ? 'component.field.background.default' : `style.style.field.${appearance}.background`;
      assert.ok(close(parseColor(got.fill), expectedColor(source, fill, assign)));
      if (theme.includes('High Contrast')) assert.ok(parseFloat(got.bottom) >= 2);
      if (style === 'Helios') assert.notEqual(got.shadow, 'none');
      count++;
    }
  }
  assert.equal(count, 768); await page.close();
});

test('hover, error focus and disabled/readonly precedence preserve independent System feedback', async () => {
  const page = await open(); await setAttrs(page, { style: 'Ares', primary: 'Purple', 'color-scheme': 'Dark', contrast: 'High' });
  await setMarkup(page, '<sp-input id="b" label="Email" error="Use a valid address" description="Work email"></sp-input>');
  await page.locator('#b').hover(); let got = await read(page);
  const assign = { style: 'Ares', 'semantic-color': 'Dark High Contrast', primary: 'Purple' };
  assert.ok(close(parseColor(got.border), expectedColor(source, 'component.field.border.error', assign)));
  await page.getByRole('textbox', { name: 'Email' }).focus(); got = await read(page);
  assert.ok(close(parseColor(got.border), expectedColor(source, 'component.field.border.error', assign)), 'focused error retains Danger');
  assert.equal(got.invalid, 'true'); assert.equal(got.ringWidth, '2px');
  assert.ok(close(parseColor(got.ring), expectedColor(source, 'semantic-color.color.system.focus', assign)));
  const first = got.ring; await setAttrs(page, { primary: 'Orange' }); assert.equal((await read(page)).ring, first);
  await page.locator('#b').evaluate(async el => { (el as any).disabled = true; await (el as any).updateComplete; }); got = await read(page);
  assert.ok(close(parseColor(got.border), expectedColor(source, 'semantic-color.color.foreground.disabled', assign)));
  await page.locator('#b').evaluate(async el => { (el as any).disabled = false; (el as any).error = ''; (el as any).readOnly = true; await (el as any).updateComplete; });
  await page.locator('#b').hover(); await page.locator('#b').focus(); assert.ok((await read(page)).focus);
  await page.emulateMedia({ forcedColors: 'active' }); assert.equal((await read(page)).ringWidth, '2px');
  await page.close();
});

test('slots and external labels/descriptions retain relationships, RTL order and narrow layout', async () => {
  const page = await open();
  await setMarkup(page, '<label id="external" for="b">Account</label><p id="help">Account help</p><div dir="rtl" style="width:220px"><sp-input id="b" aria-describedby="help"><svg slot="start" aria-hidden="true" viewBox="0 0 24 24"></svg><sp-icon-button slot="end" size="xs" label="Clear"></sp-icon-button></sp-input></div>');
  await page.getByRole('textbox', { name: 'Account' }).fill('Text');
  const refs = await page.getByRole('textbox', { name: 'Account' }).evaluate(el => ({ name: el.ariaLabelledByElements?.map(x => x.textContent?.trim()), help: el.ariaDescribedByElements?.map(x => x.textContent?.trim()) }));
  assert.deepEqual(refs, { name: ['Account'], help: ['Account help'] });
  const positions = await page.locator('#b').evaluate(el => { const start = el.querySelector('[slot=start]')!.getBoundingClientRect(), input = el.shadowRoot!.querySelector('input')!.getBoundingClientRect(), end = el.querySelector('[slot=end]')!.getBoundingClientRect(); return { start: start.x, input: input.x, end: end.x, width: el.getBoundingClientRect().width }; });
  assert.ok(positions.start > positions.input && positions.input > positions.end); assert.ok(positions.width <= 220);
  await page.getByRole('button', { name: 'Clear' }).focus(); assert.equal(await page.getByRole('button', { name: 'Clear' }).count(), 1);
  await setMarkup(page, '<sp-input id="b"><span slot="label">Slotted name</span><span slot="description">Slotted description</span><span slot="error">Inline error</span></sp-input>');
  await page.getByRole('textbox', { name: 'Slotted name' }).waitFor();
  assert.equal((await read(page)).invalid, 'true'); assert.match(await page.locator('#b').ariaSnapshot(), /Inline error/);
  await page.close();
});

test('Enter respects cancellation, composition and disabled default submitters', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><sp-input id="b" label="Title" name="title"></sp-input><sp-button id="go" type="submit" disabled>Save</sp-button></form>');
  await page.evaluate(() => { (window as any).submitted = 0; document.querySelector('#f')!.addEventListener('submit', e => { e.preventDefault(); (window as any).submitted++; }); });
  await page.getByRole('textbox', { name: 'Title' }).focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(20);
  assert.equal(await page.evaluate(() => (window as any).submitted), 0);
  await page.locator('#go').evaluate(async el => { (el as any).disabled = false; await (el as any).updateComplete; });
  await page.locator('#b').evaluate(el => el.addEventListener('keydown', e => e.preventDefault(), { once: true })); await page.keyboard.press('Enter');
  await page.waitForTimeout(20);
  assert.equal(await page.evaluate(() => (window as any).submitted), 0);
  await page.locator('#b input').dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await page.waitForTimeout(20);
  assert.equal(await page.evaluate(() => (window as any).submitted), 0);
  await page.keyboard.press('Enter'); await page.waitForFunction(() => (window as any).submitted === 1); assert.equal(await page.evaluate(() => (window as any).submitted), 1);
  await page.close();
});

test('an already-invalid field updates its inline message when its constraint changes', async () => {
  const page = await open();
  await setMarkup(page, '<sp-input id="b" label="Address" value="wrong" pattern="[0-9]+"></sp-input>');
  await page.locator('#b').evaluate(async el => { (el as any).reportValidity(); await (el as any).updateComplete; });
  const before = await page.locator('#b').evaluate(el => el.shadowRoot!.querySelector('#error')!.textContent!.trim());
  await page.locator('#b').evaluate(async el => { (el as any).type = 'email'; (el as any).pattern = undefined; await (el as any).updateComplete; });
  const after = await page.locator('#b').evaluate(el => ({ rendered: el.shadowRoot!.querySelector('#error')!.textContent!.trim(), native: el.shadowRoot!.querySelector('input')!.validationMessage }));
  assert.notEqual(after.native, before); assert.equal(after.rendered, after.native);
  await page.close();
});

test('reset synchronizes FormData before the next render, and inherited emphasis does not change field typography', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f" style="font-weight:700"><sp-input id="b" label="Title" name="title" value="Draft"></sp-input></form>');
  await page.getByRole('textbox', { name: 'Title' }).fill('Edited');
  const got = await page.evaluate(() => { const form = document.querySelector<HTMLFormElement>('#f')!, el = document.querySelector('sp-input')! as any; form.reset(); return { value: el.value, submitted: new FormData(form).get('title'), weight: getComputedStyle(el.shadowRoot.querySelector('input')).fontWeight }; });
  assert.equal(got.submitted, 'Draft', 'native reset and form value must agree synchronously');
  assert.equal(got.value, 'Draft'); assert.equal(got.weight, '400');
  await page.close();
});

test('clicking field padding focuses editing while a trailing action keeps its own focus', async () => {
  const page = await open();
  await setMarkup(page, '<sp-input id="b" label="Search"><svg slot="start" aria-hidden="true"></svg><sp-icon-button id="action" slot="end" size="xs" label="Clear"></sp-icon-button></sp-input>');
  await page.locator('#b .field').click({ position: { x: 2, y: 2 } });
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
  await page.getByRole('button', { name: 'Clear' }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'action');
  await page.close();
});

test('Enter chooses image submitters in tree order, including external and disabled defaults', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><sp-input id="b" label="Title" name="title"></sp-input><input id="image" type="image" name="image" aria-label="Image save"><button id="other" type="submit">Other</button></form>');
  await page.evaluate(() => { (window as any).submitted = []; document.querySelector('#f')!.addEventListener('submit', e => { e.preventDefault(); (window as any).submitted.push((e as SubmitEvent).submitter?.id); }); });
  await page.getByRole('textbox', { name: 'Title' }).focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).submitted.length === 1);
  assert.deepEqual(await page.evaluate(() => (window as any).submitted), ['image']);
  await page.evaluate(() => { document.querySelector<HTMLInputElement>('#image')!.disabled = true; (window as any).submitted = []; });
  await page.getByRole('textbox', { name: 'Title' }).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(20);
  assert.deepEqual(await page.evaluate(() => (window as any).submitted), []);
  await page.evaluate(() => { const image = document.querySelector<HTMLInputElement>('#image')!; image.disabled = false; image.setAttribute('form', 'f'); document.querySelector('#f')!.before(image); });
  await page.getByRole('textbox', { name: 'Title' }).focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => (window as any).submitted.length === 1);
  assert.deepEqual(await page.evaluate(() => (window as any).submitted), ['image']); await page.close();
});

test('Playground current value control updates displayed text after a user edit', async () => {
  const page = await browser.newPage();
  await page.goto(`${base}/?path=/story/components-input--playground`);
  await page.getByRole('tab', { name: /Controls/ }).click();
  const frame = page.frameLocator('#storybook-preview-iframe');
  await frame.getByRole('textbox', { name: 'Email', exact: true }).fill('Edited');
  await page.getByRole('row', { name: /^value string/ }).getByRole('textbox').fill('From controls');
  await page.waitForTimeout(100);
  assert.equal(await frame.locator('sp-input').evaluate(el => (el as any).value), 'From controls');
  await page.close();
});

test('Input theme composition fits a narrow viewport with visible messages and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.goto(`${base}/iframe.html?id=components-input--theme-contract&viewMode=story`);
  await page.waitForSelector('sp-input'); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.getByRole('textbox', { name: 'Email', exact: true }).count(), 1);
  await page.close();
});
