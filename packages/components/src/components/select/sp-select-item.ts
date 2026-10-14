import { LitElement, html, css, unsafeCSS } from 'lit';
import { accessibleLabelText } from '../shared/accessible-label.js';
const check = unsafeCSS(`url("${new URL('../checkbox/assets/check.svg', import.meta.url).href}")`);
/** A reusable option. Selection and active state belong to its closest Select. */
export class SpSelectItem extends LitElement {
    static override properties = { value: { reflect: true }, label: {}, description: {}, disabled: { type: Boolean, reflect: true }, selected: { attribute: false }, active: { attribute: false }, unavailable: { attribute: false } };
    declare value: string;
    declare label: string;
    declare description: string;
    declare disabled: boolean;
    declare selected: boolean;
    declare active: boolean;
    declare unavailable: boolean;
    #internals: ElementInternals;
    constructor() { super(); this.value = ''; this.label = ''; this.description = ''; this.disabled = false; this.selected = false; this.active = false; this.unavailable = false; this.#internals = this.attachInternals(); this.#internals.role = 'option'; }
    get textValue() { return this.label?.trim() || [...this.childNodes].filter(n => !(n instanceof Element) || !n.hasAttribute('slot')).map(n => n instanceof Element ? accessibleLabelText(n) : n.textContent).join(' ').replace(/\s+/g, ' ').trim(); }
    refreshLabel() { this.#internals.ariaLabel = this.textValue; this.#internals.ariaDescription=this.description?.trim()||[...this.querySelectorAll('[slot=description]')].map(accessibleLabelText).join(' ').trim(); }
    protected override updated(changed: Map<PropertyKey, unknown>) { this.#internals.ariaSelected = String(this.selected); this.#internals.ariaDisabled = String(this.disabled || this.unavailable); this.#internals.ariaLabel = this.textValue; this.#internals.ariaDescription=this.description?.trim()||[...this.querySelectorAll('[slot=description]')].map(accessibleLabelText).join(' ').trim(); this.toggleAttribute('data-selected', this.selected); this.toggleAttribute('data-active', this.active); this.toggleAttribute('data-disabled', this.disabled || this.unavailable); if (changed.has('label'))
        (this.closest('sp-select') as (HTMLElement & {
            requestUpdate(): void;
        }) | null)?.requestUpdate(); }
    override render() { return html `<span class="icon" part="start" aria-hidden="true"><slot name="start"></slot></span><span class="copy" part="content"><span part="label"><slot>${this.label}</slot></span><span class="description" part="description"><slot name="description">${this.description}</slot></span></span><span class="check" part="indicator" aria-hidden="true" ?data-selected=${this.selected}></span>`; }
    static override styles = css `
    :host { display:flex; align-items:center; gap:var(--sp-select-item-gap); min-block-size:var(--sp-select-item-min-height); padding:var(--sp-select-item-padding-y) var(--sp-select-item-padding-x); border-radius:var(--sp-select-item-radius); color:var(--sp-color-foreground-default); font:inherit; cursor:default; box-sizing:border-box; }
    :host([hidden]) { display:none; } *{box-sizing:border-box} .copy{flex:1;min-inline-size:0;overflow-wrap:anywhere} .description{display:block;font-size:var(--sp-font-size-body-small);color:var(--sp-color-foreground-muted)}
    .icon{display:flex;flex:none} ::slotted([slot=start]){inline-size:var(--sp-select-icon-size);block-size:var(--sp-select-icon-size)}
    .check{flex:none;inline-size:var(--sp-select-icon-size);block-size:var(--sp-select-icon-size);background:currentColor;mask-image:${check};mask-size:contain;mask-position:center;mask-repeat:no-repeat;visibility:hidden} .check[data-selected]{visibility:visible}
    :host([data-active]) { background:var(--sp-select-item-active-background);color:var(--sp-select-item-active-foreground);outline:var(--sp-select-border-width) solid var(--sp-field-focus-color);outline-offset:calc(-1 * var(--sp-select-border-width)); }
    :host([data-active]) .description{color:inherit}
    :host([data-selected]:not([data-active])){color:var(--sp-color-system-text)}
    :host([data-disabled]) {color:var(--sp-color-foreground-disabled)} :host([data-disabled]) .description{color:inherit}
    @media(forced-colors:active){:host{color:CanvasText}:host([data-active]){forced-color-adjust:none;background:Highlight;color:HighlightText;outline-color:Highlight}:host([data-selected]:not([data-active])){color:CanvasText}:host([data-disabled]){color:GrayText}.check{forced-color-adjust:none;background:currentColor}}
  `;
}
declare global {
    interface HTMLElementTagNameMap {
        'sp-select-item': SpSelectItem;
    }
}
