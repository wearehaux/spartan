import { css } from 'lit';
import { fieldStyles } from '../shared/field.styles.js';

export const textareaStyles = [fieldStyles, css`
  .field {
    --_radius: var(--sp-field-multiline-radius);
    --_focus-radius: min(var(--sp-field-focus-radius), calc(var(--sp-field-multiline-radius) + var(--sp-field-focus-offset)));
    align-items: stretch; min-block-size: var(--sp-field-textarea-min-height-default); padding-block: var(--sp-field-padding-x-small);
  }
  textarea {
    min-block-size: max(var(--sp-prim-space-0), calc(var(--sp-field-textarea-min-height-default) - var(--sp-field-padding-x-small) * 2 - var(--_side) - var(--_bottom)));
    resize: vertical; overflow: auto;
  }
  textarea[data-resize='none'] { resize: none; }
`];
