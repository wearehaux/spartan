import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { TokenSourceV2 } from '../lib/figma-tokens';
import type { Browser } from 'playwright-core';
import type { Server } from 'node:http';
import { close, expectedColor, launch, openCanvas, parseColor, setAttrs, setMarkup, startServer, themeAttrs } from './harness';
const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json', 'utf8'));
let browser: Browser, server: Server, base: string;
before(async () => { ({ server, base } = await startServer()); browser = await launch(); });
after(async () => { await browser?.close(); server?.close(); });
const open = async () => { const page = await openCanvas(browser, base); assert.ok(await page.evaluate(() => !!customElements.get('sp-radio-group')), 'production Radio Group is registered'); return page; };
const markup = '<button>Before</button><sp-radio-group id="g" label="Plan" name="plan"><sp-radio-group-item value="a" label="Basic"></sp-radio-group-item><sp-radio-group-item value="b" label="Unavailable" disabled></sp-radio-group-item><sp-radio-group-item value="c" label="Pro"></sp-radio-group-item></sp-radio-group><button>After</button>';
test('Radio Group owns single selection, one input/change pair and one Tab stop with wrapping arrows and Home/End', async () => {
  const page = await open(); await setMarkup(page, markup);
  await page.locator('#g').evaluate(el => { (el as any).events = []; for (const name of ['input', 'change']) el.addEventListener(name, () => (el as any).events.push(name)); });
  await page.getByRole('button', { name: 'Before' }).focus(); await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('radio', { name: 'Basic', exact: true }).evaluate(el => el.matches(':focus')), true);
  await page.keyboard.press('ArrowDown'); assert.equal(await page.getByRole('radio', { name: 'Pro', exact: true }).isChecked(), true);
  assert.equal(await page.locator('#g').evaluate(el => (el as any).value), 'c');
  assert.deepEqual(await page.locator('#g').evaluate(el => (el as any).events), ['input', 'change']);
  await page.keyboard.press('ArrowDown'); assert.equal(await page.getByRole('radio', { name: 'Basic', exact: true }).isChecked(), true);
  await page.keyboard.press('End'); assert.equal(await page.getByRole('radio', { name: 'Pro', exact: true }).isChecked(), true);
  await page.keyboard.press('Home'); assert.equal(await page.getByRole('radio', { name: 'Basic', exact: true }).isChecked(), true);
  await page.keyboard.press('Tab'); assert.equal(await page.getByRole('button', { name: 'After' }).evaluate(el => el.matches(':focus')), true);
  assert.equal(await page.getByRole('radio', { checked: true }).count(), 1); await page.close();
});

test('pointer and Space selection emit once, clicking selected emits nothing and canceled clicks do not change value', async () => {
  const page = await open(); await setMarkup(page, markup);
  await page.locator('#g').evaluate(el => { (el as any).events = []; for (const name of ['input', 'change']) el.addEventListener(name, () => (el as any).events.push(name)); });
  await page.getByText('Basic', { exact: true }).click(); await page.getByText('Basic', { exact: true }).click();
  assert.deepEqual(await page.locator('#g').evaluate(el => [(el as any).value, (el as any).events]), ['a', ['input', 'change']]);
  await page.getByRole('radio', { name: 'Pro', exact: true }).focus(); await page.keyboard.press('Space');
  assert.equal(await page.locator('#g').evaluate(el => (el as any).value), 'c');
  await page.locator('sp-radio-group-item[value=a]').evaluate(el => el.addEventListener('click', e => e.preventDefault()));
  await page.getByText('Basic', { exact: true }).click(); assert.equal(await page.locator('#g').evaluate(el => (el as any).value), 'c'); await page.close();
});

test('forms submit only the group, retain current/default values, reset and restore without synthetic editing events', async () => {
  const page = await open(); await setMarkup(page, '<form>'+markup.replace('id="g"', 'id="g" value="a"')+'<button type="reset">Reset</button></form>');
  const data = () => page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]);
  assert.deepEqual(await data(), [['plan', 'a']]); await page.getByRole('radio', { name: 'Pro', exact: true }).check(); assert.deepEqual(await data(), [['plan', 'c']]);
  assert.equal(await page.locator('#g').getAttribute('value'), 'a'); await page.getByRole('button', { name: 'Reset' }).click(); assert.deepEqual(await data(), [['plan', 'a']]);
  await page.locator('#g').evaluate(async el => { (el as any).value = 'c'; el.setAttribute('value', 'a'); await (el as any).updateComplete; }); assert.deepEqual(await data(), [['plan', 'c']]);
  await page.locator('#g').evaluate(async el => { (el as any).formStateRestoreCallback('a'); await (el as any).updateComplete; }); assert.deepEqual(await data(), [['plan', 'a']]);
  await page.close();
});

test('required/custom errors and disabled fieldsets own validation and value eligibility', async () => {
  const page = await open(); await setMarkup(page, '<form><fieldset>'+markup.replace('id="g"', 'id="g" required')+'</fieldset><button>Send</button></form>');
  assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), false);
  await page.getByRole('radio', { name: 'Basic', exact: true }).check(); assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), true);
  await page.locator('#g').evaluate(el => (el as any).setCustomValidity('Review plan')); assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), false);
  await page.locator('fieldset').evaluate(el => (el as HTMLFieldSetElement).disabled = true); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('radio', { name: 'Basic', exact: true }).isDisabled(), true); assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), true);
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), []);
  await page.locator('fieldset').evaluate(el => (el as HTMLFieldSetElement).disabled = false); await page.waitForTimeout(30);
  assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), false); await page.locator('#g').evaluate(el => (el as any).setCustomValidity('')); assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), true);
  await page.close();
});

test('horizontal RTL navigation follows visual order and skips hidden/disabled options', async () => {
  const page = await open(); await setMarkup(page, markup.replace('id="g"', 'id="g" orientation="horizontal" dir="rtl"'));
  await page.getByRole('radio', { name: 'Basic', exact: true }).focus(); await page.keyboard.press('ArrowLeft'); assert.equal(await page.getByRole('radio', { name: 'Pro', exact: true }).isChecked(), true);
  await page.keyboard.press('ArrowRight'); assert.equal(await page.getByRole('radio', { name: 'Basic', exact: true }).isChecked(), true);
  await page.locator('[value=c]').evaluate(el => (el as HTMLElement).hidden = true); await page.waitForTimeout(30); await page.keyboard.press('End'); assert.equal(await page.locator('#g').evaluate(el => (el as any).value), 'a'); await page.close();
});

test('dynamic options, independent/nested groups, duplicate values and programmatic changes remain coherent', async () => {
  const page = await open(); await setMarkup(page, '<form>'+markup+'<sp-radio-group id="other" name="other" label="Other"><sp-radio-group-item label="Other A" value="a"></sp-radio-group-item></sp-radio-group></form>');
  await page.getByRole('radio', { name: 'Basic', exact: true }).check(); await page.getByRole('radio', { name: 'Other A', exact: true }).check(); assert.equal(await page.getByRole('radio', { checked: true }).count(), 2);
  await page.locator('#g').evaluate(async el => { (el as any).value = 'c'; await (el as any).updateComplete; }); assert.equal(await page.getByRole('radio', { name: 'Pro', exact: true }).isChecked(), true);
  await page.locator('#g [value=c]').evaluate(el => el.remove()); await page.waitForTimeout(30); assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), [['other', 'a']]);
  await page.locator('#g').evaluate(el => el.insertAdjacentHTML('beforeend', '<sp-radio-group-item value="c" label="New Pro"></sp-radio-group-item>')); await page.waitForTimeout(30); assert.equal(await page.getByRole('radio', { name: 'New Pro' }).isChecked(), true);
  await page.locator('#g').evaluate(el => el.insertAdjacentHTML('beforeend', '<sp-radio-group-item value="a" label="Duplicate"></sp-radio-group-item>')); await page.waitForTimeout(30); assert.equal(await page.getByRole('radio', { name: 'Duplicate' }).isDisabled(), true); assert.equal(await page.locator('#g').evaluate(el => (el as any).checkValidity()), false);
  await page.close();
});

test('group and item slots/labels/descriptions produce correct accessible names and errors', async () => {
  const page = await open(); await setMarkup(page, '<span id="title">External plans</span><sp-radio-group id="g" labelled-by="title" error="Choose a plan"><sp-radio-group-item value="a"><span slot="label">Slotted Basic</span><span slot="description">Item hint</span></sp-radio-group-item><sp-radio-group-item value="c">Default slot</sp-radio-group-item><span slot="description">Group hint</span></sp-radio-group>');
  assert.equal(await page.getByRole('radiogroup', { name: 'External plans' }).count(), 1); assert.equal(await page.getByRole('radio', { name: 'Slotted Basic' }).count(), 1); assert.equal(await page.getByRole('radio', { name: 'Default slot' }).count(), 1);
  await page.locator('#title').evaluate(el => el.textContent = 'Updated plans'); await page.waitForTimeout(30); assert.equal(await page.getByRole('radiogroup', { name: 'Updated plans' }).count(), 1);
  const cdp = await page.context().newCDPSession(page); const tree = await cdp.send('Accessibility.getFullAXTree'); const radio = tree.nodes.find(n => n.role?.value === 'radio' && n.name?.value === 'Slotted Basic'); assert.match(radio?.description?.value ?? '', /Item hint/); assert.match(radio?.description?.value ?? '', /Choose a plan/);
  await page.close();
});

test('slotted group labels override fallback text and hide decorative text from the accessible name', async () => {
  const page = await open(); await setMarkup(page, '<sp-radio-group label="Fallback"><span slot="label">Actual plans<span aria-hidden="true">Decoration</span></span><sp-radio-group-item value="a" label="Basic"></sp-radio-group-item></sp-radio-group>');
  assert.equal(await page.getByRole('radiogroup', { name:'Actual plans',exact:true }).count(),1); await page.close();
});

test('all 128 themes keep circular 20px radio/44px targets, 8px dots and independent System colors', async () => {
  const page = await open(); await setMarkup(page, markup.replace('id="g"', 'id="g" value="a"'));
  for (const style of ['Atlas', 'Selene', 'Helios', 'Ares']) for (const theme of ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast']) for (const primary of ['Blue', 'Purple', 'Orange', 'Sky']) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, primary, density, ...themeAttrs(theme) });
    const v = await page.locator('sp-radio-group-item[value=a]').evaluate(el => { const box = el.shadowRoot!.querySelector('.box')!, dot = el.shadowRoot!.querySelector('.dot')!, target = el.shadowRoot!.querySelector('.target')!, label = el.shadowRoot!.querySelector('.label')!; return { size: box.getBoundingClientRect().width, radius: getComputedStyle(box).borderRadius, fill: getComputedStyle(box).backgroundColor, dot: dot.getBoundingClientRect().width, color: getComputedStyle(dot).backgroundColor, target: target.getBoundingClientRect().width, font: getComputedStyle(label).fontSize }; });
    assert.equal(v.size, 20); assert.equal(v.target, 44); assert.equal(v.dot, 8); assert.equal(v.radius, '9999px'); assert.equal(v.font, density === 'Relaxed' ? '15px' : '14px');
    const assign = { style, primary, density, 'semantic-color': theme }; assert.ok(close(parseColor(v.fill), expectedColor(source, 'semantic-color.color.system.control.default', assign))); assert.ok(close(parseColor(v.color), expectedColor(source, 'semantic-color.color.system.control.foreground', assign)));
  }
  await page.close();
});

test('boxed/end placement responds to Style, error focus remains Danger/System, disabled overrides and forced colors retains dots', async () => {
  const page = await open(); await setMarkup(page, markup.replace('id="g"', 'id="g" value="a" invalid').replace('value="a" label', 'value="a" appearance="boxed" placement="end" label'));
  await page.getByRole('button', { name: 'Before' }).focus(); await page.keyboard.press('Tab');
  const read = () => page.locator('sp-radio-group-item[value=a]').evaluate(el => { const box = el.shadowRoot!.querySelector('.box')!, row = el.shadowRoot!.querySelector('.row')!, ring = getComputedStyle(box, '::after'); return { border: getComputedStyle(box).borderColor, fill: getComputedStyle(box).backgroundColor, ring: ring.borderColor, ringWidth: ring.borderTopWidth, rowRadius: getComputedStyle(row).borderRadius, order: getComputedStyle(el.shadowRoot!.querySelector('.target')!).order }; });
  const s = await read(); assert.ok(close(parseColor(s.border), expectedColor(source, 'semantic-color.color.danger.default', {}))); assert.ok(close(parseColor(s.ring), expectedColor(source, 'semantic-color.color.system.focus', {}))); assert.equal(s.ringWidth, '2px'); assert.equal(s.order, '1');
  for (const [style, radius] of [['Atlas','8px'],['Selene','12px'],['Helios','16px'],['Ares','0px']]) { await setAttrs(page, { style }); assert.equal((await read()).rowRadius, radius); }
  await page.locator('#g').evaluate(async el => { (el as any).disabled = true; await (el as any).updateComplete; }); assert.ok(close(parseColor((await read()).fill), expectedColor(source, 'semantic-color.color.surface.disabled', {})));
  await page.locator('#g').evaluate(async el => { (el as any).disabled = false; await (el as any).updateComplete; }); await page.emulateMedia({ forcedColors: 'active' }); const f = await page.locator('sp-radio-group-item[value=a]').evaluate(el => [getComputedStyle(el.shadowRoot!.querySelector('.box')!).backgroundColor,getComputedStyle(el.shadowRoot!.querySelector('.dot')!).backgroundColor]); assert.notEqual(f[0], f[1]); await page.close();
});

test('narrow RTL boxed descriptions wrap and native click guards immediate disabled changes', async () => {
  const page = await open();
  for (const width of [320,390]) { await page.setViewportSize({ width, height:600 }); await setMarkup(page, '<sp-radio-group id="g" label="Plan" dir="rtl"><sp-radio-group-item id="a" value="a" appearance="boxed" placement="end" label="A long label that should wrap inside this narrow container" description="Supporting text also wraps without shrinking the target"></sp-radio-group-item></sp-radio-group>'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
  await page.locator('#g').evaluate(el => { (el as any).disabled = true; (el.querySelector('sp-radio-group-item') as HTMLElement).click(); }); assert.equal(await page.locator('#g').evaluate(el => (el as any).value), ''); await page.close();
});

test('hidden option wrappers and hidden group ancestors preserve a usable Tab stop on reveal', async () => {
  const page = await open(); await setMarkup(page, '<button>Before</button><section id="shell"><sp-radio-group id="g" label="Plans"><div hidden><sp-radio-group-item value="a" label="Hidden"></sp-radio-group-item></div><sp-radio-group-item value="b" label="Visible"></sp-radio-group-item></sp-radio-group></section><button>After</button>');
  await page.getByRole('button',{name:'Before'}).focus();await page.keyboard.press('Tab');assert.equal(await page.getByRole('radio',{name:'Visible',exact:true}).evaluate(el=>el.matches(':focus')),true);
  await page.locator('#shell').evaluate(el=>(el as HTMLElement).hidden=true);await page.waitForTimeout(30);await page.locator('#shell').evaluate(el=>(el as HTMLElement).hidden=false);await page.waitForTimeout(30);
  await page.getByRole('button',{name:'Before'}).focus();await page.keyboard.press('Tab');assert.equal(await page.getByRole('radio',{name:'Visible',exact:true}).evaluate(el=>el.matches(':focus')),true);await page.close();
});

test('an external group label focuses the first enabled item without selecting it', async () => {
  const page=await open();await setMarkup(page,'<label for="g">Plans</label>'+markup);await page.getByText('Plans',{exact:true}).click();await page.waitForTimeout(30);
  assert.equal(await page.getByRole('radio',{name:'Basic',exact:true}).evaluate(el=>el.matches(':focus')),true);assert.equal(await page.locator('#g').evaluate(el=>(el as any).value),'');await page.close();
});

test('inert option wrappers are skipped and become navigable when inert is removed', async () => {
  const page=await open();await setMarkup(page,'<button>Before</button><sp-radio-group id="g" label="Plans"><div id="inert" inert><sp-radio-group-item value="a" label="Inert choice"></sp-radio-group-item></div><sp-radio-group-item value="b" label="Visible choice"></sp-radio-group-item></sp-radio-group><button>After</button>');
  await page.getByRole('button',{name:'Before'}).focus();await page.keyboard.press('Tab');assert.equal(await page.getByRole('radio',{name:'Visible choice'}).evaluate(el=>el.matches(':focus')),true);
  await page.locator('#inert').evaluate(el=>(el as HTMLElement).inert=false);await page.waitForTimeout(30);await page.keyboard.press('Home');assert.equal(await page.getByRole('radio',{name:'Inert choice'}).isChecked(),true);await page.close();
});

test('selection and changing group messages render repeatedly without unhandled browser errors', async () => {
  const page=await open();const errors:string[]=[];page.on('pageerror',event=>errors.push(event.message));await setMarkup(page,markup.replace('id="g"','id="g" error="Review"'));
  await page.getByRole('radio',{name:'Basic',exact:true}).check();await page.waitForTimeout(30);await page.getByRole('radio',{name:'Pro',exact:true}).check();
  await page.locator('#g').evaluate(async el=>{(el as any).error='Updated message';(el as any).value='a';await (el as any).updateComplete;});await page.waitForTimeout(30);
  assert.deepEqual(errors,[]);assert.equal(await page.getByRole('radio',{name:'Basic',exact:true}).isChecked(),true);await page.close();
});

test('forced-color invalid and disabled boundaries use platform colors rather than semantic paint', async()=>{
  const page=await open();await page.emulateMedia({forcedColors:'active'});await setMarkup(page,markup.replace('id="g"','id="g" invalid'));
  const colors=await page.evaluate(()=>{const el=document.createElement('span');document.body.append(el);el.style.color='CanvasText';const normal=getComputedStyle(el).color;el.style.color='GrayText';const disabled=getComputedStyle(el).color;el.remove();return{normal,disabled};});
  const border=(value:string)=>page.locator(`sp-radio-group-item[value=${value}]`).evaluate(el=>getComputedStyle(el.shadowRoot!.querySelector('.box')!).borderColor);
  assert.equal(await border('a'),colors.normal);assert.equal(await border('b'),colors.disabled);await page.close();
});
