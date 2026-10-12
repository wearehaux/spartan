import { html, nothing, type PropertyValues } from 'lit';
import { SpActionBase, type ButtonType, type ButtonVariant } from '../shared/sp-action-base.js';
import { iconButtonStyles } from './sp-icon-button.styles.js';

export type IconButtonVariant = Exclude<ButtonVariant, 'danger-subtle' | 'warning'>;
export type IconButtonSize = 'xs' | 'sm' | 'base';

/**
 * A square button that shows only an icon. An icon has no text, so `label` is
 * required to give the control an accessible name.
 *
 * Size names map to the Figma Icon Button set: `xs` is Extra small (24 px),
 * `sm` is Small (32 px), `base` is Base (40 px) in Relaxed density.
 * Style owns radius, neutral treatment and state colors through the shared action
 * recipe. Density owns square dimensions and glyph size; System owns focus.
 * The protected Figma set currently has only default variants and older shadows.
 *
 * @slot - The icon, usually an inline `<svg>` marked `aria-hidden`.
 * @csspart button - The native button element.
 */
export class SpIconButton extends SpActionBase {
  static override styles = iconButtonStyles;

  static override properties = {
    ...SpActionBase.properties,
    size: { reflect: true },
    label: { reflect: true },
  };

  declare variant: IconButtonVariant;
  /** Control size. Density modes scale each. */
  declare size: IconButtonSize;
  /** Accessible name, announced by assistive technology. Required. */
  declare label: string;

  constructor() {
    super();
    this.size = 'base';
    this.label = '';
  }

  override render() {
    return html`
      <button part="button" type="button" aria-label=${(this.label ?? '').trim() || nothing} ?disabled=${this.isDisabled} @click=${this.handleClick}>
        <span class="icon" aria-hidden="true"><slot></slot></span>
      </button>
    `;
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('label') && !(this.label ?? '').trim()) console.warn('<sp-icon-button> needs a `label` attribute so it has an accessible name.', this);
  }
}

export type { ButtonType };

declare global {
  interface HTMLElementTagNameMap {
    'sp-icon-button': SpIconButton;
  }
}
