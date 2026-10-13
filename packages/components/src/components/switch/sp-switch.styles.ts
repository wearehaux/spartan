import { css } from 'lit';
export const switchStyles = css`
  :host { --_width: var(--sp-switch-control-width-base); --_height: var(--sp-switch-control-height-base); --_thumb-width: var(--sp-switch-control-thumb-width-base); --_thumb-height: var(--sp-switch-control-thumb-height-base); --_radius: min(var(--sp-switch-radius), calc(var(--_height) / 2)); --_thumb-radius: min(var(--sp-switch-radius), calc(var(--_thumb-height) / 2)); display: inline-block; max-inline-size: 100%; min-inline-size: 0; color: var(--sp-color-foreground-default); font-family: var(--sp-font-family-body), sans-serif; }
  :host([size=sm]) { --_width: var(--sp-switch-control-width-small); --_height: var(--sp-switch-control-height-small); --_thumb-width: var(--sp-switch-control-thumb-width-small); --_thumb-height: var(--sp-switch-control-thumb-height-small); }
  :host([size=lg]) { --_width: var(--sp-switch-control-width-large); --_height: var(--sp-switch-control-height-large); --_thumb-width: var(--sp-switch-control-thumb-width-large); --_thumb-height: var(--sp-switch-control-thumb-height-large); }
  :host([shape=rounded]) { --_radius: var(--sp-switch-rounded-radius); --_thumb-radius: var(--sp-switch-rounded-radius); }
  :host([shape=square]) { --_radius: var(--sp-switch-control-radius-square-track); --_thumb-radius: var(--sp-switch-control-radius-square-thumb); --_thumb-width: var(--_thumb-height); }
  :host([hidden]), [hidden] { display: none; }
  * { box-sizing: border-box; }
  .selection { display: grid; min-inline-size: 0; }
  .row { display: flex; align-items: flex-start; gap: var(--sp-switch-gap); cursor: pointer; min-inline-size: 0; }
  .target { display: grid; place-items: center; position: relative; flex: none; inline-size: max(var(--sp-switch-target-size), var(--_width)); block-size: var(--sp-switch-target-size); }
  input { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; padding: 0; margin: 0; opacity: 0; cursor: inherit; }
  .box { --_boundary: var(--sp-switch-border-width); pointer-events: none; position: relative; inline-size: var(--_width); block-size: var(--_height); border: var(--_boundary) solid var(--sp-color-border-default); border-radius: var(--_radius); background: var(--sp-selection-track); }
  .thumb { position: absolute; inset-block-start: calc((var(--_height) - var(--_thumb-height)) / 2 - var(--_boundary)); inset-inline-start: calc(var(--sp-switch-inset) - var(--_boundary)); display: grid; place-items: center; inline-size: var(--_thumb-width); block-size: var(--_thumb-height); border-radius: var(--_thumb-radius); background: var(--sp-switch-thumb-color); border: var(--sp-switch-border-width) solid var(--sp-color-foreground-muted); }
  .selection[data-selected] .thumb { background: var(--sp-selection-foreground-checked); border-color: var(--sp-selection-foreground-checked); inset-inline-start: calc(var(--_width) - var(--_thumb-width) - var(--sp-switch-inset) - var(--_boundary)); }
  .icon { display: grid; place-items: center; max-inline-size: 100%; max-block-size: 100%; overflow: hidden; color: var(--sp-color-foreground-muted); }
  ::slotted([slot=icon]) { inline-size: calc(var(--_thumb-height) - var(--sp-switch-inset) * 2); block-size: calc(var(--_thumb-height) - var(--sp-switch-inset) * 2); }
  .label { flex: 1; min-inline-size: 0; padding-block: calc((var(--sp-switch-target-size) - var(--sp-switch-line-height)) / 2); font-size: var(--sp-switch-font-size); line-height: var(--sp-switch-line-height); font-weight: var(--sp-font-weight-body); overflow-wrap: anywhere; }
  .message { margin-inline-start: calc(max(var(--sp-switch-target-size), var(--_width)) + var(--sp-switch-gap)); font-size: var(--sp-font-size-body-small); line-height: var(--sp-field-line-height-small); color: var(--sp-color-foreground-muted); overflow-wrap: anywhere; }
  .error { color: var(--sp-color-danger-text); }
  :host([placement=end]) .target { order: 1; }
  :host([placement=end]) .message { margin-inline-start: 0; margin-inline-end: calc(max(var(--sp-switch-target-size), var(--_width)) + var(--sp-switch-gap)); }
  :host([appearance=boxed]) .selection { padding: var(--sp-switch-boxed-padding); border: var(--sp-switch-border-width) solid var(--sp-color-border-default); border-radius: var(--sp-switch-boxed-radius); background: var(--sp-style-field-background-default); }
  :host([appearance=boxed]) .selection[data-selected] { border-color: var(--sp-selection-background-checked); }
  :host([appearance=boxed]) .selection[data-invalid] { border-color: var(--sp-color-danger-default); }
  .selection[data-selected] .box { background: var(--sp-selection-background-checked); border-color: var(--sp-selection-background-checked); }
  @media (hover: hover) {
    .selection:not([data-disabled]) .row:hover .box { border-color: var(--sp-color-border-strong); }
    .selection[data-selected]:not([data-disabled]) .row:hover .box { background: var(--sp-selection-background-hover); border-color: var(--sp-selection-background-hover); }
  }
  .selection:not([data-disabled]) .row:active .box { border-color: var(--sp-color-border-strong); }
  .selection[data-selected]:not([data-disabled]) .row:active .box { background: var(--sp-selection-background-active); border-color: var(--sp-selection-background-active); }
  .selection[data-invalid] .box, .selection[data-invalid]:not([data-disabled]) .row:is(:hover, :active) .box { --_boundary: var(--sp-border-width-emphasis); border-color: var(--sp-color-danger-default); }
  input:focus-visible + .box::after { content: ''; position: absolute; inset: calc(-1 * (var(--sp-switch-focus-offset) + var(--_boundary))); border: var(--sp-switch-focus-width) solid var(--sp-switch-focus-color); border-radius: calc(min(var(--_radius), var(--_height) / 2) + var(--sp-switch-focus-offset)); }
  .selection[data-disabled] { color: var(--sp-color-foreground-disabled); }
  .selection[data-disabled] .row { cursor: not-allowed; }
  .selection[data-disabled] .box { background: var(--sp-color-surface-disabled); border-color: var(--sp-color-foreground-disabled); }
  .selection[data-disabled] .thumb { background: var(--sp-color-foreground-disabled); border-color: var(--sp-color-foreground-disabled); }
  :host([appearance=boxed]) .selection[data-disabled] { border-color: var(--sp-color-foreground-disabled); background: var(--sp-color-surface-disabled); }
  @media (forced-colors: active) {
    .box, .thumb { forced-color-adjust: none; }
    .box { background: Canvas; border-color: CanvasText; }
    .thumb { background: CanvasText; border-color: CanvasText; }
    .selection[data-selected] .box, .selection[data-selected]:not([data-disabled]) .row:is(:hover, :active) .box { background: Highlight; border-color: Highlight; }
    .selection[data-selected] .thumb { background: HighlightText; border-color: HighlightText; }
    .selection:not([data-disabled]):not([data-selected]) .row:is(:hover, :active) .box { border-color: CanvasText; }
    .selection[data-invalid] .box, .selection[data-invalid]:not([data-disabled]) .row:is(:hover, :active) .box { border-color: CanvasText; }
    .selection[data-disabled] .box { background: Canvas; border-color: GrayText; }
    .selection[data-disabled] .thumb { background: GrayText; border-color: GrayText; }
    input:focus-visible + .box::after { border-color: Highlight; }
  }
`;
