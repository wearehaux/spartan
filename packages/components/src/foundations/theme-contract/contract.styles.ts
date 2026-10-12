import { css } from 'lit';

// Infrastructure fixtures for reviewing the shared contract. Component owners consume these
// tokens in their production implementations; this file does not define Input, Table or Menu.
export const contractStyles = css`
  .sp-contract { color: var(--sp-color-foreground-default); font-family: var(--sp-font-family-body), sans-serif; padding: var(--sp-surface-content-padding); }
  .sp-contract * { box-sizing: border-box; }
  .sp-contract .contract-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); gap: var(--sp-form-group-gap); }
  .sp-contract .contract-surface { padding: var(--sp-surface-content-padding); background: var(--sp-surface-background); border: var(--sp-surface-border-width) solid var(--sp-surface-border); border-radius: var(--sp-surface-radius); box-shadow: 0 var(--sp-surface-shadow-offset-y) var(--sp-surface-shadow-blur) var(--sp-surface-shadow); }
  .sp-contract h2 { margin: 0 0 var(--sp-form-group-gap); font-size: var(--sp-font-size-heading-small); }
  .sp-contract p { margin: 0 0 var(--sp-form-group-gap); }
  .sp-contract label { display: grid; gap: var(--sp-field-gap); margin-block: var(--sp-form-group-gap); }
  .sp-contract .contract-field {
    --_field-height: var(--sp-field-height-base);
    --_field-fill: var(--sp-field-background-default);
    --_field-border: var(--sp-field-border-default);
    --_field-side: var(--sp-field-side-width);
    --_field-bottom: var(--sp-field-border-width);
    --_field-line-height: var(--sp-field-line-height);
    inline-size: 100%; min-block-size: var(--_field-height); min-inline-size: 0;
    padding-inline: var(--sp-field-padding-x-default);
    padding-block: min(var(--sp-field-padding-y), max(var(--sp-prim-space-0), calc((var(--_field-height) - var(--_field-line-height) - var(--_field-side) - var(--_field-bottom)) / 2)));
    color: var(--sp-color-foreground-default); background: var(--_field-fill);
    border-style: solid; border-color: var(--_field-border);
    border-width: var(--_field-side); border-block-end-width: var(--_field-bottom);
    border-radius: var(--sp-field-radius);
    box-shadow: 0 var(--sp-field-shadow-offset-y) var(--sp-field-shadow-blur) var(--sp-field-shadow);
    font: inherit; font-size: var(--sp-field-font-size); line-height: var(--_field-line-height);
  }
  .sp-contract .contract-field[data-size='small'] { --_field-height: var(--sp-field-height-small); --_field-line-height: var(--sp-density-control-line-height-small); font-size: var(--sp-density-control-font-size-small); padding-inline: var(--sp-density-control-padding-x-small); }
  .sp-contract textarea.contract-field { min-block-size: var(--sp-field-textarea-min-height-default); border-radius: var(--sp-field-multiline-radius); resize: vertical; }
  .sp-contract .contract-field[data-appearance='outlined'] { --_field-fill: var(--sp-style-field-outlined-background); --_field-border: var(--sp-style-field-outlined-border-default); --_field-side: var(--sp-style-field-outlined-side-width); --_field-bottom: var(--sp-style-field-outlined-side-width); }
  .sp-contract .contract-field[data-appearance='filled'] { --_field-fill: var(--sp-style-field-filled-background); --_field-border: var(--sp-style-field-filled-border-default); --_field-side: var(--sp-style-field-filled-side-width); --_field-bottom: var(--sp-style-field-filled-side-width); }
  @media (hover: hover) {
    .sp-contract .contract-field:hover:not(:disabled):not([readonly]):not([aria-invalid='true']):not(:focus-visible) { border-color: var(--sp-field-border-hover); }
    .sp-contract .contract-field[data-appearance='default']:hover:not(:disabled):not([readonly]):not([aria-invalid='true']):not(:focus-visible) { background: var(--sp-field-background-hover); }
  }
  .sp-contract .contract-field:focus-visible { border-color: var(--sp-field-border-focus); outline: var(--sp-border-width-emphasis) solid var(--sp-color-system-focus); outline-offset: var(--sp-prim-space-1); }
  .sp-contract .contract-field[aria-invalid='true'] { --_field-side: var(--sp-field-side-width-error); --_field-bottom: var(--sp-border-width-emphasis); border-color: var(--sp-field-border-error); }
  .sp-contract .contract-field[data-appearance='outlined'][aria-invalid='true'], .sp-contract .contract-field[data-appearance='filled'][aria-invalid='true'] { --_field-side: var(--sp-border-width-emphasis); }
  .sp-contract .contract-field:disabled { color: var(--sp-color-foreground-disabled); background: var(--sp-color-surface-disabled); border-color: var(--sp-color-foreground-disabled); cursor: not-allowed; }
  .sp-contract .contract-error { color: var(--sp-color-danger-text); }
  .sp-contract .contract-choice { display: flex; align-items: center; min-block-size: var(--sp-field-height-base); gap: var(--sp-field-gap); }
  .sp-contract .contract-choice input { appearance: none; display: grid; place-items: center; margin: 0; inline-size: var(--sp-selection-box-default); block-size: var(--sp-selection-box-default); accent-color: var(--sp-selection-background-checked); background: var(--sp-color-surface-default); border: var(--sp-border-width-default) solid var(--sp-color-border-default); border-radius: var(--sp-selection-radius); }
  .sp-contract .contract-choice input:checked { background: var(--sp-selection-background-checked); border-color: var(--sp-selection-background-checked); color: var(--sp-selection-foreground-checked); }
  .sp-contract .contract-choice input:checked::after { content: '✓'; font-size: var(--sp-density-control-font-size-small); line-height: 1; }
  .sp-contract .contract-choice input:disabled { background: var(--sp-color-surface-disabled); border-color: var(--sp-color-foreground-disabled); color: var(--sp-color-foreground-disabled); }
  .sp-contract .contract-choice input:focus-visible { outline: var(--sp-border-width-emphasis) solid var(--sp-selection-focus-color); outline-offset: var(--sp-prim-space-1); }
  .sp-contract .contract-menu { display: grid; }
  .sp-contract .contract-menu button { text-align: start; font: inherit; min-block-size: var(--sp-menu-item-min-height); padding: var(--sp-menu-item-padding-y) var(--sp-table-cell-padding-x); border: var(--sp-border-width-default) solid var(--sp-color-border-default); background: var(--sp-color-surface-default); color: inherit; }
  .sp-contract .contract-table { border-collapse: collapse; inline-size: 100%; }
  .sp-contract .contract-table td, .sp-contract .contract-table th { text-align: start; height: var(--sp-table-row-min-height); padding: var(--sp-table-cell-padding-y) var(--sp-table-cell-padding-x); border-block-end: var(--sp-border-width-default) solid var(--sp-color-border-default); }
  .sp-contract .contract-legend { display: flex; flex-wrap: wrap; gap: var(--sp-chart-legend-gap); }
  .sp-contract .contract-legend span { color: var(--sp-color-information-text); }
  .sp-contract .contract-card { padding: var(--sp-card-padding-y) var(--sp-card-padding-x); border: var(--sp-surface-border-width) solid var(--sp-surface-border); border-radius: var(--sp-surface-radius); }
`;
