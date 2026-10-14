import { LitElement, html, css } from 'lit';
import { SpButton } from '../button/sp-button.js';
import { SpDropdownMenuContent } from './sp-dropdown-menu-content.js';
import { SpDropdownMenuSubTrigger } from './sp-dropdown-menu-item.js';
/** Dedicated native button trigger with the shared action recipe; never submits a form. */
export class SpDropdownMenuTrigger extends SpButton {
    constructor() { super(); this.variant = 'secondary'; }
    get menu() { return this.parentElement as SpDropdownMenu | null; }
    get unavailable() { return this.isBlocked; }
    get control() { return this.shadowRoot?.querySelector('button') ?? null; }
    protected override handleClick(e: Event) { if (this.isBlocked || this.menu?.disabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
    } }
    protected override updated() { const b = this.control; if (this.isBlocked && this.menu?.open)
        this.menu.hide(false); if (b) {
        b.disabled = this.isDisabled || !!this.menu?.disabled;
        b.ariaHasPopup = 'menu';
        b.ariaExpanded = String(this.menu?.open ?? false);
        b.ariaControlsElements = this.menu?.content ? [this.menu.content] : [];
    } }
}
/** Root composition. Direct children are the owned trigger and content. No React/asChild runtime. */
export class SpDropdownMenu extends LitElement {
    static override properties = { open: { type: Boolean, reflect: true }, disabled: { type: Boolean, reflect: true } };
    declare open: boolean;
    declare disabled: boolean;
    #observer?: MutationObserver;
    #opening = false;
    #version = 0;
    readonly isSub: boolean = false;
    constructor() { super(); this.open = false; this.disabled = false; }
    get trigger() { return [...this.children].find(n => n instanceof SpDropdownMenuTrigger || n instanceof SpDropdownMenuSubTrigger) as SpDropdownMenuTrigger | SpDropdownMenuSubTrigger | undefined; }
    get anchor() { const t = this.trigger; return t instanceof SpDropdownMenuTrigger ? t.control : t ?? null; }
    get content() { return [...this.children].find(n => n instanceof SpDropdownMenuContent) as SpDropdownMenuContent | undefined; }
    get triggerText() { return this.anchor?.textContent?.trim() || this.trigger?.textContent?.trim() || 'Actions'; }
    get blocked() { const t = this.trigger; return this.disabled || !!t?.disabled || !!(t instanceof SpDropdownMenuTrigger && (t.unavailable)) || (this.isSub && (!this.root.open || !this.parentElement?.closest('sp-dropdown-menu-content,sp-dropdown-menu-sub-content')?.matches(':popover-open'))); }
    get root(): SpDropdownMenu { return this.isSub ? (this.parentElement?.closest('sp-dropdown-menu') as SpDropdownMenu ?? this) : this; }
    override connectedCallback() { super.connectedCallback(); this.addEventListener('click', this.#click); this.addEventListener('keydown', this.#key); this.#observer ??= new MutationObserver(() => this.requestUpdate()); this.#observer.observe(this, { childList: true, attributes: true, subtree: true, attributeFilter: ['disabled', 'loading', 'label'] }); if (!this.isSub) {
        document.addEventListener('pointerdown', this.#outside, true);
        document.addEventListener('focusin', this.#outsideFocus);
    } }
    override disconnectedCallback() { this.hide(false); this.#observer?.disconnect(); this.removeEventListener('click', this.#click); this.removeEventListener('keydown', this.#key); document.removeEventListener('pointerdown', this.#outside, true); document.removeEventListener('focusin', this.#outsideFocus); super.disconnectedCallback(); }
    protected override updated() { this.trigger?.requestUpdate(); if (this.blocked && this.open)
        this.hide(false);
    else if (this.open && !this.content?.isOpen && !this.#opening)
        void this.show();
    else if (!this.open && this.content?.isOpen)
        this.content.closeMenu(); }
    async show(edge: 'first' | 'last' = 'first') { if (this.blocked || !this.content || !this.isConnected)
        return; const version = ++this.#version; this.#opening = true; this.open = true; this.trigger?.requestUpdate(); const valid = () => version === this.#version && this.open && !this.blocked && this.isConnected; try {
        await this.content.openMenu(edge, valid);
    }
    finally {
        if (version === this.#version)
            this.#opening = false;
    } if (valid() && !this.content?.isOpen)
        this.open = false; }
    hide(restore = true) { this.#version++; this.#opening = false; this.open = false; this.content?.closeMenu(); this.trigger?.requestUpdate(); if (restore && this.isConnected)
        this.anchor?.focus({ preventScroll: true }); }
    closeAll(restore = true) { this.root.hide(restore); }
    #click = (e: Event) => { if (this.isSub)
        return; const t = this.trigger; if (!t || !e.composedPath().includes(t))
        return; setTimeout(() => { if (!e.defaultPrevented && !this.blocked && this.isConnected) {
        if (this.open)
            this.hide(true);
        else
            void this.show();
    } }); };
    #key = (e: KeyboardEvent) => { if (this.isSub || e.defaultPrevented || !e.composedPath().includes(this.trigger!))
        return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.blocked)
            void this.show(e.key === 'ArrowUp' ? 'last' : 'first');
    } };
    #outside = (e: Event) => { if (this.open && !e.composedPath().includes(this))
        this.closeAll(false); };
    #outsideFocus = (e: Event) => { if (this.open && !e.composedPath().includes(this))
        this.closeAll(false); };
    override render() { return html `<slot></slot>`; }
    static override styles = css `:host{display:inline-block;max-inline-size:100%}:host([hidden]){display:none}`;
}
export class SpDropdownMenuSub extends SpDropdownMenu {
    override readonly isSub = true;
    static override styles = css `:host{display:block}:host([hidden]){display:none}`;
}
