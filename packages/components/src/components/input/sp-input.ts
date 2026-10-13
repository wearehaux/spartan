import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { TextControl, type TextControlSize, type TextControlAppearance } from '../shared/text-control.js';
import { inputStyles } from './sp-input.styles.js';

export type InputType = 'text' | 'email' | 'password' | 'number';
export type InputSize = TextControlSize;
export type InputAppearance = TextControlAppearance;
const TYPES: InputType[] = ['text', 'email', 'password', 'number'];

/** Native single-line entry; label, description, error, decorative start and named end slots. */
export class SpInput extends TextControl {
  static override styles = inputStyles;
  static override properties = { ...TextControl.properties, type: { reflect: true }, min: {}, max: {}, step: {}, pattern: {} };
  declare type: InputType;
  declare min: string | undefined;
  declare max: string | undefined;
  declare step: string | undefined;
  declare pattern: string | undefined;
  constructor() { super(); this.type = 'text'; }
  protected get control(): HTMLInputElement | null { return this.renderRoot?.querySelector('input') ?? null; }
  #onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing || this.controlDisabled) return;
    // A microtask can run between DOM listeners. Defer until bubbling is over
    // so a consumer's preventDefault can cancel implicit submission.
    setTimeout(() => {
      const form = this.form; if (!form || event.defaultPrevented || this.controlDisabled) return;
      // form.elements intentionally omits image inputs. Use tree order and
      // actual form ownership so external form="..." submitters also work.
      const submitter = [...(form.getRootNode() as Document | ShadowRoot).querySelectorAll('button,input,sp-button,sp-icon-button')].find(el =>
        (el as HTMLButtonElement).form === form && (
        el instanceof HTMLButtonElement && el.type === 'submit' || el instanceof HTMLInputElement && ['submit', 'image'].includes(el.type) ||
        ['sp-button', 'sp-icon-button'].includes(el.localName) && el.getAttribute('type') === 'submit'));
      if (submitter) {
        if (submitter.matches(':disabled')) return;
        const button = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : submitter.shadowRoot?.querySelector<HTMLButtonElement>('button');
        button?.click();
      } else {
        const blocking = [...form.elements].filter(el => el instanceof HTMLInputElement && ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'date', 'datetime-local', 'time', 'month', 'week'].includes(el.type) || el.localName === 'sp-input');
        if (blocking.length <= 1) HTMLFormElement.prototype.requestSubmit.call(form);
      }
    }, 0);
  }


  protected override renderLeading() {
    return html`<span part="start" class="icon" aria-hidden="true" ?hidden=${!this.hasSlot('start')}><slot name="start" @slotchange=${this.onSlotChange}></slot></span>`;
  }
  protected override renderTrailing() {
    return html`<span part="end" class="end" ?hidden=${!this.hasSlot('end')}><slot name="end" @slotchange=${this.onSlotChange}></slot></span>`;
  }
  protected renderControl(described: string) {
    return html`<input id="control" class="control" part="input" type=${TYPES.includes(this.type) ? this.type : 'text'} name=${this.name ?? ''}
      .value=${live(this.value)} placeholder=${this.placeholder ?? ''} aria-label=${this.ariaLabel?.trim() || nothing}
      aria-describedby=${described || nothing} aria-invalid=${this.invalidState ? 'true' : nothing}
      ?disabled=${this.controlDisabled} ?readonly=${this.readOnly} ?required=${this.required}
      min=${ifDefined(this.min ?? undefined)} max=${ifDefined(this.max ?? undefined)} step=${ifDefined(this.step ?? undefined)} pattern=${ifDefined(this.pattern ?? undefined)}
      minlength=${ifDefined(this.minLength ?? undefined)} maxlength=${ifDefined(this.maxLength ?? undefined)}
      autocomplete=${this.autocomplete ?? ''} inputmode=${this.inputMode ?? ''}
      @input=${this.onInput} @change=${this.onChange} @keydown=${this.#onKeydown} @focus=${this.syncA11y} />`;
  }
}

declare global { interface HTMLElementTagNameMap { 'sp-input': SpInput; } }
