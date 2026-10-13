# Spartan Design System

Code-owned design system using Lit, Storybook, and a custom Figma token plugin.

Project documentation and tasks live in Linear:

- [Documentation home](https://linear.app/wearehaux/document/spartant-design-system-project-home-5730425b4e0d)
- [Project issues](https://linear.app/wearehaux/project/spartant-design-system-b4328c010ac8/overview)

Each component has one Linear issue with separate `Dev: ...` and `Figma: ...` labels. Both must be Done for overall completion. Other work uses normal Linear issue status.

## Local commands

```sh
pnpm install
pnpm dev
```

`/docs` is the published design-system usage documentation (Fumadocs), served from `content/docs`. The retired project routes (`/docs/project/*`, `/docs/architecture`, `/docs/sync/*`, `/docs/development/*`) still redirect to their Linear documents. The old task API returns 410 with the Linear project URL. `content/archive` and `data/tasks.json` remain as migration snapshots and should not be updated as live documentation or task state.

- `pnpm storybook`: Lit Storybook playground on http://127.0.0.1:6006
- `pnpm storybook:build`: static Storybook build
- `pnpm docs:storybook`: build Storybook and copy it to `public/storybook`, where the docs site serves and embeds it at `/storybook`
- `pnpm docs:build`: `docs:storybook` plus `pnpm build`, the production build of the docs site
- `pnpm components:build`: build `packages/components` (`@spartan/components`)
- `pnpm tokens:build`: generate `public/tokens.css` from Git-authored `tokens/source.json`; it never imports Figma
- `pnpm tokens:check`: validate the authored source and fail when generated CSS is stale
- `pnpm tokens:drift [export-path]`: compare the authored source with the saved or supplied Figma export without writing files; differences exit 1
- `pnpm tokens:import [export-path] [--out candidate-path]`: create a review candidate, defaulting to `tokens/figma/import-candidate.json`; refuses existing output files and the canonical source path
- `pnpm test:e2e`: builds Storybook and runs real-keyboard Chromium tests
- `pnpm test`: builds the component package, then runs token, plugin, package-consumer, and historical local tracker checks
- `pnpm build`: token output, plugin bundle, component package, and the Next.js docs build
- `pnpm typecheck`: TypeScript checks
- `pnpm plugin:build`: rebuild the Figma development plugin

`tokens/source.json` (`spartan.tokens.v2`) is the canonical Git authoring source, seeded from the verified Spartan DS export with its values, aliases, modes, and identities preserved. Edit it through reviewed changes and regenerate CSS, which is never edited by hand. Read [the token authoring guide](tokens/README.md) and [the Figma snapshot guide](tokens/figma/README.md) for ownership, validation, and deliberate reconciliation.

Import `plugin/manifest.json` into Figma. Read the [Linear plugin guide](https://linear.app/wearehaux/document/custom-figma-plugin-634833fa2f31) before use. The plugin and its tests still use the isolated v1 fixture in `tokens/fixtures/lab.json`; it cannot apply the production v2 source yet. Its production upgrade is tracked in [HAUX-85](https://linear.app/wearehaux/issue/HAUX-85), and real Figma runtime validation remains pending. The first Lit components (`sp-button`, `sp-icon-button`, `sp-input`, and `sp-textarea`) and Storybook live in `packages/components`; Figma parity is tracked in their Linear issues.

This directory preserves the previous workspace's pending deletions and does not restore the earlier React implementation.

## Icons in Storybook

Buttons take icons in the `start` (left) and `end` (right) slots, and any `<svg>` works. Storybook offers the licensed [Central Icons](https://iconists.co/central) set (round, outlined, radius 2, stroke 1.5, the Figma icon spec) through an **Icons** panel: search by name or keyword, then pick a left and a right icon.

- The icon package is a story-only optional dependency. Install with your license key in the environment: `CENTRAL_LICENSE_KEY=... pnpm install`. Never commit the key.
- `pnpm storybook` and `pnpm storybook:build` run `icons:generate`, which writes git-ignored `packages/components/.storybook/generated/icons.json`. Nothing from the icon set is in `src`, `dist`, or git, and the license forbids redistributing it.
- Without the package installed, stories fall back to a plain plus icon and the panel explains how to enable the library.

## Branches

`dev` is the default branch and the target for feature pull requests. `main` only receives release pull requests from `dev`; see `AGENTS.md`. Both are protected by rulesets and take pull requests only. The `validate` workflow runs on pull requests and pushes to both branches. Run `pnpm tokens:check`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm test:stories` locally before opening a pull request into `dev`. Figma drift is a separate reconciliation check and does not gate code CI.

## Documentation site

The docs site is Next.js with Fumadocs. Pages are MDX under `content/docs`, grouped as Getting started, Foundations, Theming, and Components, and ordered by each folder's `meta.json`. Search is a static index at `/api/search`. The site is styled with the generated `--sp-*` tokens, and its header toggle sets `data-sp-mode-color-scheme` to `Light` or `Dark`.

- Run it: `pnpm dev` (http://127.0.0.1:4310). Embeds point at `/storybook`, so run `pnpm docs:storybook` once, or set `NEXT_PUBLIC_STORYBOOK_URL=http://127.0.0.1:6006` and run `pnpm storybook`.
- Add a component page: copy `content/templates/component-page.mdx` to `content/docs/components/<name>.mdx`, add the name to `content/docs/components/meta.json`, and fill every table from the component source. Describe implemented behavior only. `tests/docs.test.ts` fails if a page lacks a title or description, embeds a story id that does not exist, or uses an em dash.
- Ownership: usage documentation lives here. Task tracking, project decisions, and workflow documents stay in Linear.

## Publishing on Vercel

There are two Vercel projects in the `iroshandezilvas-projects` team, both connected to this repository with the repo root as Root Directory. Their build settings live in the Vercel project settings, not in `vercel.json`, which only sets the install command.

| Project | Framework | Build command | Output |
| --- | --- | --- | --- |
| `spartan-docs` (docs site, https://spartan-docs.vercel.app) | Next.js | `pnpm docs:build` | Next.js default; includes Storybook at `/storybook` |
| `spartan-storybook` (standalone Storybook) | Other | `pnpm storybook:build` | `packages/components/storybook-static` |

Both set `ignoreCommand` to skip every branch except `main` (Production) and `dev` (Preview), and skip pull request branches. To deploy by hand from the repo root:

```sh
vercel link --project spartan-docs --scope iroshandezilvas-projects   # once; .vercel is git-ignored
vercel deploy --scope iroshandezilvas-projects                         # preview
vercel deploy --prod --scope iroshandezilvas-projects                  # production
```

Do not add `CENTRAL_LICENSE_KEY` to either project's environment while it is public. The Iconists license forbids sharing the icons publicly, so the published Storybook (including the copy under `/storybook` on the docs site) shows the plain fallback icon.

## Theme settings

The [shared theme contract](tokens/THEME-CONTRACT.md) defines Brand/System separation,
family Style recipes, local Appearance, and named Density roles. Review the live
**Foundations / Theme contract** fixture in Storybook. Production component adoption
and Figma synchronization retain their separate issue evidence.

Style (Atlas, Selene, Helios, Ares), color scheme (Light, Dark), **high contrast** (on or off), brand hue, and density are five independent settings. High contrast is a boolean that composes with every style and both color schemes, not a theme value. Set them with `applyTheme` from `@spartan/components/theme`, or with the `data-sp-mode-*` attributes. Storybook has a control for each, including a High contrast switch, and they are Storybook globals, so a shared link reproduces them. See `tokens/figma/README.md` for the attributes, the migration from the earlier combined theme values, and how the CSS composes them.
