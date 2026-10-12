# Figma guideline

Collaborative copy: [Figma component guideline in Linear](https://linear.app/wearehaux/document/figma-component-guideline-a6670f4b71f3).

This guideline is part of the project instructions in [AGENTS.md](../AGENTS.md). Apply it when creating, editing, or reviewing Figma designs.

## Current stage: components only

During this stage, deliver only the requested components and their necessary variants, properties, slots, and token bindings.

- Do not create or expand component documentation pages, reference or showcase frames, usage sheets, specimen boards, or explanatory canvas annotations unless the user explicitly requests them.
- Keep the main components and component sets organized and usable directly. A component request does not imply a documentation deliverable.
- Create the applicable interaction states as real reusable variants, including default, hover, pressed, focus and disabled for interactive controls, plus selected, checked, expanded, loading, error, success or readonly where relevant. Keep item states on nested item components. Do not omit required states merely to reduce variant count; avoid meaningless states on noninteractive primitives.
- Continue structural and visual verification. Prefer inspecting the components directly; when temporary instances or frames are needed to check themes, resizing, or slot behavior, remove them after verification rather than retaining them as documentation.
- Do not remove existing documentation or user reference material unless the user asks for that cleanup.

## Icons

Use the following icon component variant properties:

| Property | Required value |
| --- | --- |
| Style | `Outlined` |
| Radius | `2` |
| Stroke | `1.5` |

These rules apply to standalone icons and icons nested inside components, including left and right button icons.

- Reuse an existing icon component instance with the required variant combination.
- Set radius and stroke through the icon's variant properties. Wrapper corner radius and button borders do not set the icon's radius or stroke.
- Check all three properties after inserting or swapping an icon. A swap can restore the replacement icon's defaults.
- Keep icons connected to their components.
- If the requested icon does not provide this combination, record it as a component gap. Make any exception explicit instead of silently substituting another variant.

## Grouping and vertical rhythm

Build the layer hierarchy around the relationships between content. Related elements must live together in a meaningful Auto Layout frame, not as unrelated siblings in one flat stack or as manually positioned layers.

- Group a title with its description or helper text. Group that text block with its related icon or preview. Keep actions in a separate region when they need a larger gap from the explanatory content.
- Use nested vertical or horizontal Auto Layout frames to express each relationship. Use descriptive names such as `Upload copy`, `Upload prompt`, and `Upload content`, rather than `Frame 2` or `Group 3`.
- Establish spacing at each level: tight gaps within closely related content, larger gaps between groups, and independent outer padding. Do not apply one uniform gap to every child or use empty spacer layers, blank text, or manual offsets to imitate rhythm.
- Bind gaps and padding to existing tokens. Prefer component-specific tokens when available; otherwise use `density/space/*`. Choose the values from the approved design, rather than imposing the same spacing on every component.
- Use Hug contents height for content groups and Fill container width where text must wrap. Give wrapping text an explicit width with auto height, then let it fill its Auto Layout parent. Use fixed sizes only where intentional, such as icons or previews; a minimum height can preserve a component's size distinction while allowing longer content to grow.
- Apply structural fixes to the main components and all relevant variants. Preserve existing text properties, nested instances, exposed controls, variable bindings, and content slots. Designers must not need to detach a component to correct its grouping or spacing.
- Verify the layer hierarchy as well as the screenshot. Check short and long copy, narrower widths, applicable states, and existing instances for wrapping, clipping, overlap, and consistent group spacing.

### File Upload example

The [user-corrected upload reference](https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=646-7269) defines this hierarchy:

```text
Upload area: outer padding and centered alignment
  Upload content: vertical Auto Layout, 12 px between prompt and action
    Upload prompt: vertical Auto Layout, 4 px between icon and copy
      Connected upload icon
      Upload copy: vertical Auto Layout, 0 px between title and helper text
        Title
        Supported formats
    Connected Browse files button
```

Bind these gaps to `density/space/3`, `density/space/1`, and `density/space/0`, respectively. These are the upload reference values, not universal gaps for every component. Keep the detached reference as evidence and repair the connected upload masters in place.

## Content slots

Use a content slot when a component provides a reusable shell around content that changes by use case. Examples include Card content, Modal or Dialog bodies, Sideover or Drawer bodies, and Dropdown menu content.

- Prefer native Figma slots when supported. Give each slot a meaningful name, such as `Content`, `Body`, or `Menu items`.
- Keep the shell and fixed controls outside the content slot. For Dialog, expose Header, Content, and Footer as separate native slots; keep the close control outside all three slots.
- Allow the slot to contain library component instances and ordinary editable layers. Replace content without detaching the parent component or its nested library instances.
- Use Auto Layout with Fill container width and Hug contents height where appropriate. Each section owns its padding; avoid padding the whole shell when independently replaceable sections need their own spacing. Verify both short and long content, replacement, and resizing.
- Use slots for flexible content composition. Keep fixed controls as components and use instance swap properties for icons.
- For repeatable collections such as Tabs, use a parent shell with a native slot containing instances of a nested item component, such as `Tab Item`. Let designers add, remove, and reorder items without detaching instances or creating variants for item counts. Apply this pattern to other components when their item count or composition varies.
- Keep item states, labels, and icon configuration on the item component. Let the parent own the container layout, background, and padding, using Auto Layout for the slot and its items.
- Add relevant item components as slot preferred values when supported. Keep content flexible unless the use case requires restrictions.
- Restrict navigation slots to their relevant navigation components. A Sidebar navigation slot may contain `Nav Group`, `Nested Nav Group`, and standalone `Nav Item` instances. A labeled Nav Group's `Items` slot may contain `Nav Item` and `Nested Nav Group`; a Nested Nav Group's leaf `Items` slot accepts only `Nav Item`. Use component or component-set keys in `preferredValues` and set `slotSettings.allowPreferredValuesOnly` to `true`. Verify each slot's `limitViolations` is empty, including after insertion and replacement. Keep a separate restricted `Collapsed navigation` slot for an icon-only Sidebar so expanded groups are not forced into its narrow rail.
- Verify different item counts, long labels, reordering, and resizing while preserving parent and nested component links.

These examples guide future component work; they do not indicate that every listed component already has a slot.

## Section padding, floating controls, and unclipped effects

- Put padding on the section that owns the content. For Dialog, the Header, Content, and Footer are separate native slots with their own token-bound padding. The outer shell owns the background, border, radius, shadow, and overall sizing, with zero layout padding and zero inter-section gap. Do not simulate section padding with one padded outer layout.
- Group closely related content, such as a title and description or an icon and its copy, in meaningful nested Auto Layout frames. Give those groups appropriate token-bound spacing and padding where the content requires it.
- In Dialog, keep the close control outside the Header slot as an absolutely positioned child of the shell, anchored to the top right. Use token-bound insets where the API supports them; Figma x/y offsets currently require token-derived numeric values plus right/top constraints, and this exception must be recorded. Reserve sufficient space so long content cannot overlap it, including when Header is hidden. Replacing or hiding Header content must not move or delete the close control.
- The shared Close Button must support a subtle variant with no background fill. Use this variant for Dialog, preserving a visible focus treatment and the required connected icon. Keep the existing filled appearance available as a separate variant.
- Do not enable Clip content on shadow-bearing components or ancestors that must show child shadows, focus rings, or floating controls. If a content region needs scrolling or cropping, put clipping on a dedicated inner viewport while leaving the outer shell and shadow path unclipped.
- Validate section padding, slot replacement, close positioning after resizing, long copy, hidden sections, shadows, and focus rings in applicable themes and style modes.

## Dedicated nested items

- Button Group must contain instances of a dedicated `Button Group Item` component, not instances of the standalone `Button` component.
- The item owns its labels, icon controls, sizes, states, and group-specific edge geometry. The group owns orientation and the native Items slot, so designers can add, remove, and reorder items without detaching.
- Reuse Spartan tokens, text styles, and connected icon components inside the dedicated item. Preserve existing group component IDs and supported property values when migrating.

## Density and free sizes

Use `density/space/*` in `06 Density` for custom layouts, content slots, and dimensions when no component-specific token applies. Keep established component tokens for component anatomy.

- Set each Relaxed and Compact value as an alias to an existing spacing primitive. Both modes start with the same aliases and can be adjusted independently. Preserve aliases instead of copying raw values.
- Follow the existing 4 px unit scale: `1` means 4 px, `0-5` means 2 px, `1-5` means 6 px, and `2-5` means 10 px. These suffixes identify the reference scale; mode values can differ later.
- Keep generic Density spacing tokens public. Use `GAP` and `WIDTH_HEIGHT` scopes for positive values, and `GAP` only for `density/space/0`. Use zero for padding and gaps; use positive tokens for dimensions.
- Keep usable spacing primitives available with targeted scopes. Do not blanket-hide them or use `ALL_SCOPES` to expose unrelated properties.

Adding the generic scale does not migrate existing component tokens or bindings.

## Control sizes and corner radius

Do not create or use a 48 px Large tier for Button, Icon Button, Input, Select, inline upload, or related standard controls. Use Base at 40 px in Relaxed density and 32 px in Compact, or Small at 32 px in Relaxed and 28 px in Compact. Keep Extra small only where the component already supports it.

- Remove Large variants when an equivalent Base variant exists. Migrate their instances first, preserving labels, icons, appearance, state, shape, and component links.
- For a control that only used the old 48 px height, bind it to the Base height. If its size was named Large without a Base equivalent, rename that control variant Base.
- Bind standard control corners to `radius/control`, including controls migrated from the old Large tier. Keep intentionally circular or pill-shaped controls bound to `radius/pill`.
- Do not use deprecated Large control tokens for new work. Compatibility aliases may remain hidden to keep existing bindings valid, but must resolve to the retained Base values.
- This rule concerns standard control sizing. Do not change unrelated 48 px spacing, image or avatar dimensions, or large content areas merely because they share the number or size name. Textarea retains its independent 72 px minimum height.

## Colors and effects

Bind fills, borders, and shadow or effect colors to semantic, theme-aware color variables. Apply this to every color-bearing layer of shared effect styles; do not leave literal light-only colors in them.

- Reuse existing tokens. Add a semantic color role only when there is a real gap, and define its values or aliases in every applicable mode, including Light, Dark, and alternate brand modes where present.
- Preserve effect geometry, including offset, blur, and spread, when correcting color bindings.
- Visually verify the same component in every applicable mode and confirm its variable bindings resolve correctly.
- Do not add canvas annotations unless requested.
