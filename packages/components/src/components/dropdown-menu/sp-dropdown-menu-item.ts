import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { accessibleLabelText } from '../shared/accessible-label.js';
import { itemStyles } from './menu.styles.js';
import type { SpDropdownMenuContent, SpDropdownMenuRadioGroup } from './sp-dropdown-menu-content.js';
export const contentSelector = 'sp-dropdown-menu-content,sp-dropdown-menu-sub-content';
export const itemSelector = 'sp-dropdown-menu-item,sp-dropdown-menu-checkbox-item,sp-dropdown-menu-radio-item,sp-dropdown-menu-sub-trigger';
/** Owned action row. It is not a form control; use sp-select for form values. */
export class SpDropdownMenuItem extends LitElement {
    static override styles = itemStyles;
    static override properties = { value: {}, label: {}, description: {}, disabled: { type: Boolean, reflect: true }, variant: { reflect: true }, inset: { type: Boolean, reflect: true }, stayOpen: { type: Boolean, attribute: 'stay-open' } };
    declare value: string;
    declare label: string;
    declare description: string;
    declare disabled: boolean;
    declare variant: 'default' | 'destructive';
    declare inset: boolean;
    declare stayOpen: boolean;
    protected internals: ElementInternals;
    constructor() { super(); this.value = ''; this.label = ''; this.description = ''; this.disabled = false; this.variant = 'default'; this.inset = false; this.stayOpen = false; this.internals = this.attachInternals(); this.internals.role = 'menuitem'; }
    get menu() { return this.closest(contentSelector) as SpDropdownMenuContent | null; }
    get textValue() { return this.label.trim() || [...this.childNodes].filter(n => !(n instanceof Element) || !n.hasAttribute('slot')).map(n => n instanceof Element ? accessibleLabelText(n) : n.textContent).join(' ').replace(/\s+/g, ' ').trim(); }
    get available() { return !this.closest('[hidden],[inert]') && this.getClientRects().length > 0 && getComputedStyle(this).display !== 'none' && getComputedStyle(this).visibility !== 'hidden'; }
    override connectedCallback() { super.connectedCallback(); this.tabIndex = -1; this.addEventListener('click', this.onClick); }
    override disconnectedCallback() { this.removeEventListener('click', this.onClick); super.disconnectedCallback(); }
    protected onClick = (e: Event) => { if (this.disabled) {
        e.preventDefault();
        return;
    } setTimeout(() => { if (!e.defaultPrevented && this.isConnected && this.available && !this.disabled && this.menu?.isOpen)
        this.activate(e); }); };
    activate(originalEvent: Event) { if (this.disabled || !this.available || !this.menu?.isOpen)
        return; const e = new CustomEvent('sp-select', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value, originalEvent } }); if (!this.dispatchEvent(e))
        return; this.commit(); if (!this.stayOpen)
        this.menu?.owner?.closeAll(true); }
    protected commit() { }
    refresh() { this.internals.ariaLabel = this.textValue; this.internals.ariaDescription = this.description || [...this.querySelectorAll('[slot=description]')].map(accessibleLabelText).join(' '); this.internals.ariaDisabled = String(this.disabled); }
    protected override updated() { this.refresh(); this.menu?.requestUpdate(); }
    override render() { return html `${this.inset ? html `<span class="mark" aria-hidden="true"></span>` : nothing}<span class="icon" aria-hidden="true"><slot name="start" @slotchange=${(e: Event) => { const slot = e.target as HTMLSlotElement; slot.parentElement!.classList.toggle('has-content', slot.assignedNodes().length > 0); }}></slot></span><span class="copy" part="content"><span part="label"><slot>${this.label}</slot></span><span class="description" part="description"><slot name="description">${this.description}</slot></span></span><slot name="shortcut"></slot>${this.indicator()}`; }
    protected indicator(): TemplateResult | typeof nothing { return nothing; }
}
export class SpDropdownMenuCheckboxItem extends SpDropdownMenuItem {
    static override properties = { ...SpDropdownMenuItem.properties, checked: { type: Boolean, reflect: true }, indeterminate: { type: Boolean, reflect: true } };
    declare checked: boolean;
    declare indeterminate: boolean;
    constructor() { super(); this.checked = false; this.indeterminate = false; this.internals.role = 'menuitemcheckbox'; }
    override refresh() { super.refresh(); this.internals.ariaChecked = this.indeterminate ? 'mixed' : String(this.checked); this.toggleAttribute('data-checked', this.checked || this.indeterminate); }
    protected override commit() { this.checked = this.indeterminate || !this.checked; this.indeterminate = false; this.dispatchEvent(new CustomEvent('sp-change', { bubbles: true, composed: true, detail: { checked: this.checked } })); }
    protected override indicator() { return html `<span class="mark" part="indicator" aria-hidden="true" ?data-checked=${this.checked} ?data-mixed=${this.indeterminate}></span>`; }
}
export class SpDropdownMenuRadioItem extends SpDropdownMenuItem {
    static override properties = { ...SpDropdownMenuItem.properties, checked: { type: Boolean, attribute: false } };
    declare checked: boolean;
    constructor() { super(); this.checked = false; this.internals.role = 'menuitemradio'; }
    protected override updated() { super.updated(); (this.closest('sp-dropdown-menu-radio-group') as SpDropdownMenuRadioGroup | null)?.requestUpdate(); }
    override refresh() { super.refresh(); this.internals.ariaChecked = String(this.checked); this.toggleAttribute('data-checked', this.checked); }
    protected override commit() { (this.closest('sp-dropdown-menu-radio-group') as SpDropdownMenuRadioGroup | null)?.select(this); }
    protected override indicator() { return html `<span class="mark" part="indicator" aria-hidden="true" ?data-checked=${this.checked}></span>`; }
}
export class SpDropdownMenuSubTrigger extends SpDropdownMenuItem {
    constructor() { super(); this.internals.ariaHasPopup = 'menu'; }
    override activate() { if (!this.disabled && this.available)
        this.sub?.show('first'); }
    get sub() { return this.parentElement as import('./sp-dropdown-menu.js').SpDropdownMenuSub | null; }
    override refresh() { super.refresh(); this.internals.ariaDisabled = String(this.disabled || !!this.sub?.disabled);
        this.toggleAttribute('data-disabled', this.disabled || !!this.sub?.disabled);
        this.internals.ariaExpanded = String(this.sub?.open ?? false); this.internals.ariaControlsElements = this.sub?.content ? [this.sub.content] : []; }
    protected override indicator() { return html `<span class="arrow" part="indicator" aria-hidden="true"></span>`; }
}
