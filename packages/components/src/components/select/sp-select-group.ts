import { LitElement, html, css } from 'lit';
import { accessibleLabelText } from '../shared/accessible-label.js';
export class SpSelectGroup extends LitElement {
    static override properties = { label: {} };
    declare label: string;
    #internals: ElementInternals;
    #observer?: MutationObserver;
    constructor() { super(); this.label = ''; this.#internals = this.attachInternals(); this.#internals.role = 'group'; }
    override connectedCallback() { super.connectedCallback(); this.#observer ??= new MutationObserver(() => this.requestUpdate()); this.#observer.observe(this, { subtree: true, childList: true, characterData: true }); }
    override disconnectedCallback() { this.#observer?.disconnect(); super.disconnectedCallback(); }
    protected override updated() { const label = this.querySelector('sp-select-label'); this.#internals.ariaLabel = label ? accessibleLabelText(label) : this.label; }
    override render() { return html `<span class="label" ?hidden=${!this.label || !!this.querySelector('sp-select-label')}>${this.label}</span><slot></slot>`; }
    static override styles = css `:host{display:block}:host([hidden]){display:none}.label{display:block;padding:var(--sp-select-item-padding-y) var(--sp-select-item-padding-x);font-weight:var(--sp-font-weight-emphasis);color:var(--sp-color-foreground-muted)}[hidden]{display:none}`;
}
export class SpSelectLabel extends LitElement {
    override render() { return html `<slot></slot>`; }
    static override styles = css `:host{display:block;padding:var(--sp-select-item-padding-y) var(--sp-select-item-padding-x);font-weight:var(--sp-font-weight-emphasis);color:var(--sp-color-foreground-muted)}:host([hidden]){display:none}`;
}
export class SpSelectSeparator extends LitElement {
    constructor() { super(); this.attachInternals().role = 'separator'; }
    override render() { return html `<span></span>`; }
    static override styles = css `:host{display:block;padding-block:var(--sp-select-popup-padding)}:host([hidden]){display:none}span{display:block;border-block-start:var(--sp-select-border-width) solid var(--sp-color-border-subtle)}`;
}
declare global {
    interface HTMLElementTagNameMap {
        'sp-select-group': SpSelectGroup;
        'sp-select-label': SpSelectLabel;
        'sp-select-separator': SpSelectSeparator;
    }
}
