// The data behind Foundations / Colors. It reads the Git-authored production token source
// (tokens/source.json) and nothing else: token names, CSS variable names, grouping, and alias
// relationships come from it. Resolved colors are never stored here; the Storybook page reads them
// from the live CSS variables, so the swatches follow whatever the generated CSS produces.

import tokenSource from '../../../../../tokens/source.json';
import { assignmentFromAttributes, isAlpha, isRef, modeForAxes, tokenCssName, type ModeAssignment, type TokenSourceV2, type TokenV2 } from '../../../../../lib/figma-tokens';

export const SOURCE = tokenSource as unknown as TokenSourceV2;

export type SectionId = 'primitives' | 'primary' | 'semantic' | 'component' | 'style';

export const SECTIONS: { id: SectionId; title: string; description: string }[] = [
  { id: 'primitives', title: 'Primitive color scales', description: 'Raw color ramps from 01 Primitives. Every other color resolves to one of these.' },
  { id: 'primary', title: 'Primary brand palettes', description: 'The 02 Primary scale. Its values change with the Primary mode (Blue, Purple, Orange, Sky).' },
  { id: 'semantic', title: 'Semantic color roles', description: 'The 03 Semantic Color roles components use. Their values change with the Semantic Color mode and, for primary roles, the Primary mode.' },
  { id: 'component', title: 'Component colors', description: 'Colors owned by a component in 05 Component.' },
  { id: 'style', title: 'Style colors', description: 'Button and field colors from 07 Style. Their values change with the Style mode in the toolbar.' },
];

/** COLOR tokens that are deliberately not shown, each with the reason. Empty: every COLOR token is shown. */
export const COLOR_EXCLUSIONS: { key: string; reason: string }[] = [];

export type ColorEntry = { token: TokenV2; cssVar: string };
export type ColorGroup = { id: string; section: SectionId; title: string; entries: ColorEntry[] };

const sectionOf = (collection: string): SectionId => {
  switch (collection) {
    case 'primitives': return 'primitives';
    case 'primary': return 'primary';
    case 'semantic-color': return 'semantic';
    case 'component': return 'component';
    case 'style': return 'style';
    default: throw new Error(`Collection ${collection} has COLOR tokens but no section on the Colors page. Add it to color-model.ts.`);
  }
};

const segments = (t: TokenV2) => t.name.split('/');
// Group key: primitives by family (color/blue/500 -> blue), semantic by role (color/accent/default
// -> accent), style by component part (style/button/primary/... -> button/primary), others by the first
// segments of the name.
const groupSegment = (t: TokenV2): string => {
  const s = segments(t);
  if (t.collection === 'primitives' && s[1] === 'brand') return s.slice(1, 3).join('/');
  if (t.collection === 'primary') return 'primary';
  if (t.collection === 'style') return s.slice(1, s[1] === 'button' ? 3 : s.length > 3 ? 3 : 2).join('/');
  if (t.collection === 'component') return s[0];
  return s[1];
};

const stepOf = (t: TokenV2): number => {
  const n = Number(segments(t).at(-1));
  return Number.isFinite(n) ? n : Infinity;
};

export const colorTokens = (source: TokenSourceV2 = SOURCE): TokenV2[] => source.tokens.filter(t => t.type === 'COLOR');

export function buildGroups(source: TokenSourceV2 = SOURCE): ColorGroup[] {
  const excluded = new Set(COLOR_EXCLUSIONS.map(e => e.key));
  const groups = new Map<string, ColorGroup>();
  for (const token of colorTokens(source)) {
    if (excluded.has(token.key)) continue;
    const section = sectionOf(token.collection);
    const part = groupSegment(token);
    const id = `${section}:${part}`;
    if (!groups.has(id)) groups.set(id, { id, section, title: section === 'primary' ? 'Primary' : part, entries: [] });
    groups.get(id)!.entries.push({ token, cssVar: tokenCssName(token, source) });
  }
  const order = SECTIONS.map(s => s.id);
  const list = [...groups.values()];
  for (const g of list) g.entries.sort((a, b) => stepOf(a.token) - stepOf(b.token) || a.token.name.localeCompare(b.token.name));
  return list.sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section) || a.title.localeCompare(b.title));
}

// ---- alias relationships ----

export type Link = { key: string; name: string; collection: string; mode: string; cssVar: string };
export type AliasTrace = {
  /** Tokens this one resolves through, nearest first. Empty for a literal value. */
  links: Link[];
  /** Set for a translucent color: the opacity, either a percent literal or the tokens it comes from. */
  opacity?: { percent: number } | { links: Link[] };
};

/** Settings that pick one mode per collection, as the attributes do: style, primary, color-scheme, contrast, density. */
export type ModeSettings = Record<string, string | undefined>;

export function aliasTrace(key: string, settings: ModeSettings, source: TokenSourceV2 = SOURCE): AliasTrace {
  const byKey = new Map(source.tokens.map(t => [t.key, t]));
  const colls = new Map(source.collections.map(c => [c.key, c]));
  const assign: ModeAssignment = assignmentFromAttributes(source, settings);
  const modeOf = (t: TokenV2) => {
    const c = colls.get(t.collection)!;
    return assign[t.collection] ?? (c.axes ? modeForAxes(c, {}) : c.modes[0].name);
  };
  const link = (t: TokenV2): Link => ({ key: t.key, name: t.name, collection: t.collection, mode: modeOf(t), cssVar: tokenCssName(t, source) });
  // Follows color aliases from `start`; the first translucent token on the way supplies the opacity.
  let opacity: AliasTrace['opacity'];
  const follow = (start: string): Link[] => {
    const out: Link[] = [];
    let ref: string | undefined = start;
    while (ref) {
      const t = byKey.get(ref);
      if (!t) throw new Error(`Unknown token ${ref}.`);
      out.push(link(t));
      const v: unknown = t.values[modeOf(t)];
      if (isAlpha(v) && !opacity) opacity = isRef(v.alpha.opacity) ? { links: follow(v.alpha.opacity.alias) } : { percent: v.alpha.opacity };
      ref = isRef(v) ? v.alias : isAlpha(v) && isRef(v.alpha.color) ? v.alpha.color.alias : undefined;
    }
    return out;
  };
  const token = byKey.get(key);
  if (!token) throw new Error(`Unknown token ${key}.`);
  const value: unknown = token.values[modeOf(token)];
  const trace: AliasTrace = { links: [] };
  if (isRef(value)) trace.links = follow(value.alias);
  else if (isAlpha(value)) {
    if (isRef(value.alpha.color)) trace.links = follow(value.alpha.color.alias);
    opacity = isRef(value.alpha.opacity) ? { links: follow(value.alpha.opacity.alias) } : { percent: value.alpha.opacity };
  }
  if (opacity) trace.opacity = opacity;
  return trace;
}

/** The mode attributes that select a Semantic Color mode name. */
export const SEMANTIC_MODES = ['Light', 'Dark', 'Light High Contrast', 'Dark High Contrast'] as const;
export type SemanticMode = (typeof SEMANTIC_MODES)[number];
export const semanticAttrs = (mode: SemanticMode): { 'color-scheme': string; contrast: string } => {
  const c = SOURCE.collections.find(x => x.key === 'semantic-color')!;
  const axes = c.modeAxes![mode];
  return { 'color-scheme': axes['color-scheme'], contrast: axes.contrast };
};

// ---- foreground and surface pairings ----

export type Pairing = { label: string; surface: string; text: string };
const pair = (label: string, surface: string, text: string): Pairing => ({ label, surface: `semantic-color.color.${surface.replaceAll('/', '.')}`, text: `semantic-color.color.${text.replaceAll('/', '.')}` });

/** Surface and text roles that the token names declare as used together (a role's default with its foreground, its surface with its text). */
export const PAIRINGS: Pairing[] = [
  pair('Page', 'background/default', 'foreground/default'),
  pair('Page, muted text', 'background/default', 'foreground/muted'),
  pair('Surface', 'surface/default', 'foreground/default'),
  pair('Surface, subtle', 'surface/subtle', 'foreground/default'),
  pair('Surface, muted', 'surface/muted', 'foreground/default'),
  pair('Surface, elevated', 'surface/elevated', 'foreground/default'),
  pair('Surface, selected', 'surface/selected', 'foreground/default'),
  pair('Surface, disabled', 'surface/disabled', 'foreground/disabled'),
  pair('Primary', 'primary/default', 'primary/foreground'),
  pair('Primary, tinted', 'primary/surface', 'primary/text'),
  pair('Secondary', 'secondary/default', 'secondary/foreground'),
  pair('Accent', 'accent/default', 'accent/foreground'),
  pair('Accent, tinted', 'accent/surface', 'accent/text'),
  pair('Danger', 'danger/default', 'danger/foreground'),
  pair('Danger, tinted', 'danger/surface', 'danger/text'),
  pair('Warning', 'warning/default', 'warning/foreground'),
  pair('Warning, tinted', 'warning/surface', 'warning/text'),
  pair('Success', 'success/default', 'success/foreground'),
  pair('Success, tinted', 'success/surface', 'success/text'),
  pair('Information', 'information/default', 'information/foreground'),
  pair('Information, tinted', 'information/surface', 'information/text'),
  pair('Control', 'control/default', 'control/foreground'),
];

export const cssVarOfKey = (key: string, source: TokenSourceV2 = SOURCE): string => {
  const t = source.tokens.find(x => x.key === key);
  if (!t) throw new Error(`Unknown token ${key}.`);
  return tokenCssName(t, source);
};

// ---- computed colors ----

export type Rgb = { r: number; g: number; b: number; a: number };

/** Parses the rgb(), rgba(), and color(srgb ...) text a browser serializes for a computed color. */
export function parseCssColor(text: string): Rgb | null {
  const nums = (text.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
  if (/^color\(\s*srgb/.test(text.trim()) && nums.length >= 3) return { r: nums[0] * 255, g: nums[1] * 255, b: nums[2] * 255, a: nums[3] ?? 1 };
  if (/^rgba?\(/.test(text.trim()) && nums.length >= 3) return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] ?? 1 };
  return null;
}

const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export const toHex = (c: Rgb): string => `#${byte(c.r)}${byte(c.g)}${byte(c.b)}${c.a < 1 ? byte(c.a * 255) : ''}`.toUpperCase();

const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = (c: Rgb) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

/** WCAG 2.x contrast ratio of two opaque colors, or null when either is translucent (the result would depend on what is behind it). */
export function contrastRatio(a: Rgb, b: Rgb): number | null {
  if (a.a < 1 || b.a < 1) return null;
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
