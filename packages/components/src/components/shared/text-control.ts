import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';

export type TextControlSize = 'sm' | 'base';
export type TextControlAppearance = 'default' | 'outlined' | 'filled';
const FLAGS = ['badInput', 'customError', 'patternMismatch', 'rangeOverflow', 'rangeUnderflow', 'stepMismatch', 'tooLong', 'tooShort', 'typeMismatch', 'valueMissing'] as const;

/** Shared native text-entry mechanics. Each component owns its actual control and extra behavior. */
export abstract class TextControl extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static formAssociated = true;
  static override properties = {
    size: { reflect: true }, appearance: { reflect: true },
    value: { attribute: false, noAccessor: true }, defaultValue: { attribute: 'value' },
    name: { reflect: true }, label: {}, ariaLabel: { attribute: 'aria-label', reflect: true },
    labelledBy: { attribute: 'aria-labelledby' }, describedBy: { attribute: 'aria-describedby' },
    placeholder: {}, description: {}, error: {}, invalid: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true }, readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    required: { type: Boolean, reflect: true },
    minLength: { type: Number, attribute: 'minlength' }, maxLength: { type: Number, attribute: 'maxlength' },
    autocomplete: {}, inputMode: { attribute: 'inputmode' },
  };

  declare size: TextControlSize;
  declare appearance: TextControlAppearance;
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
    this.size = 'base'; this.appearance = 'default';
    this.defaultValue = ''; this.name = ''; this.label = ''; this.ariaLabel = null;
    this.labelledBy = ''; this.describedBy = ''; this.placeholder = ''; this.description = ''; this.error = '';
    this.invalid = false; this.disabled = false; this.readOnly = false; this.required = false;
    this.autocomplete = ''; this.inputMode = '';
    this.addEventListener('invalid', () => { this.#showValidity = true; this.requestUpdate(); });
  }

  get value(): string { return this.#value; }
  set value(value: string) {
    const old = this.#value; this.#dirty = true; this.#value = String(value ?? '');
    const input = this.control;
    if (input) { input.value = this.#value; this.#value = input.value; this.sync(); }
    this.requestUpdate('value', old);
  }
  get form(): HTMLFormElement | null { return this.#internals.form; }
  get validity(): ValidityState { return this.#internals.validity; }
  get validationMessage(): string { return this.#internals.validationMessage; }
  get willValidate(): boolean { return this.control?.willValidate ?? false; }
  checkValidity(): boolean { this.sync(); return this.#internals.checkValidity(); }
  reportValidity(): boolean { this.sync(); return this.#internals.reportValidity(); }
  setCustomValidity(message: string) { this.#customError = String(message ?? ''); this.sync(); this.requestUpdate(); }
  select() { this.control?.select(); }
  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none') { this.control?.setSelectionRange(start, end, direction); }

  override connectedCallback() {
    super.connectedCallback();
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['slot'] });
  }
  override disconnectedCallback() { this.#observer?.disconnect(); this.#labelObserver?.disconnect(); super.disconnectedCallback(); }
  formDisabledCallback(disabled: boolean) { this.#formDisabled = disabled; queueMicrotask(() => this.requestUpdate()); }
  formResetCallback() {
    this.#dirty = false; this.#value = String(this.defaultValue ?? ''); this.#showValidity = false;
    if (this.control) { this.control.value = this.#value; this.sync(); }
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
  protected override updated() { this.sync(); }

  protected abstract get control(): HTMLInputElement | HTMLTextAreaElement | null;
  protected get controlDisabled() { return this.disabled || this.#formDisabled; }
  protected hasSlot(name: string): boolean { return [...this.children].some(el => el.getAttribute('slot') === name); }
  protected errorText(): string { return String(this.error ?? '').trim() || [...this.children].filter(el => el.getAttribute('slot') === 'error').map(el => el.textContent).join(' ').trim(); }
  protected get invalidState() { return this.invalid || !!this.errorText() || (this.#showValidity && !this.#internals.validity.valid); }
  #ids(ids: string | null): Element[] {
    const root = this.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return [];
    return (ids ?? '').trim().split(/\s+/).map(id => root.getElementById(id)).filter((el): el is HTMLElement => !!el);
  }
  protected syncA11y() {
    const input = this.control; if (!input) return;
    const explicit = this.#ids(this.labelledBy);
    const labels = explicit.length ? explicit : !this.label?.trim() && !this.hasSlot('label') && !this.ariaLabel?.trim() ? [...this.#internals.labels].filter((el): el is Element => el instanceof Element) : [];
    if ('ariaLabelledByElements' in (input as object)) input.ariaLabelledByElements = labels;
    // Some engines expose cross-root element references but do not expose the
    // associated light-DOM label in the accessibility tree. Keep a text fallback.
    const name = labels.length ? labels.map(el => this.#labelText(el)).join(' ') : this.ariaLabel?.trim();
    if (name) input.setAttribute('aria-label', name); else input.removeAttribute('aria-label');
    this.#labelObserver ??= new MutationObserver(() => this.syncA11y());
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
  protected sync() {
    const input = this.control; if (!input) return;
    this.#value = input.value;
    input.setCustomValidity(this.errorText() || this.#customError);
    const flags: ValidityStateFlags = {};
    if (input.willValidate) for (const key of FLAGS) flags[key] = input.validity[key];
    const old = this.#internals.validity.valid, oldMessage = this.#internals.validationMessage;
    this.#internals.setFormValue(this.controlDisabled ? null : this.#value, this.#value);
    this.#internals.setValidity(flags, input.willValidate ? input.validationMessage : '', input);
    this.syncA11y();
    if (this.#showValidity && (old !== this.#internals.validity.valid || oldMessage !== this.#internals.validationMessage)) this.requestUpdate();
  }
  protected captureEdit() {
    const input = this.control; if (!input) return;
    this.#dirty = true; const old = this.#value; this.#value = input.value;
    this.sync(); this.requestUpdate('value', old);
  }
  protected onInput(_event?: Event) { this.captureEdit(); }
  protected onChange(event: Event) { this.onInput(event); event.stopPropagation(); this.dispatchEvent(new Event('change', { bubbles: true, composed: true })); }
  protected onSlotChange() { this.requestUpdate(); }
  protected renderLeading(): TemplateResult | typeof nothing { return nothing; }
  protected renderTrailing(): TemplateResult | typeof nothing { return nothing; }
  protected abstract renderControl(described: string): TemplateResult;

  override render() {
    const hasLabel = !!this.label?.trim() || this.hasSlot('label');
    const hasDescription = !!this.description?.trim() || this.hasSlot('description');
    const message = this.errorText() || (this.#showValidity ? this.validationMessage : '');
    const hasError = !!message || this.hasSlot('error');
    const described = [hasDescription ? 'description' : '', hasError ? 'error' : ''].filter(Boolean).join(' ');
    return html`
      <label part="label" class="label" for="control" ?hidden=${!hasLabel}><slot name="label" @slotchange=${this.onSlotChange}>${this.label}</slot>${this.required ? html`<span aria-hidden="true">*</span>` : nothing}</label>
      <div part="field" class="field" data-appearance=${this.appearance} data-size=${this.size} ?data-disabled=${this.controlDisabled} ?data-readonly=${this.readOnly} ?data-invalid=${this.invalidState && !this.controlDisabled}>
        ${this.renderLeading()}
        ${this.renderControl(described)}
        ${this.renderTrailing()}
      </div>
      <div id="description" part="description" class="message" ?hidden=${!hasDescription}><slot name="description" @slotchange=${this.onSlotChange}>${this.description}</slot></div>
      <div id="error" part="error" class="message error" aria-live="polite" ?hidden=${!hasError}><slot name="error" @slotchange=${this.onSlotChange}>${message}</slot></div>
    `;
  }
}
