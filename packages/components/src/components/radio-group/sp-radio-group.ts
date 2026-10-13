import { LitElement, html, type PropertyValues } from 'lit';
import { accessibleLabelText, watchLabelAssociations } from '../shared/accessible-label.js';
import { radioGroupStyles } from './sp-radio-group.styles.js';
import { SpRadioGroupItem } from './sp-radio-group-item.js';
export type RadioGroupOrientation = 'vertical' | 'horizontal';
export class SpRadioGroup extends LitElement {
    static formAssociated = true;
    static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
    static override styles = radioGroupStyles;
    static override properties = { value: { attribute: false, noAccessor: true }, defaultValue: { attribute: 'value' }, name: { reflect: true }, disabled: { type: Boolean, reflect: true }, required: { type: Boolean, reflect: true }, invalid: { type: Boolean, reflect: true }, label: {}, description: {}, error: {}, orientation: { reflect: true }, ariaLabel: { attribute: 'aria-label' }, labelledBy: { attribute: 'labelled-by' }, describedBy: { attribute: 'described-by' } };
    declare defaultValue: string;
    declare name: string;
    declare disabled: boolean;
    declare required: boolean;
    declare invalid: boolean;
    declare label: string;
    declare description: string;
    declare error: string;
    declare orientation: RadioGroupOrientation;
    declare ariaLabel: string | null;
    declare labelledBy: string;
    declare describedBy: string;
    #internals: ElementInternals;
    #value = '';
    #dirty = false;
    #fieldset = false;
    #customError = '';
    #show = false;
    #observer: MutationObserver | undefined;
    #labels: MutationObserver | undefined;
    #stop: (() => void) | undefined;
    constructor() {
        super();
        this.#internals = this.attachInternals();
        this.defaultValue = '';
        this.name = '';
        this.disabled = false;
        this.required = false;
        this.invalid = false;
        this.label = '';
        this.description = '';
        this.error = '';
        this.orientation = 'vertical';
        this.ariaLabel = null;
        this.labelledBy = '';
        this.describedBy = '';
        this.addEventListener('invalid', () => {
            this.#show = true;
            this.requestUpdate();
        });
        this.addEventListener('click', event => {
            if (event.composedPath()[0] === this) setTimeout(() => {
                if (!event.defaultPrevented && this.isConnected) this.focus();
            }, 0);
        });
    }
    get value() {
        return this.#value;
    }
    set value(value: string) {
        const old = this.#value;
        this.#value = String(value ?? '');
        this.#dirty = true;
        this.#sync();
        this.requestUpdate('value', old);
    }
    get form() {
        return this.#internals.form;
    }
    get validity() {
        return this.#internals.validity;
    }
    get validationMessage() {
        return this.#internals.validationMessage;
    }
    get willValidate() {
        return this.#internals.willValidate;
    }
    checkValidity() {
        this.#sync();
        return this.#internals.checkValidity();
    }
    reportValidity() {
        this.#sync();
        return this.#internals.reportValidity();
    }
    setCustomValidity(message: string) {
        this.#customError = String(message ?? '');
        this.#sync();
        this.requestUpdate();
    }
    get items() {
        return [...this.querySelectorAll('sp-radio-group-item')].filter(item => item.closest('sp-radio-group') === this);
    }
    get #disabled() {
        return this.disabled || this.#fieldset;
    }
    #validItems() {
        const seen = new Set<string>();
        return this.items.filter(item => {
            if (!item.value || seen.has(item.value))
                return false;
            seen.add(item.value);
            return true;
        });
    }
    #inert(item: Element) {
        let node: Element | null = item;
        while (node) {
            if (node.hasAttribute('inert')) return true;
            node = node.parentElement ?? (node.getRootNode() instanceof ShadowRoot ? (node.getRootNode() as ShadowRoot).host : null);
        }
        return false;
    }
    #enabled() {
        return this.#validItems().filter(item => !item.disabled && !item.hidden && !this.#inert(item) && item.getClientRects().length > 0 && getComputedStyle(item).visibility !== 'hidden');
    }
    canSelect(item: SpRadioGroupItem) {
        return !this.#disabled && this.#enabled().includes(item);
    }
    select(item: SpRadioGroupItem) {
        if (!this.canSelect(item)) {
            this.#sync();
            return;
        }
        if (this.value === item.value) {
            this.#sync();
            return;
        }
        this.value = item.value;
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
    navigate(item: SpRadioGroupItem, key: string) {
        if (!this.canSelect(item))
            return;
        const enabled = this.#enabled();
        let index = enabled.indexOf(item);
        const rtl = this.orientation === 'horizontal' && getComputedStyle(this).direction === 'rtl';
        if (key === 'Home')
            index = 0;
        else if (key === 'End')
            index = enabled.length - 1;
        else {
            let delta = ['ArrowUp', 'ArrowLeft'].includes(key) ? -1 : 1;
            if (rtl && ['ArrowLeft', 'ArrowRight'].includes(key))
                delta *= -1;
            index = (index + delta + enabled.length) % enabled.length;
        }
        const next = enabled[index];
        if (next) {
            this.select(next);
            next.focus();
        }
    }
    override focus(options?: FocusOptions) {
        if (!this.#disabled)
            (this.#enabled().find(item => item.value === this.value) ?? this.#enabled()[0])?.focus(options);
    }
    formDisabledCallback(disabled: boolean) {
        this.#fieldset = disabled;
        queueMicrotask(() => this.requestUpdate());
    }
    formResetCallback() {
        this.#dirty = false;
        this.#value = String(this.defaultValue ?? '');
        this.#show = false;
        this.#sync();
        this.requestUpdate();
    }
    formStateRestoreCallback(state: string | File | FormData | null) {
        if (typeof state === 'string')
            this.value = state;
    }
    override connectedCallback() {
        super.connectedCallback();
        this.#observer ??= new MutationObserver(() => this.requestUpdate());
        this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'disabled', 'hidden', 'inert', 'style', 'class', 'slot'] });
        let ancestor: Element | null = this.parentElement ?? (this.getRootNode() instanceof ShadowRoot ? (this.getRootNode() as ShadowRoot).host : null);
        while (ancestor) {
            this.#observer.observe(ancestor, { attributes: true, attributeFilter: ['hidden', 'inert', 'style', 'class'] });
            ancestor = ancestor.parentElement ?? (ancestor.getRootNode() instanceof ShadowRoot ? (ancestor.getRootNode() as ShadowRoot).host : null);
        }
        this.#stop = watchLabelAssociations(this, this.#syncA11y);
    }
    override disconnectedCallback() {
        this.#observer?.disconnect();
        this.#labels?.disconnect();
        this.#stop?.();
        super.disconnectedCallback();
    }
    protected override willUpdate(changed: PropertyValues<this>) {
        if (changed.has('defaultValue') && !this.#dirty)
            this.#value = String(this.defaultValue ?? '');
    }
    protected override updated() {
        this.#sync();
    }
    protected override async getUpdateComplete(): Promise<boolean> {
        let done = await super.getUpdateComplete();
        await Promise.all(this.items.map(item => item.updateComplete));
        while (this.isUpdatePending) {
            done = await super.getUpdateComplete();
            await Promise.all(this.items.map(item => item.updateComplete));
        }
        return done;
    }
    #slot(name: string) {
        return [...this.children].filter(el => el.getAttribute('slot') === name);
    }
    #error() {
        return this.error?.trim() || this.#slot('error').map(el => el.textContent).join(' ').trim();
    }
    #ids(ids: string): Element[] {
        const root = this.getRootNode();
        return root instanceof Document || root instanceof ShadowRoot ? (ids ?? '').trim().split(/\s+/).map(id => root.getElementById(id)).filter((el): el is HTMLElement => !!el) : [];
    }
    #messages() {
        return ['description', 'error'].flatMap(id => {
            const local = this.renderRoot?.querySelector<HTMLElement>(`#${id}`);
            if (!local || local.hidden) return [];
            return this.#slot(id).length ? this.#slot(id) : [local];
        }).concat(this.#ids(this.describedBy));
    }
    #syncA11y = () => {
        const explicit = this.#ids(this.labelledBy), associated = [...this.#internals.labels].filter((el): el is Element => el instanceof Element);
        const slotted = this.#slot('label');
        const own = slotted.length ? slotted.map(accessibleLabelText).join(' ') : this.label?.trim();
        const labels = explicit.length ? explicit : associated;
        const group = this.renderRoot?.querySelector<HTMLElement>('.items');
        const name = this.ariaLabel?.trim() || (explicit.length ? explicit.map(accessibleLabelText).join(' ') : own || labels.map(accessibleLabelText).join(' '));
        if (group) {
            if (name)
                group.setAttribute('aria-label', name);
            else
                group.removeAttribute('aria-label');
            group.setAttribute('aria-required', this.required ? 'true' : 'false');
            group.setAttribute('aria-disabled', this.#disabled ? 'true' : 'false');
            group.setAttribute('aria-invalid', this.#invalid ? 'true' : 'false');
            group.setAttribute('aria-orientation', this.orientation);
            if ('ariaDescribedByElements' in (group as object))
                group.ariaDescribedByElements = this.#messages();
        }
        this.#labels ??= new MutationObserver(this.#syncA11y);
        this.#labels.disconnect();
        if (this.isConnected)
            for (const label of [...labels, ...slotted])
                this.#labels.observe(label, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'aria-hidden', 'hidden'] });
    };
    get #invalid() {
        return this.invalid || !!this.#error() || (this.#show && !this.validity.valid);
    }
    #sync() {
        const all = this.items, valid = this.#validItems(), enabled = this.#enabled(), selected = valid.find(item => item.value === this.value), eligible = selected && !selected.disabled;
        const configError = valid.length !== all.length ? 'Each radio item needs a unique nonempty value.' : '';
        const error = this.#error() || this.#customError || configError;
        const missing = this.required && !eligible;
        const old = this.validity.valid, oldMessage = this.validationMessage;
        this.#internals.setFormValue(!this.#disabled && eligible ? this.value : null, this.value);
        this.#internals.setValidity(this.#disabled ? {} : { valueMissing: missing, customError: !!error }, this.#disabled ? '' : error || (missing ? 'Choose an option.' : ''), enabled[0]?.control ?? undefined);
        const tab = enabled.includes(selected!) ? selected : enabled[0];
        const messages = this.#messages();
        for (const item of all)
            item.configure({ owner: this, checked: item === selected, disabled: this.#disabled || item.disabled || !valid.includes(item), tabIndex: !this.#disabled && item === tab ? 0 : -1, invalid: this.#invalid, messages });
        this.#syncA11y();
        if (this.#show && (old !== this.validity.valid || oldMessage !== this.validationMessage))
            this.requestUpdate();
    }
    override render() {
        const label = !!this.label?.trim() || this.#slot('label').length > 0, description = !!this.description?.trim() || this.#slot('description').length > 0, message = this.#error() || (this.#show ? this.validationMessage : '');
        return html `<div id="label" part="label" class="label" ?hidden=${!label}><slot name="label">${this.label}</slot>${this.required ? html `<span aria-hidden="true"> *</span>` : ''}</div><div class="items" role="radiogroup" part="items" data-orientation=${this.orientation}><slot @slotchange=${() => this.requestUpdate()}></slot></div><div id="description" part="description" class="description" ?hidden=${!description}><slot name="description">${this.description}</slot></div><div id="error" part="error" class="error" aria-live="polite" ?hidden=${!message && !this.#slot('error').length}><slot name="error">${message}</slot></div>`;
    }
}
declare global {
    interface HTMLElementTagNameMap {
        'sp-radio-group': SpRadioGroup;
    }
}
