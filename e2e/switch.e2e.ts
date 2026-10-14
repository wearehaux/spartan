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
  assert.ok(await page.evaluate(() => !!customElements.get('sp-switch')), 'production Switch is registered');
  return page;
};


test('required/custom validity blocks submit and disabled fieldsets exclude values without losing checked state', async () => {
  const page = await open();
  await setMarkup(page, '<form><fieldset><sp-switch id="b" label="Required terms" name="terms" required></sp-switch></fieldset><button>Send</button></form>');
  await page.evaluate(() => { (window as any).sent = 0; document.querySelector('form')!.addEventListener('submit', e => { e.preventDefault(); (window as any).sent++; }); });
  await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.evaluate(() => (window as any).sent), 0);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).validity.valueMissing), true);
  await page.getByRole('switch', { name: 'Required terms' }).check(); await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.evaluate(() => (window as any).sent), 1);
  await page.locator('#b').evaluate(el => (el as any).setCustomValidity('Review this choice')); await page.getByRole('button', { name: 'Send' }).click(); assert.equal(await page.evaluate(() => (window as any).sent), 1);
  await page.locator('#b').evaluate(el => (el as any).setCustomValidity(''));
  await page.locator('fieldset').evaluate(el => (el as HTMLFieldSetElement).disabled = true);
  await page.waitForFunction(() => document.querySelector('sp-switch')!.shadowRoot!.querySelector('input')!.disabled);
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), []);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checked), true);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).checkValidity()), true);
  await page.locator('fieldset').evaluate(el => (el as HTMLFieldSetElement).disabled = false);
  await page.waitForFunction(() => !document.querySelector('sp-switch')!.shadowRoot!.querySelector('input')!.disabled);
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), [['terms', 'on']]);
  await page.close();
});

test('programmatic properties update forms without events and dirty checked state survives default changes', async () => {
  const page = await open(); await setMarkup(page, '<form><sp-switch id="b" label="Choice" name="choice"></sp-switch></form>');
  await page.locator('#b').evaluate(async el => { (el as any).events = 0; el.addEventListener('change', () => (el as any).events++); (el as any).checked = true; (el as any).value = 'yes'; await (el as any).updateComplete; });
  assert.deepEqual(await page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]), [['choice', 'yes']]);
  assert.equal(await page.locator('#b').evaluate(el => (el as any).events), 0);
  await page.locator('#b').evaluate(async el => { (el as any).checked = false; el.setAttribute('checked', ''); await (el as any).updateComplete; });
  assert.equal(await page.getByRole('switch', { name: 'Choice' }).isChecked(), false);
  await page.locator('form').evaluate(el => (el as HTMLFormElement).reset()); assert.equal(await page.getByRole('switch', { name: 'Choice' }).isChecked(), true);
  await page.close();
});

test('slotted and external labels/descriptions stay accessible and external label clicks activate exactly once', async () => {
  const page = await open();
  await setMarkup(page, '<sp-switch id="b"><span slot="label">Slotted label</span><span slot="description">Supporting text</span></sp-switch><label for="x" id="l">External label</label><p id="d">External hint</p><sp-switch id="x" described-by="d"></sp-switch>');
  assert.equal(await page.getByRole('switch', { name: 'Slotted label' }).count(), 1);
  await page.getByText('External label', { exact: true }).click(); await page.waitForFunction(() => (document.querySelector('#x') as any).checked);
  assert.equal(await page.getByRole('switch', { name: 'External label' }).isChecked(), true);
  await page.locator('#l').evaluate(el => el.textContent = 'Renamed label'); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('switch', { name: 'Renamed label' }).count(), 1);
  await page.locator('#b [slot=label]').evaluate(el => el.textContent = 'Updated slot'); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('switch', { name: 'Updated slot' }).count(), 1);
  const cdp = await page.context().newCDPSession(page); const tree = await cdp.send('Accessibility.getFullAXTree');
  const ax = tree.nodes.find(n => n.role?.value === 'switch' && n.name?.value === 'Renamed label'); assert.equal(ax?.description?.value, 'External hint');
  await page.close();
});

test('canceling an external label click after the internal listener prevents activation and editing events', async () => {
  const page = await open(); await setMarkup(page, '<label for="b">External choice</label><sp-switch id="b"></sp-switch>');
  await page.locator('#b').evaluate(el => { (el as any).events = []; for (const name of ['input', 'change']) el.addEventListener(name, () => (el as any).events.push(name)); el.addEventListener('click', e => e.preventDefault()); });
  await page.getByText('External choice', { exact: true }).click(); await page.waitForTimeout(30);
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).events]), [false, []]);
  await page.close();
});

test('host click blocks synchronously disabled state before the next reactive render', async () => {
  const page = await open(); await setMarkup(page, '<sp-switch id="b" label="Choice"></sp-switch>');
  const state = await page.locator('#b').evaluate(el => { let events = 0; el.addEventListener('input', () => events++); (el as any).disabled = true; (el as HTMLElement).click(); return [(el as any).checked, events]; });
  assert.deepEqual(state, [false, 0]); await page.close();
});

test('defaultChecked property reflects the reset attribute while preserving dirty current state', async () => {
  const page = await open(); await setMarkup(page, '<form><sp-switch id="b" label="Choice"></sp-switch></form>');
  await page.locator('#b').evaluate(async el => { (el as any).defaultChecked = true; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').getAttribute('checked'), ''); assert.equal(await page.getByRole('switch', { name: 'Choice' }).isChecked(), true);
  await page.locator('#b').evaluate(async el => { (el as any).checked = true; (el as any).defaultChecked = false; await (el as any).updateComplete; });
  assert.equal(await page.locator('#b').getAttribute('checked'), null); assert.equal(await page.getByRole('switch', { name: 'Choice' }).isChecked(), true);
  await page.locator('form').evaluate(el => (el as HTMLFormElement).reset()); assert.equal(await page.getByRole('switch', { name: 'Choice' }).isChecked(), false);
  await page.close();
});

test('external label names omit hidden decorations and refresh when visibility or association changes', async () => {
  const page = await open(); await setMarkup(page, '<label id="l" for="b">Choice <span aria-hidden="true">Decoration</span><span hidden>Hidden</span></label><sp-switch id="b"></sp-switch>');
  assert.equal(await page.getByRole('switch', { name: 'Choice', exact: true }).count(), 1);
  await page.locator('#l [aria-hidden]').evaluate(el => el.setAttribute('aria-hidden', 'false')); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('switch', { name: 'Choice Decoration', exact: true }).count(), 1);
  await page.locator('#l').evaluate(el => el.remove()); await page.waitForTimeout(30);
  assert.equal(await page.getByRole('switch', { name: 'Choice Decoration', exact: true }).count(), 0);
  await page.locator('#b').evaluate(async el => { (el as any).ariaLabel = 'Explicit choice'; await (el as any).updateComplete; });
  assert.equal(await page.getByRole('switch', { name: 'Explicit choice' }).count(), 1);
  await page.close();
});

test('external label for and host id changes update both old and newly associated accessible names', async () => {
  const page = await open(); await setMarkup(page, '<label id="l" for="x">Choice</label><sp-switch id="x"></sp-switch><sp-switch id="y"></sp-switch>');
  await page.locator('#l').evaluate(el => (el as HTMLLabelElement).htmlFor = 'y'); await page.waitForTimeout(30);
  assert.match(await page.locator('#y').ariaSnapshot(), /switch "Choice"/); assert.doesNotMatch(await page.locator('#x').ariaSnapshot(), /Choice/);
  await page.locator('#y').evaluate(el => el.id = 'new-id'); await page.waitForTimeout(30);
  assert.doesNotMatch(await page.locator('#new-id').ariaSnapshot(), /Choice/);
  await page.locator('#l').evaluate(el => (el as HTMLLabelElement).htmlFor = 'new-id'); await page.waitForTimeout(30);
  assert.match(await page.locator('#new-id').ariaSnapshot(), /Choice/);
  await page.close();
});

test('hover/pressed use System and invalid focus keeps Danger with a separate System ring; disabled overrides both', async () => {
  const page = await open(); await setMarkup(page, '<sp-switch id="b" label="Choice" checked></sp-switch><button>After</button>');
  const input = page.getByRole('switch', { name: 'Choice' });
  const style = () => page.locator('#b .box').evaluate(el => { const c = getComputedStyle(el), ring = getComputedStyle(el, '::after'); return { fill: c.backgroundColor, border: c.borderColor, width: c.borderTopWidth, ring: ring.borderColor, ringWidth: ring.borderTopWidth, ringContent: ring.content }; });
  await input.hover(); assert.ok(close(parseColor((await style()).fill), expectedColor(source, 'semantic-color.color.system.control.hover', {})));
  await page.mouse.down(); assert.ok(close(parseColor((await style()).fill), expectedColor(source, 'semantic-color.color.system.control.active', {}))); await page.mouse.up();
  await page.locator('#b').evaluate(async el => { (el as any).invalid = true; await (el as any).updateComplete; }); await page.getByRole('button', { name: 'After' }).focus(); await page.keyboard.press('Shift+Tab');
  const s = await style(); assert.ok(close(parseColor(s.border), expectedColor(source, 'semantic-color.color.danger.default', {}))); assert.ok(close(parseColor(s.ring), expectedColor(source, 'semantic-color.color.system.focus', {})), JSON.stringify({ s, focused: await input.evaluate(el => [el.matches(':focus'), el.matches(':focus-visible'), document.activeElement?.tagName]) })); assert.equal(s.ringWidth, '2px');
  await page.locator('#b').evaluate(async el => { (el as any).disabled = true; await (el as any).updateComplete; }); assert.ok(close(parseColor((await style()).fill), expectedColor(source, 'semantic-color.color.surface.disabled', {})));
  await page.close();
});

test('nested theme overrides and RTL long labels wrap without overflow at 320 and 390px', async () => {
  const page = await open();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    await setMarkup(page, '<section data-sp-mode-style="Helios" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" data-sp-mode-primary="Purple" dir="rtl"><div data-sp-mode-style="Ares" data-sp-mode-density="Compact"><sp-switch id="b" label="A long selection label that wraps and stays inside this narrow container" description="The description must also wrap without changing the target size" checked></sp-switch></div></section>');
    const v = await page.locator('#b').evaluate(el => { const label = el.shadowRoot!.querySelector('.label')!, box = el.shadowRoot!.querySelector('.box')!; return { overflow: document.documentElement.scrollWidth > innerWidth, radius: getComputedStyle(box).borderRadius, dir: getComputedStyle(label).direction, left: box.getBoundingClientRect().left, labelRight: label.getBoundingClientRect().right, font: getComputedStyle(label).fontSize }; });
    assert.equal(v.overflow, false); assert.equal(v.radius, '0px'); assert.equal(v.dir, 'rtl'); assert.equal(v.font, '14px'); assert.ok(v.left > v.labelRight);
  }
  await page.close();
});

test('native Switch is binary, keeps its label and captures Space/pointer with exactly one event pair', async () => {
  const page = await open(); await setMarkup(page, '<sp-switch id="b" label="Airplane mode"><span slot="icon">Decoration</span></sp-switch>');
  await page.locator('#b').evaluate(el => { (el as any).events = []; for (const name of ['input', 'change']) el.addEventListener(name, () => (el as any).events.push(name)); });
  const input = page.getByRole('switch', { name: 'Airplane mode', exact: true }); await input.focus(); await input.press('Space'); assert.equal(await input.isChecked(), true);
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).events]), [true, ['input', 'change']]);
  await input.press('Enter'); assert.equal(await input.isChecked(), true);
  await page.getByText('Airplane mode', { exact: true }).click(); assert.equal(await input.isChecked(), false);
  assert.match(await page.locator('#b').ariaSnapshot(), /switch "Airplane mode"/); assert.doesNotMatch(await page.locator('#b').ariaSnapshot(), /Decoration|mixed/);
  await page.locator('#b').evaluate(el => { el.addEventListener('click', e => e.preventDefault()); (el as HTMLElement).click(); });
  assert.deepEqual(await page.locator('#b').evaluate(el => [(el as any).checked, (el as any).events]), [false, ['input', 'change', 'input', 'change']]); await page.close();
});

test('checked state submits once, current/default stay separate, reset and valid restoration are silent', async () => {
  const page = await open(); await setMarkup(page, '<form><sp-switch id="b" label="Sharing" name="sharing" value="yes" checked></sp-switch><button type="reset">Reset</button></form>');
  const data = () => page.locator('form').evaluate(el => [...new FormData(el as HTMLFormElement)]);
  assert.deepEqual(await data(), [['sharing', 'yes']]); await page.getByRole('switch', { name: 'Sharing' }).uncheck(); assert.deepEqual(await data(), []);
  assert.equal(await page.locator('#b').getAttribute('checked'), ''); await page.getByRole('button', { name: 'Reset' }).click(); assert.deepEqual(await data(), [['sharing', 'yes']]);
  await page.locator('#b').evaluate(async el => { (el as any).formStateRestoreCallback('[false,false]'); await (el as any).updateComplete; }); assert.deepEqual(await data(), []);
  await page.locator('#b').evaluate(async el => { (el as any).formStateRestoreCallback('[true,false]'); await (el as any).updateComplete; }); assert.deepEqual(await data(), [['sharing', 'yes']]);
  await page.locator('#b').evaluate(el => (el as any).formStateRestoreCallback('not JSON')); assert.deepEqual(await data(), [['sharing', 'yes']]); await page.close();
});

test('all 128 themes preserve size anatomy, Style corners, Density text and independent System checked fill', async () => {
  const page = await open(); await setMarkup(page, '<sp-switch id="b" label="Sharing" checked></sp-switch>');
  for (const style of ['Atlas', 'Selene', 'Helios', 'Ares']) for (const theme of ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast']) for (const primary of ['Blue', 'Purple', 'Sky', 'Orange']) for (const density of ['Relaxed', 'Compact']) {
    await setAttrs(page, { style, primary, density, ...themeAttrs(theme) });
    const v = await page.locator('#b').evaluate(el => { const box=el.shadowRoot!.querySelector('.box')!, thumb=el.shadowRoot!.querySelector('.thumb')!, target=el.shadowRoot!.querySelector('.target')!, label=el.shadowRoot!.querySelector('.label')!;return {w:box.getBoundingClientRect().width,h:box.getBoundingClientRect().height,target:target.getBoundingClientRect().width,tw:thumb.getBoundingClientRect().width,th:thumb.getBoundingClientRect().height, radius:getComputedStyle(box).borderRadius,fill:getComputedStyle(box).backgroundColor,thumb:getComputedStyle(thumb).backgroundColor,font:getComputedStyle(label).fontSize,gap:getComputedStyle(el.shadowRoot!.querySelector('.row')!).columnGap}; });
    assert.deepEqual([v.w,v.h,v.target,v.tw,v.th],[40,20,44,22,16]); assert.equal(v.radius, ({Atlas:'4px',Selene:'8px',Helios:'10px',Ares:'0px'})[style]); assert.equal(v.font,density==='Relaxed'?'15px':'14px'); assert.equal(v.gap,density==='Relaxed'?'8px':'6px');
    const assign={style,'semantic-color':theme,primary,density}; assert.ok(close(parseColor(v.fill),expectedColor(source,'semantic-color.color.system.control.default',assign))); assert.ok(close(parseColor(v.thumb),expectedColor(source,'semantic-color.color.system.control.foreground',assign)));
  } await page.close();
});

test('sizes, local shapes, placement and RTL retain target geometry and thumb state position', async () => {
  const page=await open();
  for(const dir of ['ltr','rtl'])for(const size of ['sm','base','lg'])for(const shape of ['default','rounded','square'])for(const placement of ['start','end']) {
    await setMarkup(page, `<div dir="${dir}"><sp-switch id="b" size="${size}" shape="${shape}" placement="${placement}" appearance="boxed" label="Sharing" description="Device preferences"></sp-switch></div>`);
    const geometry=()=>page.locator('#b').evaluate(el=>{const root=el.shadowRoot!,box=root.querySelector('.box')!.getBoundingClientRect(),thumb=root.querySelector('.thumb')!.getBoundingClientRect(),target=root.querySelector('.target')!.getBoundingClientRect();return{w:box.width,h:box.height,tw:thumb.width,th:thumb.height,targetW:target.width,targetH:target.height,left:thumb.left-box.left,right:box.right-thumb.right,radius:getComputedStyle(root.querySelector('.box')!).borderRadius};});
    let v=await geometry();const dimensions=({sm:[32,16,16,12],base:[40,20,22,16],lg:[48,24,28,20]})[size]!;assert.deepEqual([v.w,v.h,v.th], [dimensions[0],dimensions[1],dimensions[3]]);assert.equal(v.tw,shape==='square'?v.th:dimensions[2]);assert.ok(v.targetW>=44 && v.targetH>=44);assert.equal(dir==='ltr'?v.left:v.right,2);
    await page.getByRole('switch',{name:'Sharing'}).check();v=await geometry();assert.equal(dir==='ltr'?v.right:v.left,2);if(shape==='square')assert.equal(v.radius,'4px');
  }await page.close();
});

test('forced colors keep checked/disabled/invalid boundaries, thumb contrast and focus',async()=>{
  const page=await open();await page.emulateMedia({forcedColors:'active'});await setMarkup(page,'<sp-switch id="b" label="Sharing" checked invalid></sp-switch>');await page.getByRole('switch',{name:'Sharing'}).focus();
  const styles=()=>page.locator('#b').evaluate(el=>{const box=el.shadowRoot!.querySelector('.box')!,thumb=el.shadowRoot!.querySelector('.thumb')!;return {fill:getComputedStyle(box).backgroundColor,border:getComputedStyle(box).borderColor,thumb:getComputedStyle(thumb).backgroundColor,ring:getComputedStyle(box,'::after').borderTopWidth};});
  let v=await styles();assert.notEqual(v.fill,v.thumb);assert.equal(v.ring,'2px');
  await page.locator('#b').evaluate(async el=>{(el as any).disabled=true;await (el as any).updateComplete;});v=await styles();assert.notEqual(v.fill,v.thumb);assert.equal(v.border,v.thumb);await page.close();
});

test('boxed assistance and padding activate once, while links, cancellation and disabled state stay safe',async()=>{
  const page=await open();await setMarkup(page,'<div class="row selection"><sp-switch id="b" appearance="boxed" placement="end" label="Sharing"><span slot="description">Device preferences <a href="#account">Account</a></span></sp-switch></div>');
  await page.locator('#b').evaluate(el=>{(el as any).events=[];for(const type of ['input','change'])el.addEventListener(type,()=> (el as any).events.push(type));});
  await page.getByText('Device preferences',{exact:false}).click({position:{x:10,y:5}});await page.waitForFunction(()=> (document.querySelector('#b') as any).checked);assert.deepEqual(await page.locator('#b').evaluate(el=>(el as any).events),['input','change']);
  await page.getByRole('link',{name:'Account'}).click();assert.equal(await page.locator('#b').evaluate(el=>(el as any).checked),true);
  await page.locator('#b').evaluate(el=> el.addEventListener('click',e=>e.preventDefault()));await page.locator('#b').locator('.selection').click({position:{x:2,y:2}});await page.waitForTimeout(30);assert.equal(await page.locator('#b').evaluate(el=>(el as any).checked),true);
  await page.locator('#b').evaluate(async el=>{(el as any).disabled=true;await (el as any).updateComplete;});await page.getByText('Device preferences',{exact:false}).click({position:{x:10,y:5}});await page.waitForTimeout(30);assert.deepEqual(await page.locator('#b').evaluate(el=>(el as any).events),['input','change']);await page.close();
});

test('dynamic slots keep label, description and error separate across repeated renders and native focus',async()=>{
 const page=await open();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setMarkup(page,'<sp-switch id="b" appearance="boxed"><span slot="label">Sharing</span><span slot="description">Initial hint</span></sp-switch>');
 for(let i=0;i<6;i++)await page.locator('#b').evaluate(async(el,i)=>{el.querySelector('[slot=description]')!.textContent='Hint '+i;(el as any).error='Error '+i;(el as any).checked=i%2===0;await (el as any).updateComplete;},i);
 const cdp=await page.context().newCDPSession(page);let tree=await cdp.send('Accessibility.getFullAXTree');let ax=tree.nodes.find(n=>n.role?.value==='switch'&&n.name?.value==='Sharing');assert.equal(ax?.description?.value,'Hint 5 Error 5');assert.equal(await page.locator('#b').evaluate(el=>(el as any).validity.customError),true);
 await page.locator('#b').evaluate(async el=>{(el as any).error='';await (el as any).updateComplete;});tree=await cdp.send('Accessibility.getFullAXTree');ax=tree.nodes.find(n=>n.role?.value==='switch'&&n.name?.value==='Sharing');assert.equal(ax?.description?.value,'Hint 5');assert.equal(await page.locator('#b').evaluate(el=>(el as any).validity.valid),true);
 await page.getByRole('switch',{name:'Sharing'}).focus();await page.keyboard.press('Space');assert.equal(await page.locator('#b').evaluate(el=>(el as any).checked),true);assert.deepEqual(errors,[]);await page.close();
});
