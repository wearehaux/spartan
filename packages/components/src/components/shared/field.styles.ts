import { css } from 'lit';

export const fieldStyles = css`
  :host { display: inline-grid; gap: var(--sp-field-gap); inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; color: var(--sp-color-foreground-default); font-family: var(--sp-font-family-body), sans-serif; }
  :host([hidden]) { display: none; }
  * { box-sizing: border-box; }
  .label { display: flex; gap: var(--sp-field-gap); font-size: var(--sp-density-control-font-size-small); line-height: var(--sp-density-control-line-height-small); font-weight: var(--sp-font-weight-emphasis); }
  .field {
    --_radius: var(--sp-field-radius); --_focus-radius: var(--sp-field-focus-radius);
    --_height: var(--sp-field-height-base); --_font: var(--sp-field-font-size); --_line: var(--sp-field-line-height); --_icon: var(--sp-field-icon-size); --_padding-x: var(--sp-field-padding-x-default);
    --_fill: var(--sp-field-background-default); --_border: var(--sp-field-border-default); --_side: var(--sp-field-side-width); --_bottom: var(--sp-field-border-width);
    display: flex; align-items: center; gap: var(--sp-field-gap); position: relative; min-inline-size: 0; min-block-size: var(--_height);
    padding-inline: var(--_padding-x); padding-block: min(var(--sp-field-padding-y), max(var(--sp-prim-space-0), calc((var(--_height) - var(--_line) - var(--_side) - var(--_bottom)) / 2)));
    background: var(--_fill); color: var(--sp-color-foreground-default); border: var(--_side) solid var(--_border); border-block-end-width: var(--_bottom); border-radius: var(--_radius);
    box-shadow: 0 var(--sp-field-shadow-offset-y) var(--sp-field-shadow-blur) var(--sp-field-shadow);
    font-size: var(--_font); line-height: var(--_line); font-weight: var(--sp-prim-font-weight-regular);
  }
  .field[data-size='sm'] { --_height: var(--sp-field-height-small); --_font: var(--sp-field-font-size-small); --_line: var(--sp-field-line-height-small); --_icon: var(--sp-field-icon-size-small); --_padding-x: var(--sp-field-padding-x-small); }
  .field[data-appearance='outlined'] { --_fill: var(--sp-style-field-outlined-background); --_border: var(--sp-style-field-outlined-border-default); --_side: var(--sp-style-field-outlined-side-width); --_bottom: var(--sp-style-field-outlined-side-width); }
  .field[data-appearance='filled'] { --_fill: var(--sp-style-field-filled-background); --_border: var(--sp-style-field-filled-border-default); --_side: var(--sp-style-field-filled-side-width); --_bottom: var(--sp-style-field-filled-side-width); }
  .control { display: block; flex: 1; inline-size: 100%; min-inline-size: 0; margin: 0; padding: 0; border: 0; border-radius: inherit; background: transparent; color: inherit; font: inherit; outline: none; }
  .control::placeholder { color: var(--sp-color-foreground-muted); opacity: 1; }
  .icon { display: flex; flex: none; inline-size: var(--_icon); block-size: var(--_icon); }
  .end { display: flex; flex: none; align-items: center; }
  ::slotted(svg), ::slotted(img) { inline-size: var(--_icon); block-size: var(--_icon); display: block; }
  @media (hover: hover) {
    .field:hover:not([data-disabled]):not([data-readonly]):not([data-invalid]):not(:has(.control:focus)) { border-color: var(--sp-field-border-hover); }
    .field[data-appearance='default']:hover:not([data-disabled]):not([data-readonly]):not([data-invalid]):not(:has(.control:focus)) { background: var(--sp-field-background-hover); }
  }
  .field:has(.control:focus):not([data-invalid]):not([data-disabled]) { border-color: var(--sp-field-border-focus); }
  .field:has(.control:focus-visible)::after {
    content: ''; position: absolute; pointer-events: none; box-sizing: border-box;
    inset-inline: calc(-1 * (var(--sp-field-focus-offset) + var(--_side)));
    inset-block-start: calc(-1 * (var(--sp-field-focus-offset) + var(--_side)));
    inset-block-end: calc(-1 * (var(--sp-field-focus-offset) + var(--_bottom)));
    border: var(--sp-field-focus-width) solid var(--sp-field-focus-color); border-radius: var(--_focus-radius);
  }
  .field[data-invalid] { --_side: var(--sp-field-side-width-error); --_bottom: var(--sp-border-width-emphasis); border-color: var(--sp-field-border-error); }
  .field[data-appearance='outlined'][data-invalid], .field[data-appearance='filled'][data-invalid] { --_side: var(--sp-border-width-emphasis); }
  .field[data-disabled] { background: var(--sp-color-surface-disabled); color: var(--sp-color-foreground-disabled); border-color: var(--sp-color-foreground-disabled); cursor: not-allowed; }
  .control:disabled, .control:disabled::placeholder { color: var(--sp-color-foreground-disabled); cursor: not-allowed; }
  .message { font-size: var(--sp-font-size-body-small); line-height: var(--sp-field-line-height-small); color: var(--sp-color-foreground-muted); overflow-wrap: anywhere; }
  .error { color: var(--sp-color-danger-text); }
  [hidden] { display: none; }
  @media (forced-colors: active) { .field:has(.control:focus-visible)::after { border-color: Highlight; } }
`;
