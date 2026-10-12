import { LitElement, css, html, nothing } from 'lit';
import { HUES, applyTheme } from '../../theme.js';
import { PAIRINGS, SECTIONS, SOURCE, aliasTrace, buildGroups, contrastRatio, cssVarOfKey, parseCssColor, semanticAttrs, toHex, COLOR_EXCLUSIONS, type AliasTrace, type ColorEntry, type Link, type SectionId, type SemanticMode } from './color-model.js';

// Storybook-only page element for Foundations / Colors (not part of the component library).
// Structure comes from the generated token source; every color shown is read back from the
// computed CSS variable, so the swatches follow the generated CSS and the selected modes.

const groups = buildGroups();
const ALL_SECTIONS: SectionId[] = SECTIONS.map(s => s.id);

export class SbColorPalette extends LitElement {
  static properties = {
    primary: { type: String },
    semanticColor: { type: String, attribute: 'semantic-color' },
    sections: { attribute: false },
    pairings: { type: Boolean },
    heading: { type: Boolean },
    query: { state: true },
  };

  /** Primary mode (the 02 Primary collection). */
  declare primary: (typeof HUES)[number];
  /** Semantic Color mode (the 03 Semantic Color collection). */
  declare semanticColor: SemanticMode;
  declare sections: SectionId[];
  /** Show the foreground and surface pairings. */
  declare pairings: boolean;
  /** Show the mode summary line and the coverage line. */
  declare heading: boolean;
  declare private query: string;

  constructor() {
    super();
    this.primary = 'Blue';
    this.semanticColor = 'Light';
    this.sections = ALL_SECTIONS;
    this.pairings = false;
    this.heading = true;
    this.query = '';
  }

  private get styleMode() {
    return this.closest('[data-sp-mode-style]')?.getAttribute('data-sp-mode-style') ?? 'Atlas';
  }

  private get settings() {
    return { style: this.styleMode, primary: this.primary, ...semanticAttrs(this.semanticColor) };
  }

  // The generated CSS matches mode attributes in the document, which does not reach into a shadow
  // root, so the modes go on the host element and the custom properties inherit into the shadow tree.
  protected override willUpdate() {
    const a = semanticAttrs(this.semanticColor);
    applyTheme(this, { hue: this.primary, colorScheme: a['color-scheme'] as 'Light' | 'Dark', highContrast: a.contrast === 'High' });
  }

  protected override updated() {
    // Read the live CSS back into the swatches. Only text and attributes that Lit does not bind are written.
    for (const swatch of this.renderRoot.querySelectorAll<HTMLElement>('[data-fill]')) {
      const cs = getComputedStyle(swatch);
      const color = parseCssColor(cs.backgroundColor);
      const out = swatch.closest('[data-token]')?.querySelector<HTMLElement>('[data-value]');
      if (!out) continue;
      out.textContent = color ? toHex(color) : cs.backgroundColor;
      out.title = `${swatch.dataset.fill}: ${cs.getPropertyValue(swatch.dataset.fill!).trim()}`;
      const alpha = swatch.closest('[data-token]')?.querySelector<HTMLElement>('[data-alpha]');
      if (alpha) alpha.textContent = color && color.a < 1 ? `${+(color.a * 100).toFixed(1)}% opaque` : '';
    }
    for (const tile of this.renderRoot.querySelectorAll<HTMLElement>('[data-pair]')) {
      const cs = getComputedStyle(tile);
      const surface = parseCssColor(cs.backgroundColor);
      const text = parseCssColor(cs.color);
      const out = tile.parentElement!.querySelector<HTMLElement>('[data-ratio]')!;
      const ratio = surface && text ? contrastRatio(surface, text) : null;
      out.textContent = ratio === null ? 'Contrast not computed: a color is translucent' : `Contrast ${ratio.toFixed(2)}:1 (computed from the resolved colors, not a conformance claim)`;
    }
  }

  private inFilter(e: ColorEntry) {
    const q = this.query.trim().toLowerCase();
    return !q || e.token.name.toLowerCase().includes(q) || e.cssVar.toLowerCase().includes(q);
  }

  private linkRow(l: Link) {
    return html`<li><span class="n">${l.name}</span> <code>${l.cssVar}</code> <span class="m">${l.collection}, ${l.mode}</span></li>`;
  }

  private trace(t: AliasTrace) {
    if (!t.links.length) return html`<div class="alias">Literal value</div>`;
    const opacity = t.opacity ? ('percent' in t.opacity ? html`<li>opacity <span class="n">${t.opacity.percent}%</span></li>` : html`<li>opacity</li>${t.opacity.links.map(l => this.linkRow(l))}`) : nothing;
    return html`<details class="alias">
      <summary>Alias of ${t.links[0].name}${t.links.length > 1 ? ` (${t.links.length} steps)` : ''}</summary>
      <ol>${t.links.map(l => this.linkRow(l))}${opacity}</ol>
    </details>`;
  }

  private swatch(e: ColorEntry) {
    return html`<li class="token" data-token=${e.token.key}>
      <div class="swatch"><div class="fill" data-fill=${e.cssVar} style="background:var(${e.cssVar})"></div></div>
      <div class="name">${e.token.name}</div>
      <code class="var">${e.cssVar}</code>
      <div class="value"><span data-value></span> <span class="m" data-alpha></span></div>
      ${this.trace(aliasTrace(e.token.key, this.settings))}
    </li>`;
  }

  private section(id: SectionId) {
    const meta = SECTIONS.find(s => s.id === id)!;
    const gs = groups.filter(g => g.section === id).map(g => ({ ...g, entries: g.entries.filter(e => this.inFilter(e)) })).filter(g => g.entries.length);
    if (!gs.length) return nothing;
    return html`<section>
      <h2>${meta.title}</h2>
      <p class="lead">${meta.description}</p>
      ${gs.map(g => html`<h3>${g.title} <span class="m">${g.entries.length}</span></h3><ul class="grid">${g.entries.map(e => this.swatch(e))}</ul>`)}
    </section>`;
  }

  private pairingSection() {
    return html`<section>
      <h2>Foreground and surface pairings</h2>
      <p class="lead">Each pair is a surface role with the text role named for it. The sample text is set in the pair, and the ratio is computed from the resolved colors.</p>
      <ul class="pairs">
        ${PAIRINGS.map(p => html`<li>
          <div class="pair" data-pair style="background:var(${cssVarOfKey(p.surface)});color:var(${cssVarOfKey(p.text)})"><strong>Aa</strong> ${p.label}</div>
          <div class="m" data-ratio></div>
          <code class="var">${cssVarOfKey(p.surface)}</code>
          <code class="var">${cssVarOfKey(p.text)}</code>
        </li>`)}
      </ul>
    </section>`;
  }

  override render() {
    const shown = this.sections;
    const total = shown.reduce((n, id) => n + groups.filter(g => g.section === id).reduce((m, g) => m + g.entries.length, 0), 0);
    return html`<div class="scope">
      ${this.heading
        ? html`<header>
            <p class="modes">Primary <b>${this.primary}</b> · Semantic Color <b>${this.semanticColor}</b> · Style <b>${this.styleMode}</b> (Style follows the toolbar)</p>
            ${total ? html`<p class="m">${total} COLOR tokens shown${COLOR_EXCLUSIONS.length ? `, ${COLOR_EXCLUSIONS.length} excluded` : ', none excluded'}. Source: Git-authored tokens/source.json, version ${SOURCE.version}.${SOURCE.source ? html` Initial import: ${SOURCE.source.figmaFileName}, ${SOURCE.source.exportedAt.slice(0, 10)}.` : nothing}</p>` : nothing}
            ${total ? html`<input type="search" aria-label="Filter colors by token or CSS variable name" placeholder="Filter by token or variable name" .value=${this.query} @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)} />` : nothing}
          </header>`
        : nothing}
      ${shown.map(id => this.section(id))}
      ${this.pairings ? this.pairingSection() : nothing}
    </div>`;
  }

  static styles = css`
    :host { display: block; }
    .scope { box-sizing: border-box; padding: 24px; background: var(--sp-color-background-default); color: var(--sp-color-foreground-default); font-family: var(--sp-font-family-body), system-ui, sans-serif; font-size: 13px; line-height: 1.4; }
    h2 { margin: 32px 0 4px; font-size: 18px; }
    h3 { margin: 20px 0 8px; font-size: 13px; font-weight: 600; text-transform: capitalize; }
    section:first-of-type h2 { margin-top: 8px; }
    p { margin: 0; }
    .lead, .m { color: var(--sp-color-foreground-muted); }
    .modes { margin-bottom: 4px; }
    input { box-sizing: border-box; width: 100%; max-width: 360px; margin: 8px 0 0; padding: 6px 10px; font: inherit; color: inherit; background: var(--sp-color-surface-default); border: 1px solid var(--sp-color-border-default); border-radius: 6px; }
    input:focus-visible, summary:focus-visible { outline: 2px solid var(--sp-color-focus-ring-default); outline-offset: 2px; }
    ul { margin: 0; padding: 0; list-style: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 12px; }
    .token { display: grid; gap: 2px; align-content: start; min-width: 0; }
    .swatch { height: 48px; border-radius: 6px; border: 1px solid var(--sp-color-border-default); overflow: hidden; background: repeating-conic-gradient(#8884 0 25%, transparent 0 50%) 0 0 / 12px 12px; }
    .fill { width: 100%; height: 100%; }
    .name { margin-top: 4px; font-weight: 600; overflow-wrap: anywhere; }
    code, .value { font-family: var(--sp-font-family-code), ui-monospace, monospace; font-size: 11px; overflow-wrap: anywhere; }
    code { color: var(--sp-color-foreground-muted); }
    .alias { font-size: 11px; color: var(--sp-color-foreground-muted); }
    summary { cursor: pointer; }
    ol { margin: 4px 0 0; padding-left: 16px; }
    li .n { color: var(--sp-color-foreground-default); }
    .pairs { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .pairs li { display: grid; gap: 2px; align-content: start; }
    .pair { padding: 14px 12px; border-radius: 8px; border: 1px solid var(--sp-color-border-default); font-size: 14px; }
    .pair strong { font-size: 20px; margin-right: 6px; }
  `;
}

if (!customElements.get('sb-color-palette')) customElements.define('sb-color-palette', SbColorPalette);
declare global { interface HTMLElementTagNameMap { 'sb-color-palette': SbColorPalette } }
