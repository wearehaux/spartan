import { html, nothing } from 'lit';
import { SpActionBase, type ButtonType, type ButtonVariant } from '../shared/sp-action-base.js';
import { buttonStyles } from './sp-button.styles.js';

export type { ButtonType, ButtonVariant };
export type ButtonSize = 'sm' | 'base';

/**
 * An action button. Renders a native `<button>` in its shadow root, so Tab,
 * Enter, and Space behave as for any button, and works with forms: `type="submit"`
 * and `type="reset"` act on the closest form.
 *
 * Size names map to the Figma Button set: `sm` is Small, `base` is Base.
 * The six Figma states map to behavior: Default, Hover (`:hover`), Pressed
 * (`:active`), Focus (`:focus-visible`), Disabled (`disabled`), Loading (`loading`).
 *
 * The corner radius, the Secondary treatment, and every state color come from the active style
 * (Atlas, Selene, Helios, or Ares), so there is no `shape` property: Helios supplies the pill.
 * Layout follows the inherited `dir`: `start` is the leading side in LTR and RTL, and a nested
 * `dir` overrides it. Slotted icons are not mirrored; flip a direction-sensitive icon yourself.
 *
 * @slot - Button label.
 * @slot start - Icon before the label (Figma "Left icon").
 * @slot end - Icon after the label (Figma "Right icon").
 * @csspart button - The native button element.
 */
export class SpButton extends SpActionBase {
  static override styles = buttonStyles;

  static override properties = {
    ...SpActionBase.properties,
    size: { reflect: true },
    loading: { type: Boolean, reflect: true },
  };

  /** Control height, padding, and type size. Density modes scale each. */
  declare size: ButtonSize;
  /** Shows a spinner, hides the content, and ignores activation. The button stays focusable. */
  declare loading: boolean;

  constructor() {
    super();
    this.size = 'base';
    this.loading = false;
  }

  protected override get isBlocked() {
    return this.isDisabled || this.loading;
  }

  override render() {
    return html`
      <button part="button" type="button" ?disabled=${this.isDisabled} aria-busy=${this.loading ? 'true' : nothing} aria-disabled=${this.loading ? 'true' : nothing} @click=${this.handleClick}>
        <span class="icon"><slot name="start" @slotchange=${this.#iconChange}></slot></span>
        <span class="label"><slot></slot></span>
        <span class="icon"><slot name="end" @slotchange=${this.#iconChange}></slot></span>
        <span class="spinner" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      </button>
    `;
  }

  // Icon frames are 0-wide until something is slotted, as Figma hides them by default.
  #iconChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    slot.parentElement!.classList.toggle('has-content', slot.assignedNodes().length > 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sp-button': SpButton;
  }
}
