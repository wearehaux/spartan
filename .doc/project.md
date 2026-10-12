# Spartan project workflow

Collaborative copy: [Agent workflow in Linear](https://linear.app/wearehaux/document/agent-workflow-3b7ab59c7144).

The user selected Lit, Storybook as the component playground, and a custom code-to-Figma token plugin without MCP. Project documentation and task tracking belong in Linear. These choices apply to the code at the repository root. Preserve the previous React implementation's pending deletions.

## Agreed delivery order

The delivery plan is code first: establish the Git token contract, finalize working Lit components in Storybook, then bring stable component families into Figma in batches. Figma MCP limits are a scheduling constraint for the Figma track, not a reason to stop code development or a verified code release. The custom plugin remains the on-demand token transfer mechanism; component construction and inspection may use MCP when available.

Read the [code-first implementation plan](../doc/code-first-implementation-plan.html) for sequencing and the [theme architecture report](../doc/theme-system-report.html) for the token model and open choices. The delivery order is approved. The reports do not, by themselves, approve deleting Primary modes, changing density typography, replacing public component properties, or migrating variable identities. Record each unresolved contract decision and its acceptance criteria before implementing that change.

1. Establish safe token authoring ownership and the shared contract, including mode responsibilities and alias rules.
2. Adapt shadcn component names, anatomy, states, and API concepts into Lit using Spartan tokens. React behavior is a reference to implement and verify, not code that can be assumed to work unchanged in Lit.
3. Finalize each component's design, sizes, density, style inheritance, state styling, properties, events, and slots in actual Lit components and Storybook. Verify behavior, keyboard access, focus, and applicable accessibility states.
4. Capture a stable handoff revision and queue the Figma work. Continue dependent code work when its Development prerequisites are satisfied.
5. Build and verify the corresponding Figma family within the available tool budget. Preserve existing component identity, useful properties, nested instances, and native slots. Keep pages marked 🟢 untouched and mark updated pages 🟣 only after structural and visual checks.

Figma should faithfully represent the stable code contract. If a code pattern cannot map into maintainable Figma variables or components, record the mismatch and resolve it explicitly. Do not silently alter code or invent a second token contract to make a Figma batch fit.

## Canonical Linear records

Track current work in the Spartan Design System Linear project. The older React issues remain historical.

- [Documentation home](https://linear.app/wearehaux/document/spartant-design-system-project-home-5730425b4e0d)
- [Project issues](https://linear.app/wearehaux/project/spartant-design-system-b4328c010ac8/overview)

Use Linear to fetch, update, and verify project documentation and issues. Do not maintain a parallel local tracker. `content/archive` MDX and `data/tasks.json` are preserved migration snapshots. The retired local project routes redirect to Linear documents; the local task API returns 410 with the Linear project URL. The previous Notion pages remain historical references.

## Task contract

- Reuse one canonical Linear issue per component. Search the project issues and source ID before creating a record.
- Whenever you create a Linear task, update `doc/task-order.html` in the same work session. Add the exact task name, issue ID and direct Linear link; place prerequisites before dependent tasks and renumber the rows. Keep the view aligned when dependencies or open-task membership change. Verify names, links, duplicates and ordering against Linear. Preserve the compact table: order, task name, ID and link. This HTML is a derived work-order view, not a second task tracker; Linear remains the source of truth. Keep Agent Done issues visible until they are actually Done, canceled or archived.
- Update Development and Figma independently through the `Development track` and `Figma track` label groups. Keep one label from each group and mirror both values in the issue description. Both must be Done for overall completion; reopening either track reopens the issue.
- When an agent finishes work on an issue, set the issue status to **Agent Done** and record the evidence in the issue: what changed, the verification run, and the remaining gaps. Do this for every issue type, and also when only part of the issue is complete. Keep the issue current as the work moves, not only at the end: when you start, set it In Progress and the Development label; after every commit, push, or pull request, add the PR link to the issue and post a comment (or edit your evidence comment) so it never says work is uncommitted or missing a PR when it is not. Before you reply that the work is finished, check the issue's status, labels, PR link, and latest comment against the repository.
- Agent Done is not Done. Move a component issue to Done only when its Development and Figma tracks are both Done.
- Model dependencies by track. A dependent component's code may proceed when the prerequisite Development contract is complete, even when that prerequisite's Figma work is pending. State the track-specific dependency in the issue rather than using unfinished Figma work as an undifferentiated block on code. A Figma task still requires its own stable code handoff and verified token importer when an import is needed.
- Documentation, Plugin, Infrastructure, and Research work uses normal Linear issue status.
- Preserve unverified work as Needs verification, with evidence and remaining acceptance gates in the task body.
- Do not infer current completion from old screenshots or the historical Notion state.

### Handoff for a deferred Figma batch

Keep the handoff on the existing component issue, with both track labels and their values mirrored in the description. Include:

- The exact code revision, component location, and Storybook stories used for review.
- The token diff and relevant aliases, modes, and any accepted exceptions.
- Public properties, events, sizes, variants, states, slots, and nested component dependencies.
- Representative Storybook captures, validation results, and known Figma representation gaps.
- Target Figma page/node IDs if known, protected pages, completed work, and the next resume checkpoint.

When a code agent finishes, set Agent Done and describe Figma as pending with these remaining gates. A later Figma agent rechecks the saved target nodes and component revision, completes a bounded family batch, and records its own verification. If code changed after handoff, update the diff before applying it. Do not restart discovery or mark the Figma track Done from code screenshots alone.

## Documentation

Maintain the Linear project documents for setup, architecture, variables, plugin workflow, component development, Storybook, validation, decisions, and changelog. Distinguish implemented behavior from planned capabilities. The Fumadocs site (`content/docs`, published at https://spartan-docs.vercel.app) is the design-system usage documentation: getting started, tokens, theming, and component references linked to Storybook and Figma. It is not the project documentation source. Authoring steps, ownership, and Vercel deployment are in `README.md`.

## Token sync

The target is one Git-owned authoring source feeding generated CSS and the custom Figma plugin. The current implementation has not completed that ownership transition: `pnpm tokens:build` first runs `tokens:import`, which reads `tokens/figma/spartan-ds.export.json` and overwrites `tokens/source.json`; CSS is then generated. Both `tokens/source.json` and CSS are generated outputs today. Do not edit them by hand, or treat a build as safe for newly authored token values until the import path has been changed.

The first implementation task must establish the reviewed Git authoring source, retain the Figma export as a comparison/migration snapshot, and update generation and drift checks so an older export cannot overwrite code-owned decisions. Preserve the existing values and identities as the migration baseline. Record the source path and commands when that implementation lands; this guideline does not claim the pipeline is already migrated.

The production token contract is v2, while the current custom Figma plugin accepts v1 and rejects cross-collection aliases. Upgrade and verify the importer before using it to apply production token changes. Code development and release can continue with verified generated CSS while that Figma integration remains pending.

For Figma imports, preserve variable identities, aliases, and mode values. Preview before applying. Do not delete variables merely because they are absent from an input file. Test in a disposable Figma file first. A passing build or mocked Plugin API test is not proof of real Figma runtime behavior. Runtime verification and available MCP access gate the relevant Figma writes, not unrelated code work.

## Validation

From the repository root, run `pnpm test`, `pnpm build`, and `pnpm typecheck` as relevant. Any change to a component, its styles, its stories, or the theme or token CSS also needs `pnpm test:e2e` (it builds Storybook and runs the real-browser Playwright suite in `e2e/`) and, from `packages/components`, `pnpm test:stories`. CI runs the e2e suite in the `validate` check, and `pnpm test` alone does not cover it. When behavior changes on purpose, update the e2e assertions in the same commit and say so in the Linear evidence. Keep evidence in the corresponding Linear issue after validation. Linear issue state is not synchronized back to Git.
