import { LitElement, html, css } from 'lit';
import { accessibleLabelText } from '../shared/accessible-label.js';
import { contentStyles } from './menu.styles.js';
import { SpDropdownMenuItem, SpDropdownMenuSubTrigger, SpDropdownMenuRadioItem, itemSelector, contentSelector } from './sp-dropdown-menu-item.js';
import type { SpDropdownMenu } from './sp-dropdown-menu.js';
/** Menu behavior shared by root and submenu content. Popover top layer preserves DOM/theme ancestry. */
export class SpDropdownMenuContent extends LitElement {
    static override styles = contentStyles;
    static override properties = { label: {}, size: { reflect: true }, side: { reflect: true }, align: { reflect: true }, loop: { type: Boolean } };
    declare label: string;
    declare size: 'small' | 'base' | 'large';
    declare side: 'bottom' | 'top';
    declare align: 'start' | 'end';
    declare loop: boolean;
    #internals: ElementInternals;
    #observer?: MutationObserver;
    #resize?: ResizeObserver;
    #active: SpDropdownMenuItem | null = null;
    #buffer = '';
    #time = 0;
    #frame = 0;
    #hover?: ReturnType<typeof setTimeout>;
    constructor() { super(); this.label = ''; this.size = 'small'; this.side = 'bottom'; this.align = 'start'; this.loop = true; this.#internals = this.attachInternals(); this.#internals.role = 'menu'; this.#internals.ariaOrientation = 'vertical'; }
    get owner() { return this.parentElement as SpDropdownMenu | null; }
    get isOpen() { return this.matches(':popover-open'); }
    get ownedItems() { return [...this.querySelectorAll<SpDropdownMenuItem>(itemSelector)].filter(i => i.menu === this); }
    get items() { return this.ownedItems.filter(i => i.available); }
    get activeItem() { return this.#active; }
    override connectedCallback() { super.connectedCallback(); this.popover = 'manual'; this.tabIndex = -1; this.addEventListener('keydown', this.#key); this.addEventListener('pointerover', this.#pointer); this.addEventListener('focusin', this.#focus); this.addEventListener('toggle', this.#toggle); this.#observer ??= new MutationObserver(records => { if (records.every(r => r.target === this && r.attributeName === 'style'))
        return; this.requestUpdate(); this.#repair(); this.schedulePosition(); }); this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['label', 'value', 'disabled', 'hidden', 'inert', 'slot', 'style', 'class'] }); }
    override disconnectedCallback() { this.closeMenu(); this.#observer?.disconnect(); this.removeEventListener('keydown', this.#key); this.removeEventListener('pointerover', this.#pointer); this.removeEventListener('focusin', this.#focus); this.removeEventListener('toggle', this.#toggle); super.disconnectedCallback(); }
    protected override updated() { this.#internals.ariaLabel = this.label || this.owner?.triggerText || 'Actions'; for (const item of this.items)
        item.refresh(); if (this.isOpen)
        this.schedulePosition(); }
    async openMenu(edge: 'first' | 'last' = 'first', valid: () => boolean = () => !!this.owner?.open) { await this.updateComplete; if (!valid() || !this.isConnected || this.owner?.blocked)
        return; if (!this.isOpen)
        this.showPopover(); this.style.setProperty('--_available', '100vh'); this.position(); this.#resize ??= new ResizeObserver(() => this.schedulePosition()); this.#resize.observe(this); if (this.owner?.anchor)
        this.#resize.observe(this.owner.anchor); window.addEventListener('resize', this.schedulePosition); document.addEventListener('scroll', this.#scroll, true); visualViewport?.addEventListener('resize', this.schedulePosition); visualViewport?.addEventListener('scroll', this.schedulePosition); this.focusItem(edge === 'last' ? this.items.at(-1) : this.items[0]); }
    closeMenu() { clearTimeout(this.#hover); cancelAnimationFrame(this.#frame); this.#frame = 0; this.#buffer = ''; this.#resize?.disconnect(); window.removeEventListener('resize', this.schedulePosition); document.removeEventListener('scroll', this.#scroll, true); visualViewport?.removeEventListener('resize', this.schedulePosition); visualViewport?.removeEventListener('scroll', this.schedulePosition); this.closeChildren(); if (this.isOpen)
        this.hidePopover(); for (const i of this.querySelectorAll('[data-active]'))
        i.removeAttribute('data-active'); this.#active = null; }
    #toggle = () => { if (!this.isOpen && this.owner?.open) {
        this.owner.open = false;
        this.owner.requestUpdate();
    } };
    #scroll = (e: Event) => { if (e.target !== this && !this.contains(e.target as Node))
        this.schedulePosition(); };
    schedulePosition = () => { if (!this.isOpen || this.#frame)
        return; this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.position(); }); };
    position() {
        const anchor = this.owner?.anchor;
        if (!anchor || !this.isOpen)
            return;
        const a = anchor.getBoundingClientRect(), vv = visualViewport;
        const vx = vv?.offsetLeft ?? 0, vy = vv?.offsetTop ?? 0, w = vv?.width ?? innerWidth, h = vv?.height ?? innerHeight;
        const gap = parseFloat(getComputedStyle(this).getPropertyValue('--sp-dropdown-menu-popup-gap')) || 0;
        const minX = vx + gap, maxX = vx + w - gap, minY = vy + gap, maxY = vy + h - gap;
        if (a.bottom < vy || a.top > vy + h || a.right < vx || a.left > vx + w) {
            this.owner?.hide(false);
            return;
        }
        const cs = getComputedStyle(this);
        const maxHeight = parseFloat(cs.getPropertyValue('--sp-dropdown-menu-viewport-max-height'));
        const natural = Math.min(this.scrollHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth), maxHeight);
        const width = this.getBoundingClientRect().width;
        const rtl = cs.direction === 'rtl';
        const sub = this.owner?.isSub;
        let x: number, y: number, available: number;
        if (sub) {
            const after = maxX - a.right - gap, before = a.left - minX - gap;
            const right = rtl ? !(before >= width || before >= after) : (after >= width || after >= before);
            x = right ? a.right + gap : a.left - gap - width;
            available = maxY - minY;
            y = Math.max(minY, Math.min(a.top, maxY - natural));
            this.dataset.side = right ? 'right' : 'left';
        }
        else {
            const below = maxY - a.bottom - gap, above = a.top - minY - gap;
            const preferred = this.side === 'top';
            const top = preferred ? (above >= natural || above >= below) : !(below >= natural || below >= above);
            available = Math.max(0, top ? above : below);
            const height = Math.min(natural, available);
            y = top ? a.top - gap - height : a.bottom + gap;
            const end = this.align === 'end';
            x = (end !== rtl) ? a.right - width : a.left;
            this.dataset.side = top ? 'top' : 'bottom';
        }
        this.style.setProperty('--_available', `${Math.max(0, available)}px`);
        this.style.left = `${Math.max(minX, Math.min(x, maxX - width))}px`;
        this.style.top = `${Math.max(minY, y)}px`;
    }
    closeChildren(except?: SpDropdownMenuSubTrigger) { for (const sub of this.querySelectorAll<SpDropdownMenu>('sp-dropdown-menu-sub'))
        if (sub.closest(contentSelector) === this && sub.trigger !== except)
            sub.hide(false); }
    focusItem(item?: SpDropdownMenuItem | null) { clearTimeout(this.#hover); if (item && !item.available)
        item = null; this.closeChildren(item instanceof SpDropdownMenuSubTrigger ? item : undefined); for (const i of this.ownedItems)
        i.toggleAttribute('data-active', i === item); this.#active = item ?? null; if (item) {
        item.focus({ preventScroll: true });
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    else
        this.focus({ preventScroll: true }); }
    #repair() { if (!this.isOpen)
        return; if (!this.#active || !this.items.includes(this.#active))
        this.focusItem(this.items[0]); }
    #focus = (e: FocusEvent) => { const item = e.composedPath().find(n => n instanceof SpDropdownMenuItem) as SpDropdownMenuItem | undefined; if (item?.menu === this) {
        this.#active = item;
        for (const i of this.ownedItems)
            i.toggleAttribute('data-active', i === item);
    } };
    #pointer = (e: PointerEvent) => { if (e.pointerType === 'touch')
        return; const item = e.composedPath().find(n => n instanceof SpDropdownMenuItem) as SpDropdownMenuItem | undefined; if (!item || item.menu !== this)
        return; if (this.#active !== item)
        this.focusItem(item);
    else if (!(item instanceof SpDropdownMenuSubTrigger) || item.sub?.open)
        return; clearTimeout(this.#hover); if (item instanceof SpDropdownMenuSubTrigger && !item.disabled)
        this.#hover = setTimeout(() => { if (this.isOpen && this.#active === item)
            item.sub?.show('first'); }, 180); };
    #key = (e: KeyboardEvent) => {
        const target = e.composedPath().find(n => n instanceof SpDropdownMenuItem) as SpDropdownMenuItem | undefined;
        if (target && target.menu !== this)
            return;
        if (!this.isOpen || e.defaultPrevented)
            return;
        if (performance.now() - this.#time > 700)
            this.#buffer = '';
        const items = this.items;
        const current = target ?? this.#active;
        let next: SpDropdownMenuItem | undefined;
        const index = items.indexOf(current!);
        const rtl = getComputedStyle(this).direction === 'rtl';
        switch (e.key) {
            case 'ArrowDown':
                next = items[this.loop ? (index + 1) % items.length : Math.min(index + 1, items.length - 1)];
                break;
            case 'ArrowUp':
                next = items[this.loop ? (index - 1 + items.length) % items.length : Math.max(0, index - 1)];
                break;
            case 'Home':
                next = items[0];
                break;
            case 'End':
                next = items.at(-1);
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                this.owner?.hide(true);
                return;
            case 'Tab':
                this.owner?.root.closeAll(false);
                this.owner?.root.anchor?.focus({ preventScroll: true });
                return;
            case 'ArrowRight':
            case 'ArrowLeft':
                if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
                    if (current instanceof SpDropdownMenuSubTrigger && !current.disabled)
                        current.sub?.show('first');
                }
                else if (this.owner?.isSub)
                    this.owner.hide(true);
                else
                    return;
                break;
            case 'Enter':
            case ' ':
                if (e.key === ' ' && this.#buffer)
                    break;
                if (current && !current.disabled)
                    current.click();
                e.preventDefault();
                e.stopPropagation();
                return;
            default: if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey)
                return;
        }
        if (next) {
            this.#buffer = '';
            this.focusItem(next);
        }
        else if (e.key.length === 1) {
            const now = performance.now();
            this.#buffer = now - this.#time > 700 ? e.key : this.#buffer + e.key;
            this.#time = now;
            const needle = [...this.#buffer].every(c => c === this.#buffer[0]) ? this.#buffer[0] : this.#buffer;
            const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
            const found = ordered.find(i => i.textValue.toLocaleLowerCase().startsWith(needle.toLocaleLowerCase()));
            if (found)
                this.focusItem(found);
        }
        e.preventDefault();
        e.stopPropagation();
    };
    override render() { return html `<div class="section" part="header" ?hidden=${!this.querySelector('[slot=header]')}><slot name="header"></slot></div><slot></slot><div class="section" part="footer" ?hidden=${!this.querySelector('[slot=footer]')}><slot name="footer"></slot></div>`; }
}
export class SpDropdownMenuSubContent extends SpDropdownMenuContent {
}
export class SpDropdownMenuGroup extends LitElement {
    static override properties = { label: {} };
    declare label: string;
    protected internals: ElementInternals;
    #observer?: MutationObserver;
    constructor() { super(); this.label = ''; this.internals = this.attachInternals(); this.internals.role = 'group'; }
    override connectedCallback() { super.connectedCallback(); this.#observer ??= new MutationObserver(() => this.requestUpdate()); this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label'] }); }
    override disconnectedCallback() { this.#observer?.disconnect(); super.disconnectedCallback(); }
    protected override updated() { const label = this.querySelector('sp-dropdown-menu-label'); this.internals.ariaLabel = this.label || (label ? accessibleLabelText(label) : ''); }
    override render() { return html `<slot></slot>`; }
    static override styles = css `:host{display:block}:host([hidden]){display:none}`;
}
export class SpDropdownMenuRadioGroup extends SpDropdownMenuGroup {
    static override properties = { ...SpDropdownMenuGroup.properties, value: {} };
    declare value: string;
    constructor() { super(); this.value = ''; }
    get items() { return [...this.querySelectorAll<SpDropdownMenuRadioItem>('sp-dropdown-menu-radio-item')].filter(i => i.closest('sp-dropdown-menu-radio-group') === this); }
    protected override updated() { super.updated(); const seen = new Set<string>(); for (const item of this.items) {
        item.checked = !!item.value && item.value === this.value && !seen.has(item.value);
        seen.add(item.value);
    } }
    select(item: SpDropdownMenuRadioItem) { if (!item.value || item.closest('sp-dropdown-menu-radio-group') !== this || item.value === this.value)
        return; this.value = item.value; this.dispatchEvent(new CustomEvent('sp-change', { bubbles: true, composed: true, detail: { value: this.value } })); }
}
export class SpDropdownMenuLabel extends LitElement {
    override render() { return html `<slot></slot>`; }
    static override styles = css `:host{display:block;padding:var(--sp-dropdown-menu-item-padding-y) var(--sp-dropdown-menu-item-padding-x);font-weight:var(--sp-font-weight-emphasis);color:var(--sp-color-foreground-muted);overflow-wrap:anywhere}:host([hidden]){display:none}`;
}
export class SpDropdownMenuSeparator extends LitElement {
    constructor() { super(); const i = this.attachInternals(); i.role = 'separator'; i.ariaOrientation = 'horizontal'; }
    override render() { return html `<span></span>`; }
    static override styles = css `:host{display:block;padding-block:var(--sp-dropdown-menu-popup-padding)}:host([hidden]){display:none}span{display:block;border-block-start:var(--sp-dropdown-menu-border-width) solid var(--sp-color-border-subtle)}`;
}
export class SpDropdownMenuShortcut extends LitElement {
    override connectedCallback() { super.connectedCallback(); this.setAttribute('aria-hidden', 'true'); }
    override render() { return html `<slot></slot>`; }
    static override styles = css `:host{font-size:var(--sp-font-size-body-small);white-space:nowrap;color:inherit}:host([hidden]){display:none}`;
}
