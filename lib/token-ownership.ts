import { isAlpha, isRef, validateTokensV2 } from './figma-tokens';

// Source collection -> allowed alias targets. Same-layer reuse is allowed after cycle checks.
// Custom collections remain governed by the general v2 graph validator.
const TARGETS: Record<string, readonly string[]> = {
  primitives: ['primitives'], primary: ['primitives', 'primary'],
  'semantic-color': ['primitives', 'primary', 'semantic-color'],
  'semantic-foundation': ['primitives', 'semantic-color', 'semantic-foundation'],
  density: ['primitives', 'semantic-foundation', 'density'],
  style: ['primitives', 'semantic-color', 'semantic-foundation', 'style'],
};

export function validateTokenOwnership(input: unknown) {
  const source = validateTokensV2(input);
  const byKey = new Map(source.tokens.map(token => [token.key, token]));
  for (const token of source.tokens) for (const value of Object.values(token.values)) {
    const refs = isRef(value) ? [value] : isAlpha(value) ? [value.alpha.color, value.alpha.opacity].filter(isRef) : [];
    for (const ref of refs) {
      const target = byKey.get(ref.alias)!;
      // Existing alpha colors use Foundation's percent opacity roles. This is shared
      // numeric metadata, not a second color palette or a Component dependency.
      const opacityRole = token.collection === 'semantic-color' && target.collection === 'semantic-foundation' && target.type === 'FLOAT' && target.unit === 'percent';
      const legacySpacingRole = token.collection === 'semantic-foundation' && token.key.startsWith('semantic-foundation.space.') && target.collection === 'density' && target.type === 'FLOAT' && target.unit === 'px';
      const allowed = Object.hasOwn(TARGETS, token.collection) ? TARGETS[token.collection] : undefined;
      if (!opacityRole && !legacySpacingRole && allowed && !allowed.includes(target.collection)) {
        throw new Error(`Token ownership violation: ${token.collection} (${token.key}) cannot reference ${target.collection} (${target.key}).`);
      }
    }
  }
  return source;
}
