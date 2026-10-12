import { css } from 'lit';
import { actionStyles } from '../shared/action.styles.js';

// Sizes follow the Figma Button set: Base is 40 px and Small is 32 px in Relaxed
// density, 32 px and 28 px in Compact. Heights, paddings, type, and icon sizes are
// bound to Component and Density variables, so they change with the density mode.
export const buttonStyles = [
  actionStyles,
  css`
    button {
      --_height: var(--sp-button-height-base);
      --_outer: var(--sp-button-outer-padding-x-base);
      --_label: var(--sp-button-label-padding-x-base);
      --_icon: var(--sp-button-icon-size-base);
      --_font: var(--sp-button-font-size-base);
      --_line: var(--sp-button-line-height-base);

      height: var(--_height);
      padding-block: 0;
      padding-inline: var(--_outer);
      font-size: var(--_font);
      line-height: var(--_line);
    }

    :host([size='sm']) button {
      --_height: var(--sp-button-height-sm);
      --_outer: var(--sp-button-outer-padding-x-sm);
      --_label: var(--sp-button-label-padding-x-sm);
      --_icon: var(--sp-button-icon-size-sm);
      --_font: var(--sp-button-font-size-sm);
      --_line: var(--sp-button-line-height-sm);
    }

    /* A label wider than its container truncates instead of overflowing the button. */
    .label {
      display: block;
      min-inline-size: 0;
      padding-inline: var(--_label);
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
    }

    .icon {
      display: none;
      flex: none;
      width: var(--_icon);
      height: var(--_icon);
    }

    .icon.has-content {
      display: block;
    }

    :host([loading]) button {
      cursor: progress;
    }

    :host([loading]) .label,
    :host([loading]) .icon {
      opacity: 0;
    }

    .spinner {
      position: absolute;
      inset: 0;
      margin: auto;
      display: none;
      align-items: center;
      justify-content: space-between;
      width: 16px;
      height: 16px;
    }

    :host([loading]) .spinner {
      display: flex;
    }

    .spinner span {
      width: 2px;
      height: 8px;
      border-radius: 1.25px;
      background: currentColor;
      animation: wave 800ms ease-in-out infinite;
    }

    .spinner span:nth-child(even) {
      height: 12px;
      animation-delay: -400ms;
    }

    .spinner span:nth-child(3) {
      animation-delay: -200ms;
    }

    .spinner span:nth-child(4) {
      animation-delay: -600ms;
    }

    @keyframes wave {
      50% {
        transform: scaleY(0.5);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner span {
        animation: none;
      }
    }
  `,
];
