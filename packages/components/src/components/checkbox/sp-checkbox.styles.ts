import { css, unsafeCSS } from 'lit';
const check = unsafeCSS(`url("${new URL('./assets/check.svg', import.meta.url).href}")`);
const mixed = unsafeCSS(`url("${new URL('./assets/mixed.svg', import.meta.url).href}")`);

export const checkboxStyles = css`
  :host { display: inline-block; max-inline-size: 100%; min-inline-size: 0; color: var(--sp-color-foreground-default); font-family: var(--sp-font-family-body), sans-serif; }
  :host([hidden]), [hidden] { display: none; }
  * { box-sizing: border-box; }
  .selection { display: grid; min-inline-size: 0; }
  .row { display: flex; align-items: flex-start; gap: var(--sp-checkbox-gap); cursor: pointer; min-inline-size: 0; }
  .target { display: grid; place-items: center; position: relative; flex: none; inline-size: var(--sp-checkbox-target-size); block-size: var(--sp-checkbox-target-size); }
  input { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; padding: 0; margin: 0; opacity: 0; cursor: inherit; }
  .box { --_boundary: var(--sp-checkbox-border-width); pointer-events: none; position: relative; display: grid; place-items: center; inline-size: var(--sp-checkbox-size); block-size: var(--sp-checkbox-size); border: var(--_boundary) solid var(--sp-color-border-default); border-radius: var(--sp-checkbox-radius); background: var(--sp-style-field-background-default); }
  .mark { display: block; inline-size: var(--sp-checkbox-mark-size); block-size: var(--sp-checkbox-mark-size); background: var(--sp-selection-foreground-checked); mask-image: ${check}; mask-position: center; mask-repeat: no-repeat; mask-size: contain; }
  .mark[data-mixed] { mask-image: ${mixed}; }
  .mark[hidden] { display: none; }
  .label { min-inline-size: 0; padding-block: calc((var(--sp-checkbox-target-size) - var(--sp-checkbox-line-height)) / 2); font-size: var(--sp-checkbox-font-size); line-height: var(--sp-checkbox-line-height); font-weight: var(--sp-font-weight-body); overflow-wrap: anywhere; }
  .message { margin-inline-start: calc(var(--sp-checkbox-target-size) + var(--sp-checkbox-gap)); font-size: var(--sp-font-size-body-small); line-height: var(--sp-field-line-height-small); color: var(--sp-color-foreground-muted); overflow-wrap: anywhere; }
  .error { color: var(--sp-color-danger-text); }
  .selection[data-selected] .box { background: var(--sp-selection-background-checked); border-color: var(--sp-selection-background-checked); }
  @media (hover: hover) {
    .selection:not([data-disabled]) .row:hover .box { background: var(--sp-style-field-background-hover); border-color: var(--sp-color-border-strong); }
    .selection[data-selected]:not([data-disabled]) .row:hover .box { background: var(--sp-selection-background-hover); border-color: var(--sp-selection-background-hover); }
  }
  .selection:not([data-disabled]) .row:active .box { background: var(--sp-style-field-background-hover); border-color: var(--sp-color-border-strong); }
  .selection[data-selected]:not([data-disabled]) .row:active .box { background: var(--sp-selection-background-active); border-color: var(--sp-selection-background-active); }
  .selection[data-invalid] .box, .selection[data-invalid]:not([data-disabled]) .row:is(:hover, :active) .box { --_boundary: var(--sp-border-width-emphasis); border-color: var(--sp-color-danger-default); }
  input:focus-visible + .box::after { content: ''; position: absolute; inset: calc(-1 * (var(--sp-checkbox-focus-offset) + var(--_boundary))); border: var(--sp-checkbox-focus-width) solid var(--sp-checkbox-focus-color); border-radius: min(var(--sp-checkbox-focus-radius), calc(var(--sp-checkbox-radius) + var(--sp-checkbox-focus-offset))); }
  .selection[data-disabled] { color: var(--sp-color-foreground-disabled); }
  .selection[data-disabled] .row { cursor: not-allowed; }
  .selection[data-disabled] .box { background: var(--sp-color-surface-disabled); border-color: var(--sp-color-foreground-disabled); }
  .selection[data-disabled] .mark { background: var(--sp-color-foreground-disabled); }
  @media (forced-colors: active) {
    .box { forced-color-adjust: none; background: Canvas; border-color: CanvasText; }
    .selection[data-selected] .box { background: Highlight; border-color: Highlight; }
    .mark { forced-color-adjust: none; background: HighlightText; }
    .selection[data-disabled] .box { background: Canvas; border-color: GrayText; }
    .selection[data-disabled] .mark { background: GrayText; }
    .selection[data-invalid] .box, .selection[data-invalid]:not([data-disabled]) .row:is(:hover, :active) .box { border-color: CanvasText; }
    .selection:not([data-disabled]) .row:is(:hover, :active) .box { background: Canvas; border-color: CanvasText; }
    .selection[data-selected]:not([data-disabled]) .row:is(:hover, :active) .box { background: Highlight; border-color: Highlight; }
    input:focus-visible + .box::after { border-color: Highlight; }
  }
`;
