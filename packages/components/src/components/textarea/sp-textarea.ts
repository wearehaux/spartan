import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { TextControl, type TextControlSize, type TextControlAppearance } from '../shared/text-control.js';
import { textareaStyles } from './sp-textarea.styles.js';

export type TextareaSize = TextControlSize;
export type TextareaAppearance = TextControlAppearance;
export type TextareaResize = 'vertical' | 'none';
export type TextareaWrap = 'soft' | 'off';

/** Native multiline editing. Label, description and error slots compose the field. */
export class SpTextarea extends TextControl {
  static override styles = textareaStyles;
  static override properties = {
    ...TextControl.properties, rows: { type: Number, reflect: true }, resize: { reflect: true },
    autoGrow: { type: Boolean, attribute: 'autogrow', reflect: true }, wrap: { reflect: true },
  };
  declare rows: number;
  declare resize: TextareaResize;
  declare autoGrow: boolean;
  declare wrap: TextareaWrap;
  #observer: ResizeObserver | undefined;
  #themeObserver: MutationObserver | undefined;
  #sizedAutomatically = false;

  constructor() { super(); this.rows = 2; this.resize = 'vertical'; this.autoGrow = false; this.wrap = 'soft'; }
  protected get control(): HTMLTextAreaElement | null { return this.renderRoot?.querySelector('textarea') ?? null; }
  override connectedCallback() {
    super.connectedCallback();
    this.#observer ??= new ResizeObserver(() => this.#measure());
    this.#observer.observe(this);
    this.#themeObserver ??= new MutationObserver(() => this.#measure());
    let ancestor: Element | null = this;
    while (ancestor) {
      this.#themeObserver.observe(ancestor, { attributes: true, attributeFilter: ['data-sp-mode-density', 'data-sp-mode-style', 'data-sp-mode-color-scheme', 'data-sp-mode-contrast', 'data-sp-mode-primary', 'style', 'class', 'dir'] });
      ancestor = ancestor.parentElement ?? (ancestor.getRootNode() instanceof ShadowRoot ? (ancestor.getRootNode() as ShadowRoot).host : null);
    }
    document.fonts?.addEventListener('loadingdone', this.#onFontsLoaded);
    document.fonts?.ready.then(() => { if (this.isConnected) this.#measure(); });
  }
  override disconnectedCallback() {
    this.#observer?.disconnect(); this.#themeObserver?.disconnect(); document.fonts?.removeEventListener('loadingdone', this.#onFontsLoaded); super.disconnectedCallback();
  }
  protected override sync() { super.sync(); this.#measure(); }
  #onFontsLoaded = () => this.#measure();
  #measure() {
    const input = this.control; if (!input) return;
    if (!this.autoGrow) {
      if (this.#sizedAutomatically) { input.style.removeProperty('block-size'); this.#sizedAutomatically = false; }
      return;
    }
    if (!input.getClientRects().length) return;
    // Manual resizing belongs to the browser. Auto sizing starts from rows and
    // the token-backed minimum, then measures wrapping at the actual width.
    input.style.removeProperty('height'); input.style.blockSize = 'auto';
    input.style.blockSize = `${input.scrollHeight}px`; this.#sizedAutomatically = true;
  }
  setRangeText(replacement: string, start?: number, end?: number, selectionMode?: SelectionMode) {
    const input = this.control; if (!input) return;
    if (start === undefined && end === undefined) input.setRangeText(replacement);
    else input.setRangeText(replacement, start ?? input.selectionStart, end ?? input.selectionEnd, selectionMode);
    this.captureEdit();
  }
  protected renderControl(described: string) {
    const rows = Number.isFinite(this.rows) && this.rows > 0 ? Math.max(1, Math.floor(this.rows)) : 2;
    return html`<textarea id="control" class="control" part="textarea" rows=${rows} name=${this.name ?? ''}
      .value=${live(this.value)} placeholder=${this.placeholder ?? ''} aria-label=${this.ariaLabel?.trim() || nothing}
      aria-describedby=${described || nothing} aria-invalid=${this.invalidState ? 'true' : nothing}
      ?disabled=${this.controlDisabled} ?readonly=${this.readOnly} ?required=${this.required}
      minlength=${ifDefined(this.minLength ?? undefined)} maxlength=${ifDefined(this.maxLength ?? undefined)}
      autocomplete=${this.autocomplete ?? ''} inputmode=${this.inputMode ?? ''} wrap=${this.wrap === 'off' ? 'off' : 'soft'}
      data-resize=${this.autoGrow || this.resize === 'none' ? 'none' : 'vertical'}
      @input=${this.onInput} @change=${this.onChange} @focus=${this.syncA11y}></textarea>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'sp-textarea': SpTextarea; } }
