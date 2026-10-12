import { css } from 'lit';

// Color, state, and shape rules shared by sp-button and sp-icon-button.
// Every value is a generated --sp-* variable. Fill, foreground, and border per variant and state
// come from the Style collection (the style button tokens), so Atlas, Selene, Helios, and Ares change
// them, the corner radius, and the Secondary treatment. Buttons carry no shadow.
// Spacing and alignment use logical properties, so an inherited or nested `dir` mirrors the layout.
export const actionStyles = css`
  :host {
    display: inline-flex;
    max-inline-size: 100%;
    vertical-align: middle;
  }

  :host([hidden]) {
    display: none;
  }

  button {
    --_fill: var(--sp-style-button-primary-background-default);
    --_fill-hover: var(--sp-style-button-primary-background-hover);
    --_fill-active: var(--sp-style-button-primary-background-pressed);
    --_color: var(--sp-style-button-primary-foreground-default);
    --_color-hover: var(--sp-style-button-primary-foreground-hover);
    --_color-active: var(--sp-style-button-primary-foreground-pressed);
    --_border: var(--sp-style-button-primary-border-default);
    --_border-hover: var(--sp-style-button-primary-border-hover);
    --_border-active: var(--sp-style-button-primary-border-pressed);

    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
    margin: 0;
    border: var(--sp-style-button-border-width) solid var(--_border);
    border-radius: var(--sp-style-button-radius);
    background: var(--_fill);
    color: var(--_color);
    font-family: var(--sp-font-family-body), system-ui, sans-serif;
    font-weight: var(--sp-font-weight-emphasis);
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  :host([variant='secondary']) button {
    --_fill: var(--sp-style-button-secondary-background-default);
    --_fill-hover: var(--sp-style-button-secondary-background-hover);
    --_fill-active: var(--sp-style-button-secondary-background-pressed);
    --_color: var(--sp-style-button-secondary-foreground-default);
    --_color-hover: var(--sp-style-button-secondary-foreground-hover);
    --_color-active: var(--sp-style-button-secondary-foreground-pressed);
    --_border: var(--sp-style-button-secondary-border-default);
    --_border-hover: var(--sp-style-button-secondary-border-hover);
    --_border-active: var(--sp-style-button-secondary-border-pressed);
  }

  :host([variant='danger']) button {
    --_fill: var(--sp-style-button-danger-background-default);
    --_fill-hover: var(--sp-style-button-danger-background-hover);
    --_fill-active: var(--sp-style-button-danger-background-pressed);
    --_color: var(--sp-style-button-danger-foreground-default);
    --_color-hover: var(--sp-style-button-danger-foreground-hover);
    --_color-active: var(--sp-style-button-danger-foreground-pressed);
    --_border: var(--sp-style-button-danger-border-default);
    --_border-hover: var(--sp-style-button-danger-border-hover);
    --_border-active: var(--sp-style-button-danger-border-pressed);
  }

  :host([variant='warning']) button {
    --_fill: var(--sp-style-button-warning-background-default);
    --_fill-hover: var(--sp-style-button-warning-background-hover);
    --_fill-active: var(--sp-style-button-warning-background-pressed);
    --_color: var(--sp-style-button-warning-foreground-default);
    --_color-hover: var(--sp-style-button-warning-foreground-hover);
    --_color-active: var(--sp-style-button-warning-foreground-pressed);
    --_border: var(--sp-style-button-warning-border-default);
    --_border-hover: var(--sp-style-button-warning-border-hover);
    --_border-active: var(--sp-style-button-warning-border-pressed);
  }

  :host([variant='danger-subtle']) button {
    --_fill: var(--sp-style-button-danger-subtle-background-default);
    --_fill-hover: var(--sp-style-button-danger-subtle-background-hover);
    --_fill-active: var(--sp-style-button-danger-subtle-background-pressed);
    --_color: var(--sp-style-button-danger-subtle-foreground-default);
    --_color-hover: var(--sp-style-button-danger-subtle-foreground-hover);
    --_color-active: var(--sp-style-button-danger-subtle-foreground-pressed);
    --_border: var(--sp-style-button-danger-subtle-border-default);
    --_border-hover: var(--sp-style-button-danger-subtle-border-hover);
    --_border-active: var(--sp-style-button-danger-subtle-border-pressed);
  }

  :host([variant='ghost']) button {
    --_fill: var(--sp-style-button-ghost-background-default);
    --_fill-hover: var(--sp-style-button-ghost-background-hover);
    --_fill-active: var(--sp-style-button-ghost-background-pressed);
    --_color: var(--sp-style-button-ghost-foreground-default);
    --_color-hover: var(--sp-style-button-ghost-foreground-hover);
    --_color-active: var(--sp-style-button-ghost-foreground-pressed);
    --_border: var(--sp-style-button-ghost-border-default);
    --_border-hover: var(--sp-style-button-ghost-border-hover);
    --_border-active: var(--sp-style-button-ghost-border-pressed);
  }

  :host([variant='dashed']) button {
    --_fill: var(--sp-style-button-dashed-background-default);
    --_fill-hover: var(--sp-style-button-dashed-background-hover);
    --_fill-active: var(--sp-style-button-dashed-background-pressed);
    --_color: var(--sp-style-button-dashed-foreground-default);
    --_color-hover: var(--sp-style-button-dashed-foreground-hover);
    --_color-active: var(--sp-style-button-dashed-foreground-pressed);
    --_border: var(--sp-style-button-dashed-border-default);
    --_border-hover: var(--sp-style-button-dashed-border-hover);
    --_border-active: var(--sp-style-button-dashed-border-pressed);
    border-style: dashed;
  }

  @media (hover: hover) {
    button:hover:not(:disabled):not([aria-busy='true']) {
      border-color: var(--_border-hover);
      background: var(--_fill-hover);
      color: var(--_color-hover);
    }
  }

  button:active:not(:disabled):not([aria-busy='true']) {
    border-color: var(--_border-active);
    background: var(--_fill-active);
    color: var(--_color-active);
  }

  button:focus-visible {
    outline: none;
  }

  /* Figma's focus frame sits outside the border edge. Component aliases retain
     the approved 4px offset, 2px stroke and Style-owned radius. */
  button:focus-visible::after {
    content: '';
    position: absolute;
    inset: calc(-1 * (var(--sp-button-focus-offset) + var(--sp-style-button-border-width)));
    box-sizing: border-box;
    border: var(--sp-button-focus-width) solid var(--sp-button-focus-color);
    border-radius: var(--sp-button-focus-radius);
    pointer-events: none;
  }

  @media (forced-colors: active) {
    button:focus-visible::after {
      border-color: Highlight;
    }
  }

  /* Disabled is one surface for every variant and style, with no border, as in Figma. The
     variant rules set the same custom properties with higher specificity, so this rule repeats
     the variant selector to win over every variant. */
  button:disabled,
  :host([variant]) button:disabled {
    --_fill: var(--sp-color-surface-disabled);
    --_color: var(--sp-color-foreground-disabled);
    --_border: transparent;
    background: var(--_fill);
    cursor: not-allowed;
  }

  :host([variant='ghost']) button:disabled {
    --_fill: transparent;
  }

  ::slotted(svg),
  ::slotted(img) {
    display: block;
    width: 100%;
    height: 100%;
  }
`;
