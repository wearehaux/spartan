# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md is the project source of truth. Read the linked guide for the task: [.doc/project.md](.doc/project.md) for code, tokens, plugin, and Linear tracking; [.doc/figma.md](.doc/figma.md) for any Figma work.

## Delivery policy

Follow [AGENTS.md](AGENTS.md#code-first-delivery) and the [code-first implementation plan](doc/code-first-implementation-plan.html): a safe Git token contract, working Lit components finalized in Storybook, then stable Figma family batches. The [theme report](doc/theme-system-report.html) contains open design decisions as well as recommendations; do not treat those recommendations as approved token migrations.

Figma MCP limits and importer runtime checks gate Figma writes only. Continue code work and verified code releases when their Development prerequisites pass, while recording Figma as pending. Use one component issue with independent Development/Figma tracks, Agent Done evidence, and a stable revision/token/property/state/slot/capture handoff. Overall component Done still requires both tracks. Preserve 🟢 pages and use 🟣 only after Figma structural and visual verification.

## Repository state

- All code lives at the repository root, with its own `package.json` and `packages/components`. The old React monorepo (`apps/`, the old `packages/`, old root config) shows as deletions or replaced files in `git status`. Keep those deletions and never restore the old project.
- Root `.npmrc` (`engine-strict`) and `.node-version` (Node 26) still apply.
- The React-era CI workflows, `.github/` guides, release changesets, and the `spartan-component-builder` skill were deleted. Do not recreate them; the earlier React Linear issues are historical only.
- `doc/` holds reference captures (Attio audits). It is not part of the build. `.doc/` holds the agent guides.

## Commands

Run everything from the repository root with pnpm (the only supported package manager):

```sh
pnpm install
pnpm dev              # Next.js on http://127.0.0.1:4310
pnpm test             # node:test over tests/*.test.ts via tsx
pnpm build            # tokens:build, plugin:build, components:build, then next build --webpack
pnpm typecheck        # app tsconfig plus plugin/tsconfig.json
pnpm tokens:build     # Git-authored tokens/source.json -> public/tokens.css, no Figma import
pnpm tokens:check     # validate authored source and fail if generated CSS is stale
pnpm tokens:drift     # compare authored source with saved Figma export; optional export-path
pnpm tokens:import    # review candidate only; optional export-path and --out candidate-path
pnpm tokens:manifest  # diff a Figma hash manifest against the snapshot to find what to refetch
pnpm plugin:build     # esbuild plugin/code.ts + ui.html -> plugin/dist
pnpm components:build # packages/components -> dist (typed exports + tokens.css)
pnpm storybook        # Lit Storybook on http://127.0.0.1:6006
pnpm test:e2e         # builds Storybook, then real-keyboard Chromium tests (Playwright)
pnpm icons:generate   # (in packages/components) licensed Central Icons -> git-ignored Storybook data
```

Run a single test file or test by name:

```sh
node --import tsx --test tests/tokens.test.ts
node --import tsx --test --test-name-pattern="aliases" tests/*.test.ts
```

## Architecture

Follow [tokens/THEME-CONTRACT.md](tokens/THEME-CONTRACT.md) for the implemented Brand/System separation, family Style recipes, local Appearance and named Density roles. Preserve current density typography/icons and Card anatomy. Build/check enforce ownership rules in `lib/token-ownership.ts`. **Foundations / Theme contract** contains infrastructure fixtures for review, while production component adoption stays on its existing issue.

The token pipeline feeds the Lit components in `packages/components` (`@spartan/components`: `sp-button`, `sp-icon-button`) and their Storybook.

- `tokens/source.json` (`spartan.tokens.v2`) is the canonical Git authoring source, seeded from the verified Figma export without changing its values, aliases, modes, or identities. Edit it through reviewed changes. `public/tokens.css` is generated from it; do not edit CSS by hand. [tokens/README.md](tokens/README.md) covers authoring and validation.
- `tokens/figma/spartan-ds.export.json` is read-only migration provenance and a comparison snapshot of 547 variables in seven collections, including 07 Style. `tokens/figma/README.md` explains collection modes and deliberate reconciliation. `tokens:build` and `tokens:check` do not import or compare Figma. `tokens:drift [export-path]` reports differences without writes and exits 1 for drift. `tokens:import [export-path] [--out candidate-path]` writes a review candidate, defaulting to `tokens/figma/import-candidate.json`, and refuses existing files and the canonical source path. Review the candidate and manually merge accepted changes; never automatically replace the authored source.
- Figma provenance, token/collection bindings, and mode IDs are optional for new code-authored entries. Preserve existing IDs and keys and never invent them. Production v2 support in the Figma plugin remains tracked in [HAUX-85](https://linear.app/wearehaux/issue/HAUX-85); the ownership migration does not upgrade that plugin.
- `lib/figma-tokens.ts` is the v2 contract: import, validation, cross-collection alias resolution, mode-aware CSS (`data-sp-mode-<collection>` attributes), and drift diff. It fails explicitly on unresolved aliases, type or unit mismatches, cycles, and unsupported values.
- `lib/token-contract.ts` is the v1 contract. It still drives the custom Figma plugin and its fixture `tokens/fixtures/lab.json`, and rejects cross-collection aliases. Changes there affect the plugin and its tests.
- `plugin/code.ts` is the custom Figma plugin (no MCP). It validates input with the v1 contract, previews a diff, then applies it, persisting a token-key to Figma-ID map in root plugin data (`spartan-token-map-v1`). It cannot import the production v2 source yet. Import `plugin/manifest.json` into Figma; it has no network access.
- Storybook has an Icons panel (`.storybook/manager.tsx`) over the licensed Central Icons set, generated into a git-ignored file. Never commit icon data or the license key; see `README.md`.
- Theme settings are five independent attributes (style, color scheme, contrast, hue, density); high contrast is a boolean, never a theme value. The CSS composes them with inherited toggle variables, `packages/components/src/theme.ts` is the runtime API, and Storybook has a control for each. See `tokens/figma/README.md`.
- Components consume only generated `--sp-*` variables. Sizes, paddings, type, and icon sizes come from the Component and Density collections, so Relaxed and Compact density change them.
- The Next.js + Fumadocs app publishes the design-system usage docs from `content/docs` (Getting started, Foundations, Theming, Components) with static search at `/api/search`. Retired project routes redirect to Linear via `lib/linear-docs.json` (applied in `next.config.mjs`), and `app/api/tasks` returns 410. `content/archive` MDX and `data/tasks.json` are frozen migration snapshots; do not edit them as live docs or task state. `pnpm docs:build` also embeds the static Storybook at `/storybook`. Vercel projects and deploy steps are in `README.md`.

## Writing rules

- Do not use em dashes in code or docs.
- Mocked Plugin API tests and a passing build do not prove Figma runtime behavior; say so when reporting.
