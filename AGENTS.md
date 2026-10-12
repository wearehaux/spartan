# Project instructions

This repository is the Spartan Design System. Its Lit components, Storybook, token pipeline, and Figma plugin live at the repository root. Do not restore the deleted React workspace. Track current work in the Spartan Linear project; the older React issues are historical.

## Source of truth

- Project documentation: [Spartan project home](https://linear.app/wearehaux/document/spartant-design-system-project-home-5730425b4e0d).
- Work tracking: [Spartan Design System in Linear](https://linear.app/wearehaux/project/spartant-design-system-b4328c010ac8/overview). Use Linear to read and update the current issues. The previous Notion hub is migration history.
- Agent-facing guides: [Figma component guideline](https://linear.app/wearehaux/document/figma-component-guideline-a6670f4b71f3) and [agent workflow](https://linear.app/wearehaux/document/agent-workflow-3b7ab59c7144). Their `.doc/` files remain local entry points.
- When you finish work on a Linear issue, set its status to **Agent Done** and add the evidence to the issue: what changed, the verification run, and the remaining gaps. Do this every time, including when only part of the issue is complete. Agent Done is separate from Done: the issue moves to Done only under the rules below. Keep the issue current as the work moves, not only at the end: when you start, set it In Progress and the Development label; after every commit, push, or pull request, add the PR link to the issue and post a comment (or edit your evidence comment) so it never says work is uncommitted or missing a PR when it is not. Before you reply that the work is finished, check the issue's status, labels, PR link, and latest comment against the repository.
- Keep one issue per component. Update its `Dev: ...` and `Figma: ...` labels separately and mirror them in the issue description. A component is Done only when both tracks are Done. Track documentation, plugin, research, and infrastructure as separate issues.
- Whenever you create a Linear task, update [doc/task-order.html](doc/task-order.html) in the same work session. Add its exact task name, issue ID and direct Linear link, place it after its prerequisites and before dependent tasks, and renumber the rows. Keep this HTML view aligned when dependencies or open-task membership change. Verify the entries against Linear, which remains the source of truth; preserve the existing compact table.

## Code-first delivery

- Follow the agreed sequence: Git token contract, working Lit components finalized in Storybook, then stable component families rebuilt in Figma in batches that fit MCP availability. Use the [implementation plan](doc/code-first-implementation-plan.html) and [theme architecture report](doc/theme-system-report.html). The workflow is agreed; unresolved token choices in the report are proposals, not authorization to remove Primary modes or change existing token contracts.
- First make token authoring ownership safe. Currently `pnpm tokens:build` runs `tokens:import` from the saved Figma export and regenerates `tokens/source.json` and CSS. Do not hand-edit those generated files or let an older Figma export overwrite new code-owned decisions. Establish the reviewed Git authoring source and update generation/drift checks before restructuring token values or aliases.
- Use shadcn names, anatomy, states, and APIs as references, then adapt their behavior to Lit. Finalize visuals, density, styles, component composition, and applicable interactions in actual components and Storybook using Spartan tokens.
- Figma access limits and importer runtime verification gate Figma writes only. They do not block code progress or a verified code release. Apply Development prerequisites to dependent code work; an unfinished Figma track alone is not a code dependency. Keep overall component Done gated on both tracks.
- Before deferring Figma, record a stable handoff in the component issue: code revision, token diff, properties, states, slots, Storybook captures, remaining gaps, and a resume checkpoint. Keep `Dev:` and `Figma:` labels accurate and use Agent Done as specified above.
- Preserve Figma pages marked 🟢. Mark updated pages 🟣 only after structural and visual verification. Resume from checkpoints and recheck the target nodes rather than restarting a whole-library audit.

## Branches and releases

- `main` only receives releases. Open every feature pull request against `dev`, the default branch; `validate` rejects pull requests into `main` that do not come from `dev`.
- Feature work: branch from `dev`, open a pull request into `dev`, and squash merge after the required checks pass. The current `validate` workflow runs on pull requests and pushes to both `dev` and `main`; run the applicable checks locally as well.
- Release: open a pull request from `dev` into `main` and merge it with **rebase** so `main` keeps linear history without squashing a release into one commit.
- Vercel project settings select `main` for Production and `dev` for Preview, skipping feature and pull request branches. `vercel.json` sets the install command; see `README.md` for deployment settings and commands.

## Components

- In Figma, inspect the existing component and variables first. Reuse library components and token bindings. Preserve instance links, properties, slots, and relevant variants. Create only the component work requested. Follow [the Figma guide](.doc/figma.md).
- In code, build reusable Lit Web Components with TypeScript. Use Lit `static styles` for component CSS and consume generated `--sp-*` tokens. Keep Storybook as the interactive playground. Verify behavior, keyboard access, and applicable states before marking Development Done. Run `pnpm test`, `pnpm typecheck`, `pnpm test:e2e`, and `pnpm test:stories` before opening a pull request; the current `validate` workflow includes the e2e suite.
- The target pipeline has code-owned tokens feeding CSS and the custom Figma plugin; the current importer still requires the ownership transition above. Preview imports, preserve variable IDs and aliases, and verify changes in a disposable Figma file before applying them to the library. This Figma gate does not block code validation. Follow [the project guide](.doc/project.md).

## Detailed guidance

Use the relevant installed skill when a task needs more detail: `figma:figma-use` for Figma editing, `design:design-system` for system audits or documentation, and `better-accessibility` for component behavior. Adapt framework-specific examples to Lit. The linked project guides contain the local conventions.

Do not use em dashes. If asked for `design.html`, make a browser-viewable design guideline with real swatches and component samples, not a Markdown file or website mockup.
