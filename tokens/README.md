# Token authoring

The shared theme responsibilities, family recipes and Figma mapping are in
[THEME-CONTRACT.md](THEME-CONTRACT.md). The current contract has 685 definitions;
the HAUX-152 migration record lists the 138 additions and accepted alias changes.

`tokens/source.json` is the canonical Git-authored `spartan.tokens.v2` contract. It was
seeded from the verified Spartan DS Figma export, preserving all 547 token values,
aliases, collection modes, CSS names, and existing Figma identities. The ownership
transition changes the build workflow, not the theme design or public token names.

```text
Git-authored tokens/source.json -> public/tokens.css -> Lit, Storybook, docs, package
Figma export -> separate review candidate -> manually reviewed authoring changes
```

## File ownership

| File | Role | How it changes |
| --- | --- | --- |
| `tokens/source.json` | Canonical production v2 source | Reviewed edits in Git |
| `public/tokens.css` | Generated production CSS | `pnpm tokens:build`; never edit by hand |
| `tokens/figma/spartan-ds.export.json` | Read-only migration provenance and comparison snapshot | Explicitly reviewed snapshot refresh |
| `tokens/figma/import-candidate.json` | Default temporary Figma review candidate | Explicit import only; not consumed by builds |
| `tokens/fixtures/lab.json` | Isolated v1 fixture for the current Figma plugin | Plugin development; not the production source |

The source's optional `source` field records Figma export provenance. It does not make
the export authoritative. Token and collection `figma` bindings and mode `figmaId`
fields are optional for new code-authored entries. Preserve existing IDs and keys;
never invent them for entries that have not been created and verified in Figma.

## Commands

Run from the repository root:

| Command | Reads | Writes | Result |
| --- | --- | --- | --- |
| `pnpm tokens:build` | Authored source | `public/tokens.css` | Validates source and generates deterministic CSS; never imports Figma |
| `pnpm tokens:check` | Authored source and generated CSS | Nothing | Fails for invalid source or stale CSS; does not compare Figma |
| `pnpm tokens:drift [export-path]` | Authored source and saved or supplied Figma export | Nothing | Reports additions, removals, renames, values, modes, and identities; exits 1 for differences |
| `pnpm tokens:import [export-path] [--out candidate-path]` | Saved or supplied Figma export | Separate v2 review candidate | Defaults to `tokens/figma/import-candidate.json`; refuses existing output files and the canonical source path |
| `pnpm tokens:manifest <manifest.txt>` | Figma hash manifest and saved snapshot | Nothing | Finds which exported variables and collection headers need refreshing |

Drift is an explicit reconciliation check, not a code CI gate. A reviewed code change
can intentionally differ from the older Figma snapshot until its Figma handoff. Code
validation depends on the authored contract and generated CSS, so it works without
Figma availability.

## Author a change

1. Read the component issue and existing token chain. Reuse a semantic or component
   alias before adding another literal. Treat unresolved theme choices as proposals,
   not approval to remove modes or redesign the contract.
2. Edit `tokens/source.json`. Preserve unaffected keys, names, types, units, aliases,
   modes, axis definitions, and Figma bindings. Supply a value for every collection
   mode. FLOAT lengths use `px`, opacity uses `percent`, and ratios or weights omit
   the unit. Aliases must resolve to a
   token with the same type and unit.
3. Run `pnpm tokens:build`, then `pnpm tokens:check`. Repeat generation to confirm it
   produces identical CSS and leaves the authored source unchanged.
4. Run the applicable repository and browser checks, review the source and CSS diff,
   and commit them together. Record accepted token changes and pending Figma work
   in the Linear issue.

For example, the existing component token `component.button.height.base` aliases
`density.density.control.height.base`. That density token provides 40px in Relaxed
and 32px in Compact. A reviewed density adjustment belongs in its authored values;
keep the component alias and the existing Figma binding intact. Generation then
updates the consuming CSS without flattening the alias into a component literal.

Validation rejects unresolved aliases, cycles, missing mode values, type or unit
mismatches, invalid values, and CSS name collisions. New code-authored collections
and tokens do not require Figma IDs; use their real contract metadata and units.

## Review a Figma difference

```sh
pnpm tokens:drift /tmp/new-export.json
pnpm tokens:import /tmp/new-export.json --out /tmp/figma-review-candidate.json
```

The first command reports differences and can exit 1 as expected. The second creates
a candidate at a fresh output path. Compare it with `tokens/source.json`, decide
which changes are intended, then manually merge only those changes into the authored
source. Preserve code-authored additions that are absent from an older export.
Regenerate CSS and validate the resulting contract. Do not copy a whole candidate
over the source or accept deletions solely because an export omits an entry.

Snapshot refresh instructions and collection mode mappings are in
[figma/README.md](figma/README.md). Updating the snapshot is a separate reviewed
provenance change and never an automatic authoring reset.

## Figma plugin boundary

The custom plugin still accepts the v1 fixture and rejects cross-collection aliases.
It cannot apply the production v2 source yet. Production support and real Figma
runtime verification remain tracked in [HAUX-85](https://linear.app/wearehaux/issue/HAUX-85).
Before any production library write, preview the import, preserve identities and
aliases, and verify it in a disposable Figma file. This gate applies to Figma writes
while code work continues with validated CSS.
