import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { accessibleLabelText, watchLabelAssociations } from './accessible-label.js';

/** Native checkbox activation and validity with an owned form-associated host. */
export abstract class BinarySelectionControl extends LitElement {
  static formAssociated = true;
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static override properties = {
    checked: { attribute: false, noAccessor: true }, defaultChecked: { type: Boolean, attribute: 'checked', reflect: true },
    disabled: { type: Boolean, reflect: true }, required: { type: Boolean, reflect: true },
    name: { reflect: true }, value: { reflect: true }, label: {}, description: {}, error: {}, invalid: { type: Boolean, reflect: true },
    ariaLabel: { attribute: 'aria-label' }, labelledBy: { attribute: 'labelled-by' }, describedBy: { attribute: 'described-by' },
  };
  declare defaultChecked: boolean;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string;
  declare value: string;
  declare label: string;
  declare description: string;
  declare error: string;
  declare invalid: boolean;
  declare ariaLabel: string | null;
  declare labelledBy: string;
  declare describedBy: string;
  readonly #internals: ElementInternals;
  #checked = false;
  #dirty = false;
  #formDisabled = false;
  #customError = '';
  #showValidity = false;
  #observer: MutationObserver | undefined;
  #labelsObserver: MutationObserver | undefined;
  #stopAssociations: (() => void) | undefined;
  #forwarding = false;

  constructor() {
    super(); this.#internals = this.attachInternals();
    this.defaultChecked = false; this.disabled = false; this.required = false;
    this.name = ''; this.value = 'on'; this.label = ''; this.description = ''; this.error = ''; this.invalid = false;
    this.ariaLabel = null; this.labelledBy = ''; this.describedBy = '';
    this.addEventListener('invalid', () => { this.#showValidity = true; this.requestUpdate(); });
    // A light-DOM <label for> activates the form-associated host. Let its click
    // finish (including cancellation), then let the native checkbox own toggling.
    this.addEventListener('click', event => {
      if (event.composedPath()[0] !== this) return;
      this.activateAfterClick(event);
    });
  }
  protected activateAfterClick(event: Event) {
    setTimeout(() => {
      if (event.defaultPrevented || this.#disabled || !this.isConnected) return;
      this.#forwarding = true; try { this.#control?.click(); } finally { this.#forwarding = false; }
    }, 0);
  }
  protected get mixedState() { return false; }
  protected set mixedState(_value: boolean) { /* Binary switches have no mixed state. */ }
  protected get inputRole(): string | undefined { return undefined; }
  protected abstract renderIndicator(): unknown;
  get #control() { return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null; }
  get #disabled() { return this.disabled || this.#formDisabled; }
  get checked() { return this.#checked; }
  set checked(value: boolean) {
    const old = this.#checked; this.#dirty = true; this.#checked = Boolean(value);
    if (this.#control) { this.#control.checked = this.#checked; this.#sync(); }
    this.requestUpdate('checked', old);
  }
  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#control?.willValidate ?? false; }
  checkValidity() { this.#sync(); return this.#internals.checkValidity(); }
  reportValidity() { this.#sync(); return this.#internals.reportValidity(); }
  setCustomValidity(message: string) { this.#customError = String(message ?? ''); this.#sync(); this.requestUpdate(); }
  override click() { if (!this.#disabled) this.#control?.click(); }
  formDisabledCallback(disabled: boolean) { this.#formDisabled = disabled; queueMicrotask(() => this.requestUpdate()); }
  formResetCallback() {
    this.#dirty = false; this.#checked = this.defaultChecked; this.mixedState = false; this.#showValidity = false;
    if (this.#control) { this.#control.checked = this.#checked; this.#control.indeterminate = false; this.#sync(); }
    this.requestUpdate();
  }
  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state !== 'string') return;
    try { const data: unknown = JSON.parse(state); if (Array.isArray(data) && data.length === 2 && data.every(v => typeof v === 'boolean')) { this.checked = data[0]; this.mixedState = data[1]; } } catch { /* Ignore states from incompatible component revisions. */ }
  }
  override connectedCallback() {
    super.connectedCallback();
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['slot'] });
    this.#stopAssociations = watchLabelAssociations(this, this.#syncA11y);
  }
  override disconnectedCallback() { this.#observer?.disconnect(); this.#labelsObserver?.disconnect(); this.#stopAssociations?.(); this.#stopAssociations = undefined; super.disconnectedCallback(); }
  protected override async getUpdateComplete(): Promise<boolean> {
    let done = await super.getUpdateComplete(); while (this.isUpdatePending) done = await super.getUpdateComplete(); return done;
  }
  protected override willUpdate(changed: PropertyValues<this>) { if (changed.has('defaultChecked') && !this.#dirty) this.#checked = this.defaultChecked; }
  protected override updated() { this.#sync(); }
  #hasSlot(name: string) { return [...this.children].some(el => el.getAttribute('slot') === name); }
  #errorText() { return this.error?.trim() || [...this.children].filter(el => el.getAttribute('slot') === 'error').map(el => el.textContent).join(' ').trim(); }
  #ids(ids: string) {
    const root = this.getRootNode(); if (!(root instanceof Document || root instanceof ShadowRoot)) return [];
    return (ids ?? '').trim().split(/\s+/).map(id => root.getElementById(id)).filter((el): el is HTMLElement => !!el);
  }
  #syncA11y = () => {
    const input = this.#control; if (!input) return;
    const explicit = this.#ids(this.labelledBy);
    const labels = explicit.length ? explicit : !this.label?.trim() && !this.#hasSlot('label') && !this.ariaLabel?.trim() ? [...this.#internals.labels].filter((el): el is Element => el instanceof Element) : [];
    if ('ariaLabelledByElements' in input) input.ariaLabelledByElements = labels;
    const name = labels.length ? labels.map(accessibleLabelText).join(' ') : this.ariaLabel?.trim();
    if (name) input.setAttribute('aria-label', name); else input.removeAttribute('aria-label');
    this.#labelsObserver ??= new MutationObserver(this.#syncA11y); this.#labelsObserver.disconnect();
    if (this.isConnected) for (const label of labels) {
      this.#labelsObserver.observe(label, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'aria-hidden', 'hidden'] });
      if (label.parentNode) this.#labelsObserver.observe(label.parentNode, { childList: true });
    }
    const local = ['description', 'error'].map(id => this.renderRoot.querySelector<HTMLElement>(`#${id}`)).filter((el): el is HTMLElement => !!el && !el.hidden);
    const external = this.#ids(this.describedBy);
    if (external.length && 'ariaDescribedByElements' in input) input.ariaDescribedByElements = [...local, ...external];
    else {
      if ('ariaDescribedByElements' in input) input.ariaDescribedByElements = [];
      if (local.length) input.setAttribute('aria-describedby', local.map(el => el.id).join(' ')); else input.removeAttribute('aria-describedby');
    }
  };
  #sync() {
    const input = this.#control; if (!input) return;
    input.indeterminate = this.mixedState;
    input.setCustomValidity(this.#errorText() || this.#customError);
    const old = this.#internals.validity.valid, oldMessage = this.#internals.validationMessage;
    const flags: ValidityStateFlags = input.willValidate ? { valueMissing: input.validity.valueMissing, customError: input.validity.customError } : {};
    this.#internals.setFormValue(!this.#disabled && this.#checked ? String(this.value ?? 'on') : null, JSON.stringify([this.#checked, this.mixedState]));
    this.#internals.setValidity(flags, input.willValidate ? input.validationMessage : '', input);
    this.#syncA11y();
    if (this.#showValidity && (old !== this.#internals.validity.valid || oldMessage !== this.#internals.validationMessage)) this.requestUpdate();
  }
  #onInput() {
    const input = this.#control; if (!input) return;
    this.#dirty = true; const old = this.#checked; this.#checked = input.checked; this.mixedState = input.indeterminate;
    this.#sync(); this.requestUpdate('checked', old);
  }
  #onChange(event: Event) { this.#onInput(); event.stopPropagation(); this.dispatchEvent(new Event('change', { bubbles: true, composed: true })); }
  #onClick(event: Event) { if (this.#disabled) event.preventDefault(); if (this.#forwarding) event.stopPropagation(); }
  #onSlotChange() { this.requestUpdate(); }
  override render() {
    const message = this.#errorText() || (this.#showValidity ? this.validationMessage : '');
    const hasDescription = !!this.description?.trim() || this.#hasSlot('description');
    const hasError = !!message || this.#hasSlot('error');
    const invalid = this.invalid || !!this.#errorText() || (this.#showValidity && !this.validity.valid);
    const described = [hasDescription ? 'description' : '', hasError ? 'error' : ''].filter(Boolean).join(' ');
    return html`<div class="selection" ?data-disabled=${this.#disabled} ?data-invalid=${invalid && !this.#disabled} ?data-selected=${this.checked || this.mixedState}>
      <label class="row" part="row" for="control">
        <span class="target" part="target">
          <input id="control" part="input" type="checkbox" role=${this.inputRole || nothing} .checked=${live(this.checked)} .indeterminate=${this.mixedState} name=${this.name ?? ''} value=${this.value ?? 'on'} ?disabled=${this.#disabled} ?required=${this.required} aria-label=${this.ariaLabel?.trim() || nothing} aria-invalid=${invalid ? 'true' : nothing} aria-describedby=${described || nothing} @input=${this.#onInput} @change=${this.#onChange} @click=${this.#onClick} @focus=${this.#syncA11y}>
          <span class="box" part="control" aria-hidden="true">${this.renderIndicator()}</span>
        </span>
        <span class="label" part="label" ?hidden=${!this.label?.trim() && !this.#hasSlot('label')}><slot name="label" @slotchange=${this.#onSlotChange}>${this.label}</slot>${this.required ? html`<span aria-hidden="true"> *</span>` : nothing}</span>
      </label>
      <div class="message" id="description" part="description" ?hidden=${!hasDescription}><slot name="description" @slotchange=${this.#onSlotChange}>${this.description}</slot></div>
      <div class="message error" id="error" part="error" aria-live="polite" ?hidden=${!hasError}><slot name="error" @slotchange=${this.#onSlotChange}>${message}</slot></div>
    </div>`;
  }
}
