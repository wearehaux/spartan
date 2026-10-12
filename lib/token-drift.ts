import { validateTokensV2, type TokenSourceV2 } from './figma-tokens';

export type TokenDrift = Record<'added' | 'removed' | 'renamed' | 'changed' | 'modes' | 'identities', string[]>;
// Object key order is formatting, not a token change. Arrays (including modes) retain order.
const stable = (value: unknown): string => JSON.stringify(value, (_key, v) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);

/** Differences from Figma evidence to authored intent. Read-only; identity wins over names. */
export function diffTokenSources(authored: TokenSourceV2, figma: TokenSourceV2): TokenDrift {
  validateTokensV2(authored); validateTokensV2(figma);
  const drift: TokenDrift = { added: [], removed: [], renamed: [], changed: [], modes: [], identities: [] };
  const compare = <T extends { key: string; name: string; figma?: { id: string; key: string } }>(
    codeItems: T[], figmaItems: T[], inspect: (code: T, evidence: T) => void,
  ) => {
    const byId = new Map(figmaItems.filter(t => t.figma).map(t => [t.figma!.id, t]));
    const byKey = new Map(figmaItems.map(t => [t.key, t]));
    // Reserve identity matches first, even when a new unbound entry reuses an old key.
    const identities = new Map<T, T>();
    for (const code of codeItems) {
      const evidence = code.figma ? byId.get(code.figma.id) : undefined;
      if (evidence) identities.set(code, evidence);
    }
    const matched = new Set<T>(identities.values());
    for (const code of codeItems) {
      const keyed = byKey.get(code.key);
      const evidence = identities.get(code) ?? (keyed && !matched.has(keyed) ? keyed : undefined);
      if (!evidence) { drift.added.push(`Only in code: ${code.key} (${code.name})`); continue; }
      matched.add(evidence);
      if (code.key !== evidence.key || code.name !== evidence.name) drift.renamed.push(`${evidence.key} (${evidence.name}) -> ${code.key} (${code.name})`);
      if (stable(code.figma) !== stable(evidence.figma)) drift.identities.push(`${code.key}: Figma binding differs; code ${stable(code.figma) ?? 'unbound'}, export ${stable(evidence.figma) ?? 'unbound'}`);
      inspect(code, evidence);
    }
    for (const evidence of figmaItems) if (!matched.has(evidence)) drift.removed.push(`Only in Figma: ${evidence.key} (${evidence.name})`);
  };
  compare(authored.collections, figma.collections, (code, evidence) => {
    if (stable([code.modes, code.axes, code.modeAxes]) !== stable([evidence.modes, evidence.axes, evidence.modeAxes])) drift.modes.push(`${code.key}: code ${stable(code.modes)}; Figma ${stable(evidence.modes)}; review modes and axis mappings`);
    if (code.cssPrefix !== evidence.cssPrefix) drift.changed.push(`${code.key}: CSS prefix ${evidence.cssPrefix} -> ${code.cssPrefix}`);
  });
  compare(authored.tokens, figma.tokens, (code, evidence) => {
    if (stable([code.collection, code.type, code.unit, code.values]) !== stable([evidence.collection, evidence.type, evidence.unit, evidence.values])) {
      drift.changed.push(`${code.key}: code ${stable({ collection: code.collection, type: code.type, unit: code.unit, values: code.values })}; Figma ${stable({ collection: evidence.collection, type: evidence.type, unit: evidence.unit, values: evidence.values })}`);
    }
  });
  return drift;
}
