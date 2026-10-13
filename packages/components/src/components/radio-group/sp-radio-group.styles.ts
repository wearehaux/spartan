import { css } from 'lit';
export const radioGroupStyles=css`
 :host { display:grid; gap:var(--sp-radio-group-copy-gap); max-inline-size:100%; min-inline-size:0; color:var(--sp-color-foreground-default); font-family:var(--sp-font-family-body),sans-serif; }
 :host([hidden]),[hidden]{display:none;}
 .items{display:flex;flex-direction:column;gap:var(--sp-radio-group-group-gap);min-inline-size:0;}
 .items[data-orientation='horizontal']{flex-direction:row;flex-wrap:wrap;}
 .label{font-size:var(--sp-radio-group-font-size);line-height:var(--sp-radio-group-line-height);font-weight:var(--sp-font-weight-emphasis);}
 .description,.error{font-size:var(--sp-font-size-body-small);line-height:var(--sp-field-line-height-small);color:var(--sp-color-foreground-muted);overflow-wrap:anywhere;}
 .error{color:var(--sp-color-danger-text);}
`;
export const radioItemStyles=css`
 :host{display:block;max-inline-size:100%;min-inline-size:0;color:var(--sp-color-foreground-default);font-family:var(--sp-font-family-body),sans-serif;}
 :host([hidden]),[hidden]{display:none;}
 *{box-sizing:border-box;}
 .row{display:flex;align-items:flex-start;gap:var(--sp-radio-group-gap);min-inline-size:0;cursor:pointer;}
 .target{display:grid;place-items:center;position:relative;flex:none;inline-size:var(--sp-radio-group-target-size);block-size:var(--sp-radio-group-target-size);}
 input{position:absolute;inset:0;inline-size:100%;block-size:100%;padding:0;margin:0;opacity:0;cursor:inherit;}
 .box{--_boundary:var(--sp-radio-group-border-width);pointer-events:none;position:relative;display:grid;place-items:center;inline-size:var(--sp-radio-group-size);block-size:var(--sp-radio-group-size);border:var(--_boundary) solid var(--sp-color-border-default);border-radius:var(--sp-radio-group-radius);background:var(--sp-style-field-background-default);}
 .dot{inline-size:var(--sp-radio-group-dot-size);block-size:var(--sp-radio-group-dot-size);border-radius:var(--sp-radio-group-radius);background:var(--sp-selection-foreground-checked);}
 .copy{display:grid;gap:var(--sp-radio-group-copy-gap);min-inline-size:0;flex:1;padding-block:calc((var(--sp-radio-group-target-size) - var(--sp-radio-group-line-height)) / 2);}
 .label{font-size:var(--sp-radio-group-font-size);line-height:var(--sp-radio-group-line-height);overflow-wrap:anywhere;}
 .description{font-size:var(--sp-font-size-body-small);line-height:var(--sp-field-line-height-small);color:var(--sp-color-foreground-muted);overflow-wrap:anywhere;}
 .row[data-placement='end'] .target{order:1;}
 .row[data-appearance='boxed']{padding:var(--sp-radio-group-boxed-padding);border:var(--sp-radio-group-border-width) solid var(--sp-color-border-default);border-radius:var(--sp-radio-group-boxed-radius);background:var(--sp-style-field-background-default);}
 .row[data-selected] .box{background:var(--sp-selection-background-checked);border-color:var(--sp-selection-background-checked);}
 .row[data-appearance='boxed'][data-selected]{border-color:var(--sp-selection-background-checked);}
 @media(hover:hover){.row:not([data-disabled]):hover .box{background:var(--sp-style-field-background-hover);border-color:var(--sp-color-border-strong);}.row[data-selected]:not([data-disabled]):hover .box{background:var(--sp-selection-background-hover);border-color:var(--sp-selection-background-hover);}}
 .row:not([data-disabled]):active .box{background:var(--sp-style-field-background-hover);border-color:var(--sp-color-border-strong);}
 .row[data-selected]:not([data-disabled]):active .box{background:var(--sp-selection-background-active);border-color:var(--sp-selection-background-active);}
 .row[data-invalid] .box,.row[data-invalid]:not([data-disabled]):is(:hover,:active) .box{--_boundary:var(--sp-border-width-emphasis);border-color:var(--sp-color-danger-default);}
 .row[data-appearance='boxed'][data-invalid]{border-color:var(--sp-color-danger-default);}
 input:focus-visible+.box::after{content:'';position:absolute;inset:calc(-1 * (var(--sp-radio-group-focus-offset) + var(--_boundary)));border:var(--sp-radio-group-focus-width) solid var(--sp-radio-group-focus-color);border-radius:var(--sp-radio-group-radius);}
 .row[data-disabled]{color:var(--sp-color-foreground-disabled);cursor:not-allowed;}
 .row[data-disabled] .box,.row[data-appearance='boxed'][data-disabled]{background:var(--sp-color-surface-disabled);border-color:var(--sp-color-foreground-disabled);}
 .row[data-disabled] .dot{background:var(--sp-color-foreground-disabled);}
 @media(forced-colors:active){.box{forced-color-adjust:none;background:Canvas;border-color:CanvasText;}.row[data-selected] .box{background:Highlight;border-color:Highlight;}.dot{forced-color-adjust:none;background:HighlightText;}.row[data-disabled] .box{background:Canvas;border-color:GrayText;}.row[data-disabled] .box{background:Canvas;border-color:GrayText;}.row[data-disabled] .dot{background:GrayText;}.row:not([data-disabled]):is(:hover,:active) .box{background:Canvas;border-color:CanvasText;}.row[data-selected]:not([data-disabled]):is(:hover,:active) .box{background:Highlight;border-color:Highlight;}.row[data-invalid] .box,.row[data-invalid]:not([data-disabled]):is(:hover,:active) .box{border-color:CanvasText;}input:focus-visible+.box::after{border-color:Highlight;}}
`;
