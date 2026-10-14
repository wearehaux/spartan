import { html } from 'lit';
import { BinarySelectionControl } from '../shared/binary-selection.js';
import { checkboxStyles } from './sp-checkbox.styles.js';

/** Checkbox adds mixed state and its owned indicator to shared native selection mechanics. */
export class SpCheckbox extends BinarySelectionControl {
  static override styles = checkboxStyles;
  static override properties = { ...BinarySelectionControl.properties, indeterminate: { type: Boolean } };
  declare indeterminate: boolean;
  constructor() { super(); this.indeterminate = false; }
  protected override get mixedState() { return this.indeterminate; }
  protected override set mixedState(value: boolean) { this.indeterminate = value; }
  protected override renderIndicator() {
    return html`<span class="mark" part="indicator" ?data-mixed=${this.indeterminate} ?hidden=${!this.checked && !this.indeterminate}></span>`;
  }
}
declare global { interface HTMLElementTagNameMap { 'sp-checkbox': SpCheckbox; } }
