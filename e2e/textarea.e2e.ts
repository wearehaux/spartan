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
const open = async () => { const page = await openCanvas(browser, base); assert.ok(await page.evaluate(() => !!customElements.get('sp-textarea')), 'production package must register Textarea'); return page; };
const read = (page: Page) => page.locator('#b').evaluate(el => {
  const field = el.shadowRoot!.querySelector('.field')!, input = el.shadowRoot!.querySelector('textarea')!, cs = getComputedStyle(field), ring = getComputedStyle(field, '::after');
  return { height: field.getBoundingClientRect().height, nativeHeight: input.getBoundingClientRect().height, font: getComputedStyle(input).fontSize, line: getComputedStyle(input).lineHeight, weight: getComputedStyle(input).fontWeight, fill: cs.backgroundColor, border: cs.borderBottomColor, bottom: cs.borderBottomWidth, radius: cs.borderRadius, shadow: cs.boxShadow, ring: ring.borderColor, ringWidth: ring.borderTopWidth, ringRadius: ring.borderRadius, invalid: input.getAttribute('aria-invalid'), value: input.value, disabled: input.disabled, readonly: input.readOnly, resize: getComputedStyle(input).resize, scrollHeight: input.scrollHeight, clientHeight: input.clientHeight, focus: input.matches(':focus-visible') };
});

test('Textarea keeps native multiline editing, caret and input/change semantics; Enter never submits', async () => {
  const page = await open();
  await setMarkup(page, '<form id="f"><sp-textarea id="b" label="Message" name="message" description="Describe the problem"></sp-textarea><sp-button type="submit">Send</sp-button></form>');
  await page.evaluate(() => { (window as any).counts = { input: 0, change: 0, submit: 0 }; const el = document.querySelector('#b')!; for (const type of ['input', 'change']) el.addEventListener(type, () => (window as any).counts[type]++); document.querySelector('#f')!.addEventListener('submit', e => { e.preventDefault(); (window as any).counts.submit++; }); });
  await page.getByText('Message', { exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Hello'); await input.press('Enter'); await input.press('x'); await input.press('ArrowLeft'); await input.press('y'); await input.press('Tab');
  assert.equal((await read(page)).value, 'Hello\nyx');
  assert.deepEqual(await page.evaluate(() => (window as any).counts), { input: 4, change: 1, submit: 0 });
  assert.equal(await page.locator('#b').evaluate(el => (el as any).value), 'Hello\nyx');
  await page.close();
});

test('Textarea submits current multiline values and synchronously resets to the reset default', async () => {
  const page = await open(); await setMarkup(page, '<form id="f"><sp-textarea id="b" label="Message" name="message" value="Draft"></sp-textarea></form>');
  await page.getByRole('textbox', { name: 'Message' }).fill('First\nSecond');
  assert.equal(await page.evaluate(() => new FormData(document.querySelector<HTMLFormElement>('#f')!).get('message')), 'First\nSecond');
  await page.locator('#b').evaluate(async el => { (el as any).value = 'Current'; el.setAttribute('value', 'New default'); await (el as any).updateComplete; });
  assert.equal((await read(page)).value, 'Current');
  const reset = await page.evaluate(() => { const el = document.querySelector('#b')! as any, form = document.querySelector<HTMLFormElement>('#f')!; form.reset(); return [el.value, new FormData(form).get('message')]; });
  assert.deepEqual(reset, ['New default', 'New default']);
  await page.locator('#b').evaluate(async el => { (el as any).formStateRestoreCallback('Restored\nstate'); await (el as any).updateComplete; });
  assert.equal((await read(page)).value, 'Restored\nstate'); assert.equal(await page.locator('#b').getAttribute('value'), 'New default'); await page.close();
});

test('Textarea native validation and error content block forms, while readonly and fieldset disability retain native behavior', async () => {
  const page = await open(); await setMarkup(page, '<form id="f"><fieldset id="group"><sp-textarea id="b" label="Message" name="message" required minlength="5" maxlength="10"></sp-textarea></fieldset><sp-button type="submit">Send</sp-button></form>');
  await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.locator('#b').evaluate(el => (el as any).validity.valueMissing), true); assert.equal(await page.evaluate(() => document.activeElement?.id), 'b');
  await page.getByRole('textbox', { name: 'Message' }).fill('ab'); assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), false);
  await page.getByRole('textbox', { name: 'Message' }).fill('abcdef'); assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), true);
  await page.locator('#b').evaluate(async el => { (el as any).setCustomValidity('Try again'); await (el as any).updateComplete; }); assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), false);
  await page.locator('#b').evaluate(async el => { (el as any).setCustomValidity(''); (el as any).readOnly = true; await (el as any).updateComplete; });
  await page.locator('#b').focus(); await page.keyboard.type('ignored'); assert.equal((await read(page)).value, 'abcdef'); assert.equal(await page.locator('#b').evaluate(el => (el as any).willValidate), false);
  await page.locator('#b').evaluate(async el => { document.querySelector<HTMLFieldSetElement>('#group')!.disabled = true; await (el as any).updateComplete; }); assert.equal((await read(page)).disabled, true); assert.deepEqual(await page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#f')!)]), []);
  await page.locator('#b').evaluate(async el => { document.querySelector<HTMLFieldSetElement>('#group')!.disabled = false; (el as any).readOnly = false; await (el as any).updateComplete; (el as HTMLElement).focus(); }); assert.equal(await page.evaluate(() => document.activeElement?.id), 'b'); await page.close();
});

test('Textarea consumes multiline Field roles in all 128 themes, three appearances and both sizes', async () => {
  const page = await open(); await setMarkup(page, '<div style="width:360px;font-weight:700"><sp-textarea id="b" label="Message" placeholder="Write a message"></sp-textarea></div>'); let count = 0;
  for (const style of ['Atlas', 'Selene', 'Helios', 'Ares']) for (const theme of ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast']) for (const hue of ['Blue', 'Purple', 'Orange', 'Sky']) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, ...themeAttrs(theme), primary: hue, density }); const assign = { style, 'semantic-color': theme, primary: hue, density };
    for (const appearance of ['default', 'outlined', 'filled']) for (const size of ['sm', 'base']) {
      await page.locator('#b').evaluate(async (el, props) => { Object.assign(el, props); await (el as any).updateComplete; }, { appearance, size }); const got = await read(page);
      const expectedHeight = style === 'Helios' && theme.includes('High Contrast') && density === 'Relaxed' && appearance === 'default' && size === 'base' ? 74 : 72;
      assert.equal(got.height, expectedHeight, `${style} / ${theme} / ${hue} / ${density} / ${appearance} / ${size}: ${JSON.stringify(got)}`); assert.equal(got.font, size === 'sm' ? density === 'Relaxed' ? '14px' : '13px' : density === 'Relaxed' ? '15px' : '14px'); assert.equal(got.weight, '400');
      assert.equal(got.radius, `${resolveToken(source, 'component.field.multiline.radius', assign)}px`);
      const fill = appearance === 'default' ? 'component.field.background.default' : `style.style.field.${appearance}.background`;
      assert.ok(close(parseColor(got.fill), expectedColor(source, fill, assign))); if (theme.includes('High Contrast')) assert.ok(parseFloat(got.bottom) >= 2); if (style === 'Helios') assert.notEqual(got.shadow, 'none');
      count++;
    }
  }
  assert.equal(count, 768); await page.close();
});

test('Textarea error focus keeps Danger and an independent bounded System ring; disabled styling wins', async () => {
  const page = await open(); await setAttrs(page, { style: 'Helios', primary: 'Purple', 'color-scheme': 'Dark', contrast: 'High' });
  await setMarkup(page, '<sp-textarea id="b" label="Message" error="Explain the problem"></sp-textarea>'); await page.locator('#b').hover(); await page.getByRole('textbox', { name: 'Message' }).focus(); let got = await read(page);
  const assign = { style: 'Helios', 'semantic-color': 'Dark High Contrast', primary: 'Purple' };
  assert.ok(close(parseColor(got.border), expectedColor(source, 'component.field.border.error', assign))); assert.equal(got.invalid, 'true'); assert.equal(got.ringWidth, '2px'); assert.equal(got.ringRadius, '20px');
  assert.ok(close(parseColor(got.ring), expectedColor(source, 'semantic-color.color.system.focus', assign)));
  await setAttrs(page, { primary: 'Orange' }); assert.equal((await read(page)).ring, got.ring);
  await page.locator('#b').evaluate(async el => { (el as any).disabled = true; await (el as any).updateComplete; }); got = await read(page); assert.ok(close(parseColor(got.border), expectedColor(source, 'semantic-color.color.foreground.disabled', assign)));
  await page.locator('#b').evaluate(async el => { (el as any).disabled = false; await (el as any).updateComplete; }); await page.locator('#b').focus(); await page.emulateMedia({ forcedColors: 'active' }); assert.equal((await read(page)).ringWidth, '2px'); await page.close();
});

test('Textarea label/message slots and external accessible references work in narrow RTL composition', async () => {
  const page = await open(); await setMarkup(page, '<label id="external" for="b">Feedback</label><p id="help">Tell us more</p><div dir="rtl" style="width:220px"><sp-textarea id="b" aria-describedby="help"></sp-textarea></div>');
  await page.getByRole('textbox', { name: 'Feedback' }).fill('مرحبا');
  assert.equal(await page.locator('#b').evaluate(el => getComputedStyle(el.shadowRoot!.querySelector('textarea')!).direction), 'rtl');
  assert.ok(await page.locator('#b').evaluate(el => el.getBoundingClientRect().width <= 220));
  await page.locator('#external').evaluate(el => el.textContent = 'Updated feedback'); await page.getByRole('textbox', { name: 'Updated feedback' }).waitFor();
  const refs = await page.getByRole('textbox', { name: 'Updated feedback' }).evaluate(el => el.ariaDescribedByElements?.map(x => x.textContent?.trim())); assert.deepEqual(refs, ['Tell us more']);
  await setMarkup(page, '<sp-textarea id="b"><span slot="label">Slotted label</span><span slot="description">Help content</span><span slot="error">Fix this message</span></sp-textarea>');
  await page.getByRole('textbox', { name: 'Slotted label' }).waitFor(); assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), false); assert.match(await page.locator('#b').ariaSnapshot(), /Fix this message/); await page.close();
});

test('Textarea selection replacement updates value and FormData without synthesizing editing events', async () => {
  const page = await open(); await setMarkup(page, '<form id="f"><sp-textarea id="b" label="Message" name="message" value="Hello world"></sp-textarea></form>');
  const got = await page.locator('#b').evaluate(el => { const field = el as any; let events = 0; field.addEventListener('input', () => events++); field.addEventListener('change', () => events++); field.setSelectionRange(6, 11); field.setRangeText('Spartan'); return { value: field.value, submitted: new FormData(document.querySelector<HTMLFormElement>('#f')!).get('message'), events }; });
  assert.deepEqual(got, { value: 'Hello Spartan', submitted: 'Hello Spartan', events: 0 }); await page.close();
});

test('Textarea autogrow follows editing, shorter values, reset, width changes and inherited Density', async () => {
  const page = await open(); await setMarkup(page, '<form id="f" style="width:360px"><sp-textarea id="b" label="Message" name="message" autogrow></sp-textarea></form>');
  const short = await read(page); assert.equal(short.height, 72); assert.equal(short.resize, 'none');
  await page.getByRole('textbox', { name: 'Message' }).fill('Line one\nLine two\nLine three\nLine four\nLine five\nLine six'); const tall = await read(page); assert.ok(tall.height > short.height); assert.ok(tall.clientHeight >= tall.scrollHeight);
  await page.locator('#b').evaluate(async el => { (el as any).value = 'A long message that wraps repeatedly when the containing element becomes narrow. '.repeat(5); await (el as any).updateComplete; }); const wide = await read(page);
  await page.locator('#f').evaluate(el => (el as HTMLElement).style.width = '180px'); await page.waitForFunction(() => { const el = document.querySelector('#b')!, area = el.shadowRoot!.querySelector('textarea')!; return area.clientHeight >= area.scrollHeight; }); const narrow = await read(page); assert.ok(narrow.height > wide.height);
  await setAttrs(page, { density: 'Compact' }); await page.waitForTimeout(50); const compact = await read(page); assert.ok(compact.clientHeight >= compact.scrollHeight); assert.equal(compact.font, '14px');
  await page.locator('#b').evaluate(async el => { (el as any).value = 'Short'; await (el as any).updateComplete; }); assert.equal((await read(page)).height, 72);
  await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.reset()); assert.equal((await read(page)).value, ''); assert.equal((await read(page)).height, 72); await page.close();
});

test('Textarea native vertical resize remains available and survives editing; resize none disables the grip', async () => {
  const page = await open(); await setMarkup(page, '<sp-textarea id="b" label="Message"></sp-textarea>'); assert.equal((await read(page)).resize, 'vertical');
  const area = page.getByRole('textbox', { name: 'Message' }), box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width - 3, box.y + box.height - 3); await page.mouse.down(); await page.mouse.move(box.x + box.width - 3, box.y + box.height + 80, { steps: 8 }); await page.mouse.up();
  const resized = await read(page); assert.ok(resized.height > 100);
  await area.fill('Edited'); assert.equal((await read(page)).height, resized.height);
  await page.locator('#b').evaluate(async el => { (el as any).resize = 'none'; await (el as any).updateComplete; }); assert.equal((await read(page)).resize, 'none'); await page.close();
});

test('Textarea autogrow respects preferred rows and a product maximum with scrollable overflow', async () => {
  const page = await open(); await setMarkup(page, '<style>sp-textarea::part(textarea){max-block-size:100px}</style><sp-textarea id="b" label="Message" rows="4" autogrow></sp-textarea>');
  const four = await read(page); assert.ok(four.height > 100);
  await page.getByRole('textbox', { name: 'Message' }).fill('One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight\nNine'); const capped = await read(page); assert.equal(capped.nativeHeight, 100); assert.ok(capped.scrollHeight > capped.clientHeight);
  await page.locator('#b').evaluate(async el => { (el as any).rows = 2; (el as any).value = ''; await (el as any).updateComplete; }); assert.equal((await read(page)).height, 72); await page.close();
});

test('Textarea autogrow measures hidden content on reveal and reconnect and returns to native resize when disabled', async () => {
  const page = await open(); await setMarkup(page, '<div id="container" style="display:none;width:220px"><sp-textarea id="b" label="Message" value="Long text that wraps when the hidden field becomes visible. Long text that wraps when the hidden field becomes visible. Long text that wraps when the hidden field becomes visible." autogrow></sp-textarea></div>');
  await page.locator('#container').evaluate(el => (el as HTMLElement).style.display = 'block'); await page.waitForFunction(() => { const el = document.querySelector('#b')!, area = el.shadowRoot!.querySelector('textarea')!; return area.clientHeight >= area.scrollHeight; }); assert.ok((await read(page)).height > 72);
  await page.locator('#b').evaluate(async el => { el.remove(); document.querySelector('#container')!.append(el); (el as any).value = 'Short'; await (el as any).updateComplete; }); assert.equal((await read(page)).height, 72);
  await page.locator('#b').evaluate(async el => { (el as any).autoGrow = false; await (el as any).updateComplete; }); assert.equal((await read(page)).resize, 'vertical');
  const noGrow = (await read(page)).height; await page.getByRole('textbox', { name: 'Message' }).fill('One\nTwo\nThree\nFour\nFive\nSix'); assert.equal((await read(page)).height, noGrow); await page.close();
});

test('Textarea sanitizes fractional and invalid row values without collapsing its minimum', async () => {
  const page = await open(); await setMarkup(page, '<sp-textarea id="b" label="Message"></sp-textarea>');
  await page.locator('#b').evaluate(async el => { (el as any).rows = 0.5; await (el as any).updateComplete; }); assert.equal(await page.locator('#b').evaluate(el => el.shadowRoot!.querySelector('textarea')!.rows), 1); assert.equal((await read(page)).height, 72);
  await page.locator('#b').evaluate(async el => { (el as any).rows = 0; await (el as any).updateComplete; }); assert.equal(await page.locator('#b').evaluate(el => el.shadowRoot!.querySelector('textarea')!.rows), 2); await page.close();
});

test('Textarea Playground controls update the current value and row preference after editing', async () => {
  const page = await browser.newPage(); await page.goto(`${base}/?path=/story/components-textarea--playground`);
  await page.getByRole('tab', { name: /Controls/ }).click(); const frame = page.frameLocator('#storybook-preview-iframe');
  await frame.getByRole('textbox', { name: 'Message', exact: true }).fill('Edited');
  await page.getByRole('row', { name: /^value string/ }).getByRole('textbox').fill('From controls'); await page.waitForTimeout(100);
  assert.equal(await frame.locator('sp-textarea').evaluate(el => (el as any).value), 'From controls');
  await page.getByRole('row', { name: /^rows number/ }).getByRole('spinbutton').fill('4'); await page.waitForTimeout(100);
  assert.equal(await frame.locator('sp-textarea').evaluate(el => el.shadowRoot!.querySelector('textarea')!.rows), 4); await page.close();
});

test('Textarea theme fixture reflows at 320px and 390px with visible labels and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.goto(`${base}/iframe.html?id=components-textarea--theme-contract&viewMode=story`); await page.waitForSelector('sp-textarea'); await page.keyboard.press('Tab');
  for (const width of [390, 320]) { await page.setViewportSize({ width, height: 700 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assert.equal(await page.getByRole('textbox', { name: 'Message', exact: true }).count(), 1); }
  await page.close();
});
