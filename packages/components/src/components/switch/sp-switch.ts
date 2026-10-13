import { html } from 'lit';
import { BinarySelectionControl } from '../shared/binary-selection.js';
import { switchStyles } from './sp-switch.styles.js';
export type SwitchSize = 'sm' | 'base' | 'lg';
export type SwitchShape = 'default' | 'rounded' | 'square';
export type SwitchAppearance = 'plain' | 'boxed';
export type SwitchPlacement = 'start' | 'end';

/** Binary native checkbox semantics exposed as an accessible switch. */
export class SpSwitch extends BinarySelectionControl {
  static override styles = switchStyles;
  static override properties = { ...BinarySelectionControl.properties,
    size: { reflect: true }, shape: { reflect: true }, appearance: { reflect: true }, placement: { reflect: true },
  };
  declare size: SwitchSize;
  declare shape: SwitchShape;
  declare appearance: SwitchAppearance;
  declare placement: SwitchPlacement;
  constructor() { super(); this.size = 'base'; this.shape = 'default'; this.appearance = 'plain'; this.placement = 'start';
    this.addEventListener('click', event => {
      if (this.appearance !== 'boxed') return;
      const path = event.composedPath();
      if (!path.includes(this.renderRoot.querySelector('.selection')!)) return;
      if (path.includes(this.renderRoot.querySelector('.row')!) || path.some(node => node instanceof Element && node.matches('a, button, input, select, textarea, [contenteditable], [role="button"]'))) return;
      this.activateAfterClick(event);
    });
  }
  protected override get inputRole() { return 'switch'; }
  protected override renderIndicator() { return html`<span class="thumb" part="thumb"><span class="icon" part="icon"><slot name="icon"></slot></span></span>`; }
}
declare global { interface HTMLElementTagNameMap { 'sp-switch': SpSwitch; } }
