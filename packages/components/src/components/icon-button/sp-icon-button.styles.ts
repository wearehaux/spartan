import { css } from 'lit';
import { actionStyles } from '../shared/action.styles.js';

// Sizes follow the Figma Icon Button set: Base 40 px, Small 32 px, Extra small
// 24 px in Relaxed density. Local Icon Button aliases reuse the Button height
// and Density glyph roles, preserving the Figma size tiers without duplication.
export const iconButtonStyles = [
  actionStyles,
  css`
    button {
      --_size: var(--sp-icon-button-size-base);
      --_icon: var(--sp-icon-button-icon-size-base);
      --_focus-color: var(--sp-icon-button-focus-color);
      --_focus-radius: var(--sp-icon-button-focus-radius);
      --_focus-width: var(--sp-icon-button-focus-width);
      --_focus-offset: var(--sp-icon-button-focus-offset);

      width: var(--_size);
      height: var(--_size);
      padding: 0;
    }

    :host([size='sm']) button {
      --_size: var(--sp-icon-button-size-sm);
      --_icon: var(--sp-icon-button-icon-size-sm);
    }

    :host([size='xs']) button {
      --_size: var(--sp-icon-button-size-xs);
      --_icon: var(--sp-icon-button-icon-size-xs);
    }

    .icon {
      display: block;
      flex: none;
      width: var(--_icon);
      height: var(--_icon);
    }
  `,
];
