import { LitElement, type CSSResultGroup } from 'lit';
import { actionStyles } from './action.styles.js';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dashed' | 'danger-subtle' | 'warning';
export type ButtonType = 'button' | 'submit' | 'reset';

/**
 * Behavior shared by sp-button and sp-icon-button: a native `<button>` in the
 * shadow root, form association, and activation. Internal; not exported.
 */
export abstract class SpActionBase extends LitElement {
  static override styles: CSSResultGroup = actionStyles;
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static formAssociated = true;

  static override properties = {
    variant: { reflect: true },
    type: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { reflect: true },
    value: { reflect: true },
  };

  /** Visual emphasis. */
  declare variant: ButtonVariant;
  /** Native button behavior inside a form. */
  declare type: ButtonType;
  /** Prevents interaction and removes the control from the tab order. */
  declare disabled: boolean;
  /** Submitted with the form when this control submits it. */
  declare name: string;
  /** Submitted with the form when this control submits it. */
  declare value: string;

  readonly #internals: ElementInternals;
  #formDisabled = false;

  constructor() {
    super();
    this.variant = 'primary';
    this.type = 'button';
    this.disabled = false;
    this.name = '';
    this.value = '';
    this.#internals = this.attachInternals();
  }

  /** The form this control is associated with, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** True when `disabled` is set or an ancestor fieldset disables the control. */
  protected get isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

  /** Subclasses add states that suppress activation without disabling. */
  protected get isBlocked(): boolean {
    return this.isDisabled;
  }

  formDisabledCallback(disabled: boolean) {
    this.#formDisabled = disabled;
    // Reflecting our own disabled attribute can invoke this callback during
    // Lit's update. Requesting another update synchronously is then swallowed,
    // leaving the native button stale when the attribute is removed.
    queueMicrotask(() => this.requestUpdate());
  }

  protected override async getUpdateComplete(): Promise<boolean> {
    let complete = await super.getUpdateComplete();
    // Include a render queued by formDisabledCallback during the first render.
    // Consumers can safely focus or activate immediately after updateComplete.
    while (this.isUpdatePending) complete = await super.getUpdateComplete();
    return complete;
  }

  protected handleClick(event: Event) {
    if (this.isBlocked) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    const form = this.#internals.form;
    if (!form) return;
    if (this.type === 'reset') form.reset();
    else if (this.type === 'submit') this.#submit(form);
  }

  // requestSubmit() needs a native submitter to carry name/value, so a hidden
  // proxy button stands in for this element for the duration of the call.
  #submit(form: HTMLFormElement) {
    const proxy = document.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    if (this.name) {
      proxy.name = this.name;
      proxy.value = this.value;
    }
    form.append(proxy);
    try {
      form.requestSubmit(proxy);
    } finally {
      proxy.remove();
    }
  }
}
