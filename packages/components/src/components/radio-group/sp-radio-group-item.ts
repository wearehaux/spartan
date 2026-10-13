import { LitElement, html, nothing } from 'lit';
import { accessibleLabelText, watchLabelAssociations } from '../shared/accessible-label.js';
import { radioItemStyles } from './sp-radio-group.styles.js';
import type { SpRadioGroup } from './sp-radio-group.js';
export type RadioItemAppearance = 'plain' | 'boxed';
export type RadioItemPlacement = 'start' | 'end';
type Context = {
    owner: SpRadioGroup;
    checked: boolean;
    disabled: boolean;
    tabIndex: number;
    invalid: boolean;
    messages: Element[];
};
export class SpRadioGroupItem extends LitElement {
    static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
    static override styles = radioItemStyles;
    static override properties = { value: { reflect: true }, disabled: { type: Boolean, reflect: true }, invalid: { type: Boolean, reflect: true }, appearance: { reflect: true }, placement: { reflect: true }, label: {}, description: {}, ariaLabel: { attribute: 'aria-label' }, labelledBy: { attribute: 'labelled-by' }, describedBy: { attribute: 'described-by' } };
    declare value: string;
    declare disabled: boolean;
    declare invalid: boolean;
    declare appearance: RadioItemAppearance;
    declare placement: RadioItemPlacement;
    declare label: string;
    declare description: string;
    declare ariaLabel: string | null;
    declare labelledBy: string;
    declare describedBy: string;
    #context: Context | undefined;
    #observer: MutationObserver | undefined;
    #labels: MutationObserver | undefined;
    #stop: (() => void) | undefined;
    constructor() {
        super();
        this.value = '';
        this.disabled = false;
        this.invalid = false;
        this.appearance = 'plain';
        this.placement = 'start';
        this.label = '';
        this.description = '';
        this.ariaLabel = null;
        this.labelledBy = '';
        this.describedBy = '';
    }
    get checked() {
        return this.#context?.checked ?? false;
    }
    get control() {
        return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null;
    }
    /** Group-owned coordination. Consumers set selection on the group. */
    configure(context: Context) {
        const old = this.#context;
        this.#context = context;
        if (this.control) {
            this.control.checked = context.checked;
            this.control.disabled = context.disabled;
            this.control.tabIndex = context.tabIndex;
        }
        if (!old || old.owner !== context.owner || old.checked !== context.checked || old.disabled !== context.disabled || old.tabIndex !== context.tabIndex || old.invalid !== context.invalid || old.messages.length !== context.messages.length || old.messages.some((el, i) => el !== context.messages[i]))
            this.requestUpdate();
        this.#syncA11y();
    }
    override click() {
        if (this.#context?.owner.canSelect(this))
            this.control?.click();
    }
    override connectedCallback() {
        super.connectedCallback();
        this.#observer ??= new MutationObserver(() => this.requestUpdate());
        this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['slot'] });
        this.#stop = watchLabelAssociations(this, this.#syncA11y);
        (this.closest('sp-radio-group') as SpRadioGroup | null)?.requestUpdate();
    }
    override disconnectedCallback() {
        this.#observer?.disconnect();
        this.#labels?.disconnect();
        this.#stop?.();
        this.#context?.owner.requestUpdate();
        this.#context = undefined;
        super.disconnectedCallback();
    }
    protected override updated(changed: Map<PropertyKey, unknown>) {
        this.#syncA11y();
        if (changed.has('value') || changed.has('disabled'))
            this.#context?.owner.requestUpdate();
    }
    #ids(ids: string): Element[] {
        const root = this.getRootNode();
        return root instanceof Document || root instanceof ShadowRoot ? (ids ?? '').trim().split(/\s+/).map(id => root.getElementById(id)).filter((el): el is HTMLElement => !!el) : [];
    }
    #syncA11y = () => {
        const input = this.control;
        if (!input)
            return;
        const labels = this.#ids(this.labelledBy);
        if ('ariaLabelledByElements' in input)
            input.ariaLabelledByElements = labels;
        const name = labels.length ? labels.map(accessibleLabelText).join(' ') : this.ariaLabel?.trim();
        if (name) {
            input.removeAttribute('aria-labelledby');
            input.setAttribute('aria-label', name);
        }
        else {
            input.removeAttribute('aria-label');
            input.setAttribute('aria-labelledby', 'label');
        }
        this.#labels ??= new MutationObserver(this.#syncA11y);
        this.#labels.disconnect();
        for (const label of labels)
            this.#labels.observe(label, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'hidden', 'aria-hidden'] });
        const local = this.renderRoot.querySelector<HTMLElement>('#description');
        const bridge = this.renderRoot.querySelector<HTMLElement>('#group-messages');
        const message = (this.#context?.messages ?? []).map(accessibleLabelText).join(' ');
        if (bridge) bridge.textContent = message;
        const external = this.#ids(this.describedBy);
        if ('ariaDescribedByElements' in (input as object))
            input.ariaDescribedByElements = [...(local && !local.hidden ? [local] : []), ...external, ...(bridge && message ? [bridge] : [])];
        else if (local && !local.hidden)
            input.setAttribute('aria-describedby', 'description');
        else
            input.removeAttribute('aria-describedby');
    };
    #onInput(event: Event) {
        event.stopPropagation();
        this.#context?.owner.select(this);
    }
    #onChange(event: Event) {
        event.stopPropagation();
    }
    #onClick(event: Event) {
        if (!this.#context?.owner.canSelect(this))
            event.preventDefault();
    }
    #onKey(event: KeyboardEvent) {
        if (!this.#context?.owner.canSelect(this)) {
            event.preventDefault();
            return;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            this.#context.owner.navigate(this, event.key);
        }
    }
    override render() {
        const disabled = this.#context?.disabled ?? true, invalid = this.invalid || this.#context?.invalid;
        const description = !!this.description?.trim() || [...this.children].some(el => el.getAttribute('slot') === 'description');
        return html `<label class="row" part="row" for="control" data-appearance=${this.appearance} data-placement=${this.placement} ?data-disabled=${disabled} ?data-invalid=${invalid && !disabled} ?data-selected=${this.checked}>
      <span class="target" part="target"><input id="control" part="input" type="radio" .checked=${this.checked} ?disabled=${disabled} tabindex=${this.#context?.tabIndex ?? -1} aria-invalid=${invalid ? 'true' : nothing} @input=${this.#onInput} @change=${this.#onChange} @click=${this.#onClick} @keydown=${this.#onKey} @focus=${this.#syncA11y}><span class="box" part="control" aria-hidden="true"><span class="dot" part="indicator" ?hidden=${!this.checked}></span></span></span>
      <span class="copy" part="content"><span id="label" class="label" part="label"><slot name="label"><slot>${this.label}</slot></slot></span><span id="description" class="description" part="description" ?hidden=${!description}><slot name="description">${this.description}</slot></span></span>
      </label><span id="group-messages" hidden></span>`;
    }
}
declare global {
    interface HTMLElementTagNameMap {
        'sp-radio-group-item': SpRadioGroupItem;
    }
}
