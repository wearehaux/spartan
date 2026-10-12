import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright-core';
import type { Server } from 'node:http';
import { resolveToken, type TokenSourceV2 } from '../lib/figma-tokens';
import { close, expectedColor, launch, parseColor, setAttrs, startServer } from './harness';

const source: TokenSourceV2 = JSON.parse(readFileSync('tokens/source.json','utf8'));
let browser: Browser, server: Server, base: string;
before(async () => { ({server,base}=await startServer());browser=await launch(); });
after(async () => { await browser?.close();server?.close(); });
const open = async () => {
  const page=await browser.newPage();
  await page.goto(`${base}/iframe.html?id=foundations-theme-contract--playground&viewMode=story`);
  await page.waitForSelector('.sp-contract .contract-field');
  return page;
};

test('field recipes honor size, appearance, Style and high contrast in all 128 theme combinations', async () => {
  const page=await open();let checked=0;
  for(const style of ['Atlas','Selene','Helios','Ares']) for(const primary of ['Blue','Purple','Orange','Sky']) for(const scheme of ['Light','Dark']) for(const contrast of ['Normal','High']) for(const density of ['Relaxed','Compact']) {
    const attrs={style,primary,'color-scheme':scheme,contrast,density};await setAttrs(page,attrs);
    for(const appearance of ['default','outlined','filled']) for(const size of ['small','base']) {
      const got=await page.evaluate(({appearance,size})=>{
        const field=document.querySelector<HTMLInputElement>('input.contract-field')!;
        field.dataset.appearance=appearance;field.dataset.size=size;
        const cs=getComputedStyle(field), multiline=getComputedStyle(document.querySelector('textarea.contract-field')!);
        return {height:field.getBoundingClientRect().height,radius:cs.borderRadius,side:cs.borderInlineStartWidth,bottom:cs.borderBottomWidth,background:cs.backgroundColor,shadow:cs.boxShadow,multilineRadius:multiline.borderRadius};
      },{appearance,size});
      const mode=scheme+(contrast==='High'?' High Contrast':''), assign={style,primary,density,'semantic-color':mode};
      const height=resolveToken(source,`component.field.height.${size==='small'?'small':'base'}`,assign);
      assert.equal(Math.round(got.height),height,JSON.stringify({attrs,appearance,size,got}));
      assert.equal(got.radius,`${resolveToken(source,'component.field.radius',assign)}px`);
      assert.equal(got.multilineRadius,`${resolveToken(source,'component.field.multiline.radius',assign)}px`);
      const surface=appearance==='default'?'component.field.background.default':`style.style.field.${appearance}.background`;
      assert.ok(close(parseColor(got.background),expectedColor(source,surface,assign)),surface);
      const side=appearance==='default'?'component.field.side-width':`style.style.field.${appearance}.side-width`;
      assert.equal(got.side,`${resolveToken(source,side,assign)}px`);
      if(contrast==='High') assert.ok(parseFloat(got.bottom)>=2,'high contrast retains a boundary');
      if(style==='Helios') assert.notEqual(got.shadow,'none','appearance retains Style elevation');
      checked++;
    }
  }
  assert.equal(checked,768);await page.close();
});

test('brand changes leave keyboard focus, selected controls and invalid+focus feedback System-owned', async () => {
  const page=await open();await setAttrs(page,{style:'Ares','primary':'Purple','color-scheme':'Dark',contrast:'High'});
  const field=page.locator('input.contract-field');
  await field.evaluate(el=>{el.setAttribute('aria-invalid','true');el.setAttribute('data-appearance','filled');});
  await field.focus();
  const read=async()=>page.evaluate(()=>{
    const field=document.querySelector<HTMLInputElement>('input.contract-field')!,cs=getComputedStyle(field);
    const checkbox=document.querySelector<HTMLInputElement>('.contract-choice input')!;
    const action=document.querySelector('sp-button')!.shadowRoot!.querySelector('button')!;
    return {outline:cs.outlineColor,outlineWidth:cs.outlineWidth,border:cs.borderColor,side:cs.borderInlineStartWidth,accent:getComputedStyle(checkbox).accentColor,action:getComputedStyle(action).backgroundColor,focus:field.matches(':focus-visible')};
  });
  const first=await read();await setAttrs(page,{primary:'Orange'});const second=await read();
  assert.equal(first.outline,second.outline);assert.equal(first.accent,second.accent);assert.notEqual(first.action,second.action);
  assert.ok(second.focus);assert.ok(parseFloat(second.outlineWidth)>=2);assert.ok(parseFloat(second.side)>=2);
  assert.ok(close(parseColor(second.outline),expectedColor(source,'semantic-color.color.system.focus',{'semantic-color':'Dark High Contrast'})));
  assert.ok(close(parseColor(second.border),expectedColor(source,'semantic-color.color.danger.default',{'semantic-color':'Dark High Contrast'})));
  await field.evaluate(el=>{(el as HTMLInputElement).disabled=true;});const disabled=await read();
  assert.ok(close(parseColor(disabled.border),expectedColor(source,'semantic-color.color.foreground.disabled',{'semantic-color':'Dark High Contrast'})));
  assert.equal(disabled.focus,false);
  await field.evaluate(el=>{(el as HTMLInputElement).disabled=false;(el as HTMLInputElement).readOnly=true;});await field.focus();
  assert.ok(await field.evaluate(el=>el.matches(':focus-visible')),'readonly remains keyboard-focusable');
  await page.close();
});

test('hover cannot replace invalid or focused borders, and only Default appearance uses the Style hover surface', async()=>{
  const page=await open();await setAttrs(page,{style:'Ares','primary':'Purple','color-scheme':'Dark',contrast:'High'});
  const field=page.locator('input.contract-field');
  const read=()=>field.evaluate(el=>{const cs=getComputedStyle(el);return {border:cs.borderColor,background:cs.backgroundColor};});
  const assign={style:'Ares','semantic-color':'Dark High Contrast'};
  const expectToken=(value:string,key:string)=>assert.ok(close(parseColor(value),expectedColor(source,key,assign)),`${key}: ${value}`);
  await field.evaluate(el=>el.setAttribute('aria-invalid','true'));await field.hover();
  expectToken((await read()).border,'semantic-color.color.danger.default');
  await field.focus();expectToken((await read()).border,'semantic-color.color.danger.default');
  await field.evaluate(el=>el.setAttribute('aria-invalid','false'));
  expectToken((await read()).border,'semantic-color.color.system.focus');
  await field.evaluate(el=>(el as HTMLInputElement).blur());
  await field.hover();expectToken((await read()).background,'component.field.background.hover');
  for(const appearance of ['outlined','filled']) {
    await field.evaluate((el,appearance)=>{el.setAttribute('data-appearance',appearance);},appearance);
    await field.hover();expectToken((await read()).background,`style.style.field.${appearance}.background`);
  }
  await page.close();
});

test('nested density updates field, row and legend aliases while approved Card padding stays fixed', async()=>{
  const page=await open();await setAttrs(page,{style:'Helios','primary':'Sky','color-scheme':'Dark',contrast:'High',density:'Relaxed'});
  const read=async()=>page.evaluate(()=>{
    const scope=document.querySelector<HTMLElement>('.sp-contract')!;
    const cs=getComputedStyle(scope), card=getComputedStyle(scope.querySelector('.contract-card')!);
    return {field:cs.getPropertyValue('--sp-field-height-base').trim(),row:cs.getPropertyValue('--sp-table-row-min-height').trim(),legend:cs.getPropertyValue('--sp-chart-legend-gap').trim(),radius:cs.getPropertyValue('--sp-field-radius').trim(),focus:cs.getPropertyValue('--sp-button-focus-color').trim(),cardX:card.paddingInlineStart,cardY:card.paddingBlockStart};
  });
  const before=await read();await page.locator('.sp-contract').evaluate(el=>el.setAttribute('data-sp-mode-density','Compact'));const after=await read();
  assert.deepEqual([before.field,after.field,before.row,after.row,before.legend,after.legend],['40px','32px','40px','32px','12px','8px']);
  assert.equal(before.radius,after.radius);assert.equal(before.focus,after.focus);
  assert.deepEqual([after.cardX,after.cardY],['16px','20px']);
  await page.close();
});
