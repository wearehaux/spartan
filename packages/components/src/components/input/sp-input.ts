import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { inputStyles } from './sp-input.styles.js';

export type InputType = 'text' | 'email' | 'password' | 'number';
export type InputSize = 'sm' | 'base';
export type InputAppearance = 'default' | 'outlined' | 'filled';
const TYPES: InputType[] = ['text', 'email', 'password', 'number'];
const FLAGS = ['badInput', 'customError', 'patternMismatch', 'rangeOverflow', 'rangeUnderflow', 'stepMismatch', 'tooLong', 'tooShort', 'typeMismatch', 'valueMissing'] as const;

/** Native text entry with Field tokens and form association.
 * @slot label - Visible label, overriding the label property.
 * @slot description - Supporting text.
 * @slot error - Error message; participates in custom validity.
 * @slot start - Decorative leading glyph.
 * @slot end - Trailing glyph or independently named action.
 * @fires input - Native composed input event; value is synchronized first.
 * @fires change - One composed change event on committed edits.
 */
export class SpInput extends LitElement {
  static override styles = inputStyles;
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static formAssociated = true;
  static override properties = {
    type: { reflect: true }, size: { reflect: true }, appearance: { reflect: true },
    value: { attribute: false, noAccessor: true }, defaultValue: { attribute: 'value' },
    name: { reflect: true }, label: {}, ariaLabel: { attribute: 'aria-label', reflect: true },
    labelledBy: { attribute: 'aria-labelledby' }, describedBy: { attribute: 'aria-describedby' },
    placeholder: {}, description: {}, error: {}, invalid: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true }, readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    required: { type: Boolean, reflect: true }, min: {}, max: {}, step: {}, pattern: {},
    minLength: { type: Number, attribute: 'minlength' }, maxLength: { type: Number, attribute: 'maxlength' },
    autocomplete: {}, inputMode: { attribute: 'inputmode' },
  };

  declare type: InputType;
  declare size: InputSize;
  declare appearance: InputAppearance;
  declare defaultValue: string;
  declare name: string;
  declare label: string;
  declare ariaLabel: string | null;
  declare labelledBy: string;
  declare describedBy: string;
  declare placeholder: string;
  declare description: string;
  declare error: string;
  declare invalid: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare min: string | undefined;
  declare max: string | undefined;
  declare step: string | undefined;
  declare pattern: string | undefined;
  declare minLength: number | undefined;
  declare maxLength: number | undefined;
  declare autocomplete: string;
  declare inputMode: string;

  readonly #internals: ElementInternals;
  #value = '';
  #dirty = false;
  #formDisabled = false;
  #customError = '';
  #showValidity = false;
  #observer: MutationObserver | undefined;
  #labelObserver: MutationObserver | undefined;

  constructor() {
    super(); this.#internals = this.attachInternals();
    this.type = 'text'; this.size = 'base'; this.appearance = 'default';
    this.defaultValue = ''; this.name = ''; this.label = ''; this.ariaLabel = null;
    this.labelledBy = ''; this.describedBy = ''; this.placeholder = ''; this.description = ''; this.error = '';
    this.invalid = false; this.disabled = false; this.readOnly = false; this.required = false;
    this.autocomplete = ''; this.inputMode = '';
    this.addEventListener('invalid', () => { this.#showValidity = true; this.requestUpdate(); });
  }

  get value(): string { return this.#value; }
  set value(value: string) {
    const old = this.#value; this.#dirty = true; this.#value = String(value ?? '');
    const input = this.#input;
    if (input) { input.value = this.#value; this.#value = input.value; this.#sync(); }
    this.requestUpdate('value', old);
  }
  get form(): HTMLFormElement | null { return this.#internals.form; }
  get validity(): ValidityState { return this.#internals.validity; }
  get validationMessage(): string { return this.#internals.validationMessage; }
  get willValidate(): boolean { return this.#input?.willValidate ?? false; }
  checkValidity(): boolean { this.#sync(); return this.#internals.checkValidity(); }
  reportValidity(): boolean { this.#sync(); return this.#internals.reportValidity(); }
  setCustomValidity(message: string) { this.#customError = String(message ?? ''); this.#sync(); this.requestUpdate(); }
  select() { this.#input?.select(); }
  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none') { this.#input?.setSelectionRange(start, end, direction); }

  override connectedCallback() {
    super.connectedCallback();
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['slot'] });
  }
  override disconnectedCallback() { this.#observer?.disconnect(); this.#labelObserver?.disconnect(); super.disconnectedCallback(); }
  formDisabledCallback(disabled: boolean) { this.#formDisabled = disabled; queueMicrotask(() => this.requestUpdate()); }
  formResetCallback() {
    this.#dirty = false; this.#value = String(this.defaultValue ?? ''); this.#showValidity = false;
    if (this.#input) { this.#input.value = this.#value; this.#sync(); }
    this.requestUpdate();
  }
  formStateRestoreCallback(state: string | File | FormData | null) { if (typeof state === 'string') this.value = state; }
  protected override async getUpdateComplete(): Promise<boolean> {
    let done = await super.getUpdateComplete();
    while (this.isUpdatePending) done = await super.getUpdateComplete();
    return done;
  }
  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('defaultValue') && !this.#dirty) this.#value = String(this.defaultValue ?? '');
  }
  protected override updated() { this.#sync(); }

  get #input(): HTMLInputElement | null { return this.renderRoot?.querySelector('input') ?? null; }
  get #disabled() { return this.disabled || this.#formDisabled; }
  #hasSlot(name: string): boolean { return [...this.children].some(el => el.getAttribute('slot') === name); }
  #errorText(): string { return String(this.error ?? '').trim() || [...this.children].filter(el => el.getAttribute('slot') === 'error').map(el => el.textContent).join(' ').trim(); }
  get #invalid() { return this.invalid || !!this.#errorText() || (this.#showValidity && !this.#internals.validity.valid); }
  #ids(ids: string | null): Element[] {
    const root = this.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return [];
    return (ids ?? '').trim().split(/\s+/).map(id => root.getElementById(id)).filter((el): el is HTMLElement => !!el);
  }
  #syncA11y() {
    const input = this.#input; if (!input) return;
    const explicit = this.#ids(this.labelledBy);
    const labels = explicit.length ? explicit : !this.label?.trim() && !this.#hasSlot('label') && !this.ariaLabel?.trim() ? [...this.#internals.labels].filter((el): el is Element => el instanceof Element) : [];
    if ('ariaLabelledByElements' in (input as object)) input.ariaLabelledByElements = labels;
    // Some engines expose cross-root element references but do not expose the
    // associated light-DOM label in the accessibility tree. Keep a text fallback.
    const name = labels.length ? labels.map(el => this.#labelText(el)).join(' ') : this.ariaLabel?.trim();
    if (name) input.setAttribute('aria-label', name); else input.removeAttribute('aria-label');
    this.#labelObserver ??= new MutationObserver(() => this.#syncA11y());
    this.#labelObserver.disconnect();
    if (this.isConnected) for (const label of labels) this.#labelObserver.observe(label, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label'] });
    const local = ['description', 'error'].map(id => this.renderRoot.querySelector<HTMLElement>(`#${id}`)).filter((el): el is HTMLElement => !!el && !el.hidden);
    const external = this.#ids(this.describedBy);
    if (external.length && 'ariaDescribedByElements' in input) input.ariaDescribedByElements = [...local, ...external];
    else {
      if ('ariaDescribedByElements' in input) input.ariaDescribedByElements = [];
      if (local.length) input.setAttribute('aria-describedby', local.map(el => el.id).join(' '));
      else input.removeAttribute('aria-describedby');
    }
  }
  #labelText(label: Element): string {
    const explicit = label.getAttribute('aria-label'); if (explicit?.trim()) return explicit.trim();
    const walk = document.createTreeWalker(label, NodeFilter.SHOW_TEXT, { acceptNode: node => {
      const hidden = node.parentElement?.closest('[aria-hidden="true"],[hidden]');
      return hidden && hidden !== label && label.contains(hidden) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    } });
    const parts: string[] = []; while (walk.nextNode()) parts.push(walk.currentNode.textContent ?? '');
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  #sync() {
    const input = this.#input; if (!input) return;
    this.#value = input.value;
    input.setCustomValidity(this.#errorText() || this.#customError);
    const flags: ValidityStateFlags = {};
    if (input.willValidate) for (const key of FLAGS) flags[key] = input.validity[key];
    const old = this.#internals.validity.valid, oldMessage = this.#internals.validationMessage;
    this.#internals.setFormValue(this.#disabled ? null : this.#value, this.#value);
    this.#internals.setValidity(flags, input.willValidate ? input.validationMessage : '', input);
    this.#syncA11y();
    if (this.#showValidity && (old !== this.#internals.validity.valid || oldMessage !== this.#internals.validationMessage)) this.requestUpdate();
  }
  #onInput(event: Event) {
    this.#dirty = true; const old = this.#value; this.#value = (event.target as HTMLInputElement).value;
    this.#sync(); this.requestUpdate('value', old);
  }
  #onChange(event: Event) { this.#onInput(event); event.stopPropagation(); this.dispatchEvent(new Event('change', { bubbles: true, composed: true })); }
  #onSlotChange() { this.requestUpdate(); }
  #onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing || this.#disabled) return;
    // A microtask can run between DOM listeners. Defer until bubbling is over
    // so a consumer's preventDefault can cancel implicit submission.
    setTimeout(() => {
      const form = this.form; if (!form || event.defaultPrevented || this.#disabled) return;
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

  override render() {
    const hasLabel = !!this.label?.trim() || this.#hasSlot('label');
    const hasDescription = !!this.description?.trim() || this.#hasSlot('description');
    const message = this.#errorText() || (this.#showValidity ? this.validationMessage : '');
    const hasError = !!message || this.#hasSlot('error');
    const described = [hasDescription ? 'description' : '', hasError ? 'error' : ''].filter(Boolean).join(' ');
    return html`
      <label part="label" class="label" for="control" ?hidden=${!hasLabel}><slot name="label" @slotchange=${this.#onSlotChange}>${this.label}</slot>${this.required ? html`<span aria-hidden="true">*</span>` : nothing}</label>
      <div part="field" class="field" data-appearance=${this.appearance} data-size=${this.size} ?data-disabled=${this.#disabled} ?data-readonly=${this.readOnly} ?data-invalid=${this.#invalid && !this.#disabled}>
        <span part="start" class="icon" aria-hidden="true" ?hidden=${!this.#hasSlot('start')}><slot name="start" @slotchange=${this.#onSlotChange}></slot></span>
        <input id="control" part="input" type=${TYPES.includes(this.type) ? this.type : 'text'} name=${this.name ?? ''}
          .value=${live(this.#value)} placeholder=${this.placeholder ?? ''} aria-label=${this.ariaLabel?.trim() || nothing}
          aria-describedby=${described || nothing} aria-invalid=${this.#invalid ? 'true' : nothing}
          ?disabled=${this.#disabled} ?readonly=${this.readOnly} ?required=${this.required}
          min=${ifDefined(this.min ?? undefined)} max=${ifDefined(this.max ?? undefined)} step=${ifDefined(this.step ?? undefined)} pattern=${ifDefined(this.pattern ?? undefined)}
          minlength=${ifDefined(this.minLength ?? undefined)} maxlength=${ifDefined(this.maxLength ?? undefined)}
          autocomplete=${this.autocomplete ?? ''} inputmode=${this.inputMode ?? ''}
          @input=${this.#onInput} @change=${this.#onChange} @keydown=${this.#onKeydown} @focus=${this.#syncA11y} />
        <span part="end" class="end" ?hidden=${!this.#hasSlot('end')}><slot name="end" @slotchange=${this.#onSlotChange}></slot></span>
      </div>
      <div id="description" part="description" class="message" ?hidden=${!hasDescription}><slot name="description" @slotchange=${this.#onSlotChange}>${this.description}</slot></div>
      <div id="error" part="error" class="message error" aria-live="polite" ?hidden=${!hasError}><slot name="error" @slotchange=${this.#onSlotChange}>${message}</slot></div>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'sp-input': SpInput; } }
