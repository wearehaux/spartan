import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { accessibleLabelText, watchLabelAssociations } from '../shared/accessible-label.js';
import { SpSelectItem } from './sp-select-item.js';
import { selectStyles } from './sp-select.styles.js';
export type SelectSize = 'sm' | 'base';
export type SelectAppearance = 'default' | 'outlined' | 'filled';
/** Single-select combobox. DOM focus stays on the trigger while the active option is explored. */
export class SpSelect extends LitElement {
    static formAssociated = true;
    static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
    static override styles = selectStyles;
    static override properties = { value: { attribute: false, noAccessor: true }, defaultValue: { attribute: 'value' }, name: { reflect: true }, size: { reflect: true }, appearance: { reflect: true }, label: {}, description: {}, error: {}, placeholder: {}, disabled: { type: Boolean, reflect: true }, readOnly: { type: Boolean, attribute: 'readonly', reflect: true }, required: { type: Boolean, reflect: true }, invalid: { type: Boolean, reflect: true }, open: { type: Boolean, reflect: true }, clearable: { type: Boolean }, ariaLabel: { attribute: 'aria-label' }, labelledBy: { attribute: 'labelled-by' }, describedBy: { attribute: 'described-by' }, align: { reflect: true }, side: { reflect: true } };
    declare defaultValue: string;
    declare name: string;
    declare size: SelectSize;
    declare appearance: SelectAppearance;
    declare label: string;
    declare description: string;
    declare error: string;
    declare placeholder: string;
    declare disabled: boolean;
    declare readOnly: boolean;
    declare required: boolean;
    declare invalid: boolean;
    declare open: boolean;
    declare clearable: boolean;
    declare ariaLabel: string | null;
    declare labelledBy: string;
    declare describedBy: string;
    declare align: 'start' | 'end';
    declare side: 'top' | 'bottom';
    #internals: ElementInternals;
    #value = '';
    #dirty = false;
    #formDisabled = false;
    #customError = '';
    #showValidity = false;
    #configError = '';
    #active: SpSelectItem | null = null;
    #items: SpSelectItem[] = [];
    #available: SpSelectItem[] = [];
    #observer?: MutationObserver;
    #nameObserver?: MutationObserver;
    #stop?: () => void;
    #resize?: ResizeObserver;
    #buffer = '';
    #typedAt = 0;
    #scrollUp = false;
    #scrollDown = false;
    #overflow = false;
    constructor() {
        super();
        this.#internals = this.attachInternals();
        this.defaultValue = '';
        this.name = '';
        this.size = 'base';
        this.appearance = 'default';
        this.label = '';
        this.description = '';
        this.error = '';
        this.placeholder = 'Choose an option';
        this.disabled = false;
        this.readOnly = false;
        this.required = false;
        this.invalid = false;
        this.open = false;
        this.clearable = false;
        this.ariaLabel = null;
        this.labelledBy = '';
        this.describedBy = '';
        this.align = 'start';
        this.side = 'bottom';
        this.addEventListener('invalid', () => { this.#showValidity = true; this.requestUpdate(); });
        this.addEventListener('click', event => { if (event.composedPath()[0] === this)
            setTimeout(() => { if (!event.defaultPrevented && !this.controlDisabled)
                this.trigger?.focus(); }, 0); });
    }
    get trigger() { return this.renderRoot?.querySelector<HTMLButtonElement>('#trigger') ?? null; }
    get #popup() { return this.renderRoot?.querySelector<HTMLElement>('#popup') ?? null; }
    get #viewport() { return this.renderRoot?.querySelector<HTMLElement>('#viewport') ?? null; }
    get controlDisabled() { return this.disabled || this.#formDisabled; }
    get value() { return this.#value; }
    set value(value: string) { const old = this.#value; this.#dirty = true; this.#value = String(value ?? ''); this.requestUpdate('value', old); if (this.hasUpdated)
        this.#sync(); }
    get form() { return this.#internals.form; }
    get validity() { return this.#internals.validity; }
    get validationMessage() { return this.#internals.validationMessage; }
    get willValidate() { return this.#internals.willValidate; }
    checkValidity() { this.#sync(); return this.#internals.checkValidity(); }
    reportValidity() { this.#sync(); return this.#internals.reportValidity(); }
    setCustomValidity(message: string) { this.#customError = String(message ?? ''); this.#sync(); this.requestUpdate(); }
    formDisabledCallback(disabled: boolean) { this.#formDisabled = disabled; this.requestUpdate(); }
    formResetCallback() { this.#dirty = false; this.#value = String(this.defaultValue ?? ''); this.#showValidity = false; this.open = false; this.requestUpdate(); this.#sync(); }
    formStateRestoreCallback(state: string | File | FormData | null) { if (typeof state === 'string')
        this.value = state; }
    override click() { if (!this.controlDisabled && !this.readOnly)
        this.trigger?.click(); }
    show() { if (!this.controlDisabled && !this.readOnly) {
        this.open = true;
        this.trigger?.focus();
    } }
    hide() { this.open = false; }
    override connectedCallback() { super.connectedCallback(); this.#observer ??= new MutationObserver(() => this.requestUpdate()); this.#observer.observe(this, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'disabled', 'hidden', 'inert', 'slot', 'style', 'class'] }); this.#stop = watchLabelAssociations(this, () => this.#a11y()); window.addEventListener('resize', this.#position); window.visualViewport?.addEventListener('resize', this.#position); window.visualViewport?.addEventListener('scroll', this.#position); document.addEventListener('scroll', this.#position, true); this.#resize ??= new ResizeObserver(this.#position); this.#resize.observe(this); }
    override disconnectedCallback() { this.#observer?.disconnect(); this.#nameObserver?.disconnect(); this.#stop?.(); this.#stop = undefined; this.#resize?.disconnect(); window.removeEventListener('resize', this.#position); window.visualViewport?.removeEventListener('resize', this.#position); window.visualViewport?.removeEventListener('scroll', this.#position); document.removeEventListener('scroll', this.#position, true); this.#popup?.hidePopover(); this.open = false; super.disconnectedCallback(); }
    protected override willUpdate(changed: PropertyValues<this>) { if (changed.has('defaultValue') && !this.#dirty)
        this.#value = String(this.defaultValue ?? ''); if (this.controlDisabled || this.readOnly)
        this.open = false; this.#refresh(); }
    protected override updated() { this.#sync(); const popup = this.#popup; if (popup && this.isConnected) {
        if (this.open && !popup.matches(':popover-open')) {
            this.#active = this.#available.find(item => item.value === this.value) ?? this.#available[0] ?? null;
            popup.showPopover();
            this.#position();
            this.#markActive(true);
        }
        else if (!this.open && popup.matches(':popover-open'))
            popup.hidePopover();
    } if (this.open && popup?.matches(':popover-open')) {
        this.#resize?.observe(popup);
        this.#position();
        this.#markActive();
    } this.#a11y(); }
    protected override async getUpdateComplete() { let done = await super.getUpdateComplete(); while (this.isUpdatePending)
        done = await super.getUpdateComplete(); await Promise.all(this.#items.map(item => item.updateComplete)); return done; }
    #hasSlot(name: string) { return [...this.children].some(el => el.getAttribute('slot') === name); }
    #errorText() { return this.error?.trim() || [...this.children].filter(el => el.getAttribute('slot') === 'error').map(el => el.textContent).join(' ').trim(); }
    #eligible(item: SpSelectItem) { if (item.disabled)
        return false; let node: Element | null = item; while (node && node !== this) {
        const css = getComputedStyle(node);
        if (node.hasAttribute('hidden') || node.hasAttribute('inert') || css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse')
            return false;
        node = node.parentElement;
    } return true; }
    #refresh() {
        const previousActive=this.#active;
        this.#items = [...this.querySelectorAll<SpSelectItem>('sp-select-item')].filter(item => item.closest('sp-select') === this);
        const seen = new Set<string>();
        this.#configError = '';
        this.#available = [];
        for (const item of this.#items) {
            item.refreshLabel();
            const malformed = !item.value || seen.has(item.value);
            if (malformed)
                this.#configError = 'Select items need unique, non-empty values.';
            seen.add(item.value);
            item.unavailable = malformed || this.controlDisabled;
            item.selected = !malformed && item.value === this.value;
            if (!malformed && this.#eligible(item))
                this.#available.push(item);
        }
        if (!this.#active || !this.#available.includes(this.#active))
            this.#active = this.#available.find(item => item.value === this.value) ?? this.#available[0] ?? null;
        this.#markActive(this.#active!==previousActive);
    }
    #sync() {
        if (!this.trigger)
            return;
        const selected = this.#available.find(item => item.value === this.value);
        const error = this.#errorText() || this.#customError || this.#configError;
        const missing = this.required && !selected;
        this.#internals.setFormValue(!this.controlDisabled && selected ? this.value : null, this.value);
        this.#internals.setValidity(this.controlDisabled || this.readOnly ? {} : { valueMissing: missing, customError: !!error }, this.controlDisabled || this.readOnly ? '' : error || (missing ? 'Choose an option.' : ''), this.trigger);
        this.#a11y();
    }
    #ids(ids: string) { const root = this.getRootNode(); return root instanceof Document || root instanceof ShadowRoot ? (ids ?? '').trim().split(/\s+/).map(id => root.getElementById(id)).filter((x): x is HTMLElement => !!x) : []; }
    #a11y() {
        const trigger = this.trigger;
        if (!trigger)
            return;
        const local = this.renderRoot.querySelector<HTMLElement>('#label')!;
        const explicit = this.#ids(this.labelledBy);
        const external = [...this.#internals.labels].filter((el): el is Element => el instanceof Element);
        const names = explicit.length ? explicit : (this.label?.trim() || this.#hasSlot('label')) ? [local] : this.ariaLabel?.trim() ? [] : external;
        trigger.ariaLabelledByElements = names;
        const name = names.map(accessibleLabelText).join(' ').trim() || this.ariaLabel?.trim() || '';
        if (name)
            trigger.setAttribute('aria-label', name);
        else
            trigger.removeAttribute('aria-label');
        const localMessages = ['description', 'error'].map(id => this.renderRoot.querySelector<HTMLElement>('#' + id)!).filter(el => !el.hidden);
        trigger.ariaDescribedByElements = [...localMessages, ...this.#ids(this.describedBy)];
        trigger.ariaActiveDescendantElement = this.open ? this.#active : null;
        this.#nameObserver ??= new MutationObserver(() => this.#a11y());
        this.#nameObserver.disconnect();
        if (this.isConnected)
            for (const label of names)
                if (label !== local)
                    this.#nameObserver.observe(label, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'aria-label'] });
    }
    #markActive(scroll=false) { for (const item of this.#items)
        item.active = this.open && item === this.#active; this.#a11y(); if (scroll && this.open && this.#active) {
        const viewport = this.#viewport, rect = this.#active.getBoundingClientRect();
        if (viewport) {
            const view = viewport.getBoundingClientRect();
            if (rect.top < view.top)
                viewport.scrollTop -= view.top - rect.top;
            else if (rect.bottom > view.bottom)
                viewport.scrollTop += rect.bottom - view.bottom;
        }
    } }
    #position = () => {
        const popup=this.#popup,trigger=this.trigger,viewport=this.#viewport;
        if(!this.open || !popup?.matches(':popover-open') || !trigger || !viewport)return;
        const rect=trigger.getBoundingClientRect();
        if(!trigger.getClientRects().length){this.hide();return;}
        const vv=window.visualViewport;
        const left=vv?.offsetLeft??0,top=vv?.offsetTop??0,width=vv?.width??innerWidth,height=vv?.height??innerHeight;
        if(rect.bottom<top||rect.top>top+height||rect.right<left||rect.left>left+width){this.hide();return;}
        const css=getComputedStyle(popup);
        const gap=parseFloat(css.getPropertyValue('--sp-select-popup-gap'))||4;
        const maxHeight=parseFloat(css.getPropertyValue('--sp-select-viewport-max-height'))||288;
        const rowHeight=parseFloat(css.getPropertyValue('--sp-select-item-min-height'))||32;
        const chrome=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom)+parseFloat(css.borderTopWidth)+parseFloat(css.borderBottomWidth);
        popup.style.inlineSize=Math.min(rect.width,width-gap*2)+'px';
        const contentHeight=viewport.scrollHeight;
        // Intrinsic content, not the constrained popup bounds, owns collision choice.
        // Scroll-button visibility therefore cannot feed back into side selection.
        const naturalHeight=Math.min(contentHeight,maxHeight)+chrome+(contentHeight>maxHeight?rowHeight*2:0);
        const below=Math.max(0,top+height-Math.max(rect.bottom,top)-gap*2),above=Math.max(0,Math.min(rect.top,top+height)-top-gap*2);
        const useTop=this.side==='top'?(above>=naturalHeight||above>=below):(below<naturalHeight&&above>below);
        const available=useTop?above:below;
        const overflow=contentHeight>maxHeight||contentHeight+chrome>available;
        const controls=overflow&&available>=chrome+rowHeight*3;
        popup.style.setProperty('--_viewport-space',Math.max(0,available-chrome-(controls?rowHeight*2:0))+'px');
        if(controls!==this.#overflow){this.#overflow=controls;this.requestUpdate();}
        const bounds=popup.getBoundingClientRect(),rtl=getComputedStyle(this).direction==='rtl';
        const x=rtl!==(this.align==='end')?rect.right-bounds.width:rect.left;
        popup.style.left=Math.max(left+gap,Math.min(x,left+width-bounds.width-gap))+'px';
        popup.style.top=Math.max(top+gap,Math.min(useTop?rect.top-bounds.height-gap:rect.bottom+gap,top+height-bounds.height-gap))+'px';
        this.#scrollState();
    };
    #scrollState = () => {
        const viewport=this.#viewport;if(!viewport)return;
        const up=viewport.scrollTop>1,down=viewport.scrollTop+viewport.clientHeight<viewport.scrollHeight-1;
        if(up!==this.#scrollUp||down!==this.#scrollDown){this.#scrollUp=up;this.#scrollDown=down;this.requestUpdate();}
    };
    #commit(item: SpSelectItem | null) { if (this.controlDisabled || this.readOnly || !item || !this.#available.includes(item) || !this.#eligible(item))
        return; const old = this.value; this.value = item.value; if (old !== this.value) {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } }
    #close(commit = false) { if (commit)
        this.#commit(this.#active); this.open = false; this.#buffer = ''; }
    #move(index: number) { this.#active = this.#available[Math.max(0, Math.min(index, this.#available.length - 1))] ?? null; this.#markActive(true); }
    #keydown(event: KeyboardEvent) {
        if (this.controlDisabled || this.readOnly || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey)
            return;
        if (performance.now() - this.#typedAt > 700)
            this.#buffer = '';
        const wasOpen = this.open;
        const index = this.#active ? this.#available.indexOf(this.#active) : 0;
        if (event.key === 'Escape' && wasOpen) {
            event.preventDefault();
            this.#close();
            return;
        }
        if (event.key === 'Tab') {
            if (wasOpen)
                this.#close(true);
            return;
        }
        if (event.altKey && event.key === 'ArrowUp') {
            if (wasOpen) {
                event.preventDefault();
                this.#close(true);
            }
            return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '].includes(event.key) && !(event.key === ' ' && this.#buffer)) {
            event.preventDefault();
            if (!wasOpen) {
                this.show();
                void this.updateComplete.then(() => { if (event.key === 'End')
                    this.#move(this.#available.length - 1);
                else if (event.key === 'Home')
                    this.#move(0); });
                return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
                this.#close(true);
                return;
            }
            if (event.key === 'Home')
                this.#move(0);
            else if (event.key === 'End')
                this.#move(this.#available.length - 1);
            else
                this.#move(index + ({ ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[event.key] ?? 0));
            return;
        }
        if (event.key.length === 1 && !event.altKey) {
            event.preventDefault();
            const now = performance.now();
            if (now - this.#typedAt > 700)
                this.#buffer = '';
            this.#typedAt = now;
            this.#buffer += event.key.toLocaleLowerCase();
            const repeated = [...this.#buffer].every(c => c === this.#buffer[0]);
            const query = repeated ? this.#buffer[0] : this.#buffer;
            const start = repeated ? index + 1 : 0;
            const ordered = [...this.#available.slice(start), ...this.#available.slice(0, start)];
            const item = ordered.find(item => item.textValue.toLocaleLowerCase().startsWith(query));
            if (!wasOpen) {
                this.show();
                void this.updateComplete.then(() => { if (item) {
                    this.#active = item;
                    this.#markActive(true);
                } });
            }
            else if (item) {
                this.#active = item;
                this.#markActive(true);
            }
        }
    }
    #triggerClick(event: Event) { setTimeout(() => { if (!event.defaultPrevented && !this.controlDisabled && !this.readOnly) {
        if (this.open)
            this.#close();
        else
            this.show();
    } }, 0); }
    #option(event: Event, commit: boolean) { const item = event.composedPath().find((node): node is SpSelectItem => node instanceof SpSelectItem && node.closest('sp-select') === this); if (!item || !this.#available.includes(item) || !this.#eligible(item))
        return; if (commit) {
        setTimeout(() => { if (!event.defaultPrevented) {
            this.#commit(item);
            this.#close();
            this.trigger?.focus();
        } }, 0);
    }
    else {
        this.#active = item;
        this.#markActive();
    } }
    #clear(event: Event) { setTimeout(() => { if (event.defaultPrevented || this.controlDisabled || this.readOnly)
        return; this.#close(); const old = this.value; this.value = ''; if (old) {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } this.trigger?.focus(); }, 0); }
    override render() {
        const selected = this.#available.find(item => item.value === this.value);
        const hasLabel = !!this.label?.trim() || this.#hasSlot('label');
        const hasDescription = !!this.description?.trim() || this.#hasSlot('description');
        const message = this.#errorText() || (this.#showValidity ? this.validationMessage : '');
        const hasError = !!message || this.#hasSlot('error');
        const invalid = this.invalid || !!this.#errorText() || (this.#showValidity && !this.validity.valid);
        return html `<label id="label" part="label" class="label" for="trigger" ?hidden=${!hasLabel}><slot name="label">${this.label}</slot>${this.required ? html `<span aria-hidden="true">*</span>` : nothing}</label>
      <div class="field" part="field" data-size=${this.size} data-appearance=${this.appearance} ?data-disabled=${this.controlDisabled} ?data-readonly=${this.readOnly} ?data-invalid=${invalid && !this.controlDisabled}>
        <button id="trigger" class="control" part="trigger" type="button" role="combobox" aria-haspopup="listbox" aria-controls="listbox" aria-expanded=${String(this.open)} aria-required=${String(this.required)} aria-readonly=${String(this.readOnly)} aria-invalid=${invalid ? 'true' : nothing} ?disabled=${this.controlDisabled} @click=${this.#triggerClick} @keydown=${this.#keydown} @blur=${(event: FocusEvent) => { if (this.open && event.relatedTarget !== this.renderRoot.querySelector('.clear'))
            this.#close(true); }}>
          <span class="icon" part="start" aria-hidden="true" ?hidden=${!this.#hasSlot('start')}><slot name="start"></slot></span><span class=${'value ' + (!selected ? 'placeholder' : '')} part="value">${selected?.textValue || this.placeholder}</span><span class="icon" part="icon" aria-hidden="true"><slot name="icon"><span class="arrow" ?data-open=${this.open}></span></slot></span>
        </button>${this.clearable ? html `<button class="clear" part="clear" type="button" aria-label="Clear selection" ?hidden=${!selected} ?disabled=${this.controlDisabled || this.readOnly} @click=${this.#clear}><span class="clear-icon" aria-hidden="true"></span></button>` : nothing}
      </div>
      <div id="description" part="description" class="message" ?hidden=${!hasDescription}><slot name="description">${this.description}</slot></div><div id="error" part="error" class="message error" aria-live="polite" ?hidden=${!hasError}><slot name="error">${message}</slot></div>
      <div id="popup" class="popup" part="content" popover="auto" @toggle=${(event: ToggleEvent) => { if (event.newState === 'closed' && this.open && !this.#popup?.matches(':popover-open'))
            this.#close(true); }} @pointerdown=${(event: PointerEvent) => event.preventDefault()}>
        <button class="scroll up" part="scroll-up" type="button" tabindex="-1" aria-label="Scroll options up" ?hidden=${!this.#overflow} ?disabled=${!this.#scrollUp} @click=${() => { this.#viewport?.scrollBy({ top: -this.#viewport.clientHeight / 2 }); }}><span class="arrow"></span></button>
        <div id="viewport" class="viewport" part="viewport" @scroll=${this.#scrollState}><div id="listbox" role="listbox" aria-label=${this.label || this.ariaLabel || 'Options'} @pointermove=${(event: PointerEvent) => this.#option(event, false)} @click=${(event: Event) => this.#option(event, true)}><slot @slotchange=${() => this.requestUpdate()}></slot><div part="empty" ?hidden=${!!this.#available.length}><slot name="empty">No options available</slot></div></div></div>
        <button class="scroll" part="scroll-down" type="button" tabindex="-1" aria-label="Scroll options down" ?hidden=${!this.#overflow} ?disabled=${!this.#scrollDown} @click=${() => { this.#viewport?.scrollBy({ top: this.#viewport.clientHeight / 2 }); }}><span class="arrow"></span></button>
      </div>`;
    }
}
declare global {
    interface HTMLElementTagNameMap {
        'sp-select': SpSelect;
    }
}
