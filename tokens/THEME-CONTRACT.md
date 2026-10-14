# Spartan theme and component contract

Implemented in HAUX-152, after the Git ownership migration in HAUX-151. The authored
contract is `tokens/source.json`; the public stylesheet is generated from it. The
interactive review is **Foundations / Theme contract** in Storybook. Its native fields,
selection control, menu and table are infrastructure fixtures. Production Input,
Checkbox, Table and other component delivery stays on their existing issues.

## Decisions and ownership

| Concern | Decision | Code API and Figma mapping |
| --- | --- | --- |
| Brand | Retain the four Primary hue modes and their identities. Primary aliases dedicated `color/brand/<hue>/<step>` primitives, seeded with the existing palette values. | `hue` / `data-sp-mode-primary`; Figma 02 Primary stays Blue, Purple, Orange, Sky. Products can hide the picker. A single-product ramp is not adopted. |
| System | Focus and selected controls use the shared blue/neutral palette, independent of Brand. System is a semantic role group, not a sixth selector. | `color/system/focus`, `text`, `control/default`, `hover`, `active`, `foreground`, `track` in 03 Semantic Color. |
| Semantic scheme and contrast | Preserve two independent code settings and four combined Figma modes. Status colors keep their meaning in every Style. | `colorScheme`, `highContrast`; Light, Dark, Light High Contrast, Dark High Contrast in Figma. |
| Density | Keep existing control size tiers, typography, icons and approved Card padding. Add named roles for repeated content; never scale the primitive spacing ramp. | `density` / `data-sp-mode-density`; Relaxed and Compact in 06 Density. |
| Style | Own family geometry, neutral surface treatment, borders and elevation. Preserve Button's solid semantic fills and zero shadows. | `style` / `data-sp-mode-style`; Atlas, Selene, Helios, Ares in 07 Style. |
| Component anatomy | Value-mode aliases select the family role and size. Flexible content grows instead of being clipped to a nominal minimum height. | 05 Component stays Value. New tokens omit Figma bindings until verified creation. |

Primitive Brand ramps are separate from shared blue. Edit a complete dedicated ramp
and its foreground pairs through reviewed source changes, then rebuild. Editing a
shared blue primitive changes System consumers. Arbitrary CSS overrides of a primitive
on a nested element are not a supported rebranding API: inherited aliases may already
be resolved on an ancestor. Existing nested hue, scheme, contrast, density and style
attributes remain supported by the generator.

Compatibility `--sp-color-primary-*` roles now alias `--sp-color-brand-*`. Existing
`--sp-color-control-*` roles alias `--sp-color-system-control-*`. Existing keys,
variable IDs, collection IDs, mode IDs and the `applyTheme`/`readTheme` API remain.

## Alias direction

Build and check enforce these direct dependencies, in addition to the v2 type/unit,
complete-mode and cycle checks:

| Source | Permitted targets |
| --- | --- |
| Primitives | Primitives |
| Primary | Primitives, Primary |
| Semantic Color | Primitives, Primary, Semantic Color |
| Semantic Foundation | Primitives, Semantic Color, Semantic Foundation |
| Density | Primitives, Semantic Foundation, Density |
| Style | Primitives, Semantic Color, Semantic Foundation, Style |
| Component | Any valid collection; same-layer reuse remains cycle-checked |

Style cannot reach back into Component. For example, create `field/radius ->
style/field/radius`; do not point `radius/control` back into Style. Custom collections
retain the general v2 graph rules and need an explicit ownership decision before
becoming another canonical layer.

Existing Semantic Color alpha mixes may reference Semantic Foundation's percent
opacity roles. This explicit numeric-role exception preserves their bindings;
it does not permit a second Foundation color palette.
Existing Foundation `space/*` compatibility aliases may also reference Density's
length roles. New component anatomy uses named Component -> Density paths directly.

## System tone recipes

| Role | Light | Dark | Light high contrast | Dark high contrast |
| --- | --- | --- | --- | --- |
| Focus | Blue 600 | Blue 400 | Blue 700 | Blue 300 |
| Selected default | Blue 500 | Blue 500 | Blue 700 | Blue 300 |
| Selected hover | Blue 600 | Blue 600 | Blue 800 | Blue 200 |
| Selected active | Blue 700 | Blue 700 | Blue 900 | Blue 100 |
| System text / field hover in Helios and Ares | Blue 700 | Blue 300 | Blue 800 | Blue 200 |
| Selected foreground | Neutral 0 | Neutral 0 | Neutral 0 | Neutral 1000 |
| Unselected track | Neutral 100 | Neutral 800 | Neutral 300 | Neutral 700 |

Focus and selected colors can share a palette without sharing a tone. Danger borders
remain Danger while a separate System focus ring stays visible. Disabled takes
precedence over the invalid border; the validation message can remain present.
Readonly is focusable and suppresses hover treatment. Checked and disabled retain
the checked indicator with disabled colors. Forced-colors and production component
accessibility still need their component-level verification.

## Family recipes

| Family | Style response | Density response | Local override / stable parts |
| --- | --- | --- | --- |
| Button, Icon Button, Close | Existing Button recipe: radius 8 / 12 / pill / 0; semantic solid Primary/Danger/Warning; Secondary treatment and borders; no shadow. | Existing size aliases, optical padding, type and icon metrics. | State colors are semantic. Circle/icon artwork and behavior are separate from global Style. |
| Input, Select trigger, OTP and Input Group controls | Existing single-line Field recipe and focus geometry. | Field small 32/28, base 40/32, family padding, type and icons. | Default inherits Style. Outlined/Filled use the treatment rules below. |
| Textarea | Field treatment with radius 8 / 12 / 16 / 0, avoiding a pill around multiline content. | Field spacing; existing 72px minimum can grow and resize. | Appearance changes treatment, not multiline shape. |
| Checkbox and selection indicators | Indicator radius 4 / 8 / 12 / 0. System selection and focus colors. | Preserve existing 20px indicator; use control/row metrics for the surrounding hit area. | Radio and intentional circles stay circular. Switch's approved size anatomy remains unchanged. |
| Card and Surface | Shared surface radius 12 / 12 / 16 / 0; default / muted / elevated / default surfaces; stronger Ares boundary; Helios layer shadow. | Generic surface content 24/16. Card keeps 16px horizontal and 20px vertical padding in both densities. | Card anatomy is not replaced by generic surface padding. |
| Dialog, Drawer, Popover and Tooltip | Consume surface family roles where applicable; retain layer-specific anatomy and meaningful elevation. | Existing sizes and widths remain; section/content spacing is explicit. | Positioning, portal theme scope, close controls and clipping remain component responsibilities. |
| Menu and Listbox | Surface shell and semantic item states; shared menu radius. | Item minimum 32/28, vertical padding 6/4, gap 8/6. | Item state belongs to the item. Selection uses System. |
| Table | Surface shell radius; neutral/status/selection semantics remain. | New one-line row minimum 40/32, cell vertical padding 8/4 and horizontal padding 16/12. | Existing generic 64/56 rows are not changed; multiline rows grow. |
| Field and form layout | Child components own their recipes. | Form group gap 16/12; field aliases select size metrics. | Labels, assistance and semantic meaning remain readable. |
| Chart | Surrounding surface and tooltip can consume the surface family. Plot/series styling is intentionally independent of global Style. | Legend gap 12/8, tooltip padding 12/10. | Series colors, data, scales, labels and responsive tick/legend layout remain separate. |
| Badge, Chips, Tabs, Accordion, navigation and feedback | Use the applicable control, item or surface family; status/meaning remains semantic. Existing unsupported treatments are not inferred from a global radius. | Preserve existing named metrics until component adoption. | Each component issue records actual bindings and any intentionally unchanged properties. |

### Field appearance and precedence

| Property | Default | Outlined | Filled |
| --- | --- | --- | --- |
| Background | Style Field background | Semantic default surface | Semantic muted surface |
| Default boundary | Style side/bottom recipe | Full outline, 1px normal / 2px high contrast | 0px normal / 2px high contrast |
| Radius and focus geometry | Style Field roles | Same | Same |
| Elevation | Helios Field shadow, zero in other styles | Same | Same |
| Invalid | Danger border; Style error geometry (Ares underline) | Full emphasized Danger boundary | Full emphasized Danger boundary |
| Focus | Independent System ring; System focus border unless invalid | Same | Same |
| Disabled + invalid | Disabled surface/text/border wins; error message can remain | Same | Same |

This is property ownership, not one universal cascade order. The fixture adjusts
vertical padding within the chosen size budget so a thicker Style/high-contrast
border does not enlarge the single-line field. Multiline content can grow.

## Public token paths

```text
Primary hue palette -> primitive color/brand/<hue>/<step>
color/brand/default -> Primary / color/primary/600
color/focus-ring/default -> color/system/focus -> primitive blue tone
field/height/base -> density/control/height/base -> 40 or 32
field/radius -> style/field/radius
field/background/default -> style/field/background/default -> semantic surface
table/row/min-height -> density/table/row/min-height -> control/base height
chart/legend/gap -> density/chart/legend/gap -> primitive space/3 or space/2
```

The exact added keys and CSS names are in [theme-contract-migration.json](theme-contract-migration.json).
They use the existing `--sp-` naming algorithm. Examples: `--sp-color-system-focus`,
`--sp-color-brand-default`, `--sp-field-radius`, `--sp-style-field-filled-side-width`,
`--sp-table-row-min-height` and `--sp-chart-legend-gap`.

## Migration and Figma handoff

HAUX-93 adds 15 unbound Radio Group aliases, bringing the current source to 738.
Circle size 20, target 44 and dot 8 remain fixed in both densities. Labels 15/22 and
14/20, item gap 8/6, group gap 16/12 and boxed padding 12/10 reuse existing roles.
Radio radius remains pill; boxed radius uses bounded multiline Field geometry.
System selection/focus is independent of Brand. Every previous definition/value/ID
and collection/mode is preserved. Figma has 24px controls; code retains the 20px
Selection contract. No library writes; HAUX-93 records the stable handoff.

HAUX-88 adds 12 unbound Component definitions, bringing that revision to 723.
Checkbox size aliases the existing 20px Selection box, mark-size the 16px primitive,
gap/font-size/line-height the Base Density roles, radius the Selection Style role,
and border-width the existing semantic boundary. Focus color uses Selection System,
width/offset reuse Button, and radius reuses Field capped at Selection radius plus
offset. Target-size is 44px in both densities. All original 711 definitions, values,
identities and modes remain unchanged. The Figma box is 24px with a fixed 4px
primitive radius; this code-first difference is recorded on HAUX-88.

HAUX-101 adopts existing Field roles for Textarea with no token additions or changes;
that revision retains 711 definitions. The native control uses the 72px minimum, existing
Density type/padding and bounded multiline radius. Two Base rows can grow to 74px
in Helios High Contrast Relaxed Default to preserve the 3px boundary. Shared Field
CSS and text-entry mechanics also serve Input without changing its public contract.
Textarea's focus geometry caps the existing Field focus radius at multiline radius
plus focus offset. No Figma identities, modes or variable definitions change.


HAUX-91 adds seven unbound Field aliases, bringing that revision to 711.
`field/{font-size,line-height,icon-size,padding-x}/small` reuses existing Small
Density roles. `field/focus-color` references Semantic System focus, while
`field/focus-width` and `field/focus-offset` reuse the existing Button roles.
Input consumes the shared family recipe without changing any existing definition,
resolved value, identity or mode. The typography weight reuses the regular primitive.
The HAUX-152 JSON remains its historical migration snapshot.


HAUX-90 adds ten unbound Icon Button aliases after HAUX-113, bringing the current
total to 704. `icon-button/size/{xs,sm,base}` reuses the existing Button height
aliases. `icon-button/icon-size/{xs,sm,base}` reuses Button's glyph aliases, with
Extra small reusing Small. `icon-button/focus-{color,radius,width,offset}` reuses
the shared Button roles. Icon Button consumes these local aliases through the
shared action recipe, so products can adjust its anatomy without changing Button.
All existing token definitions, values and identities remain unchanged. Style
colors are reused directly; there is no duplicate Icon Button state palette.

HAUX-113 adds nine unbound Component aliases to the merged HAUX-152 contract,
bringing that revision's total to 694. `button/{font-size,line-height,icon-size}/{sm,base}`
aliases the existing Small/Base Density metrics. `button/focus-radius` aliases
Style's field focus radius, `button/focus-width` aliases the 2px thick border
primitive and `button/focus-offset` aliases the 4px space primitive. These additions
do not alter any existing definition, value or identity. The shared action focus
recipe consumes them for Button and Icon Button. The HAUX-152 JSON below remains
the historical migration snapshot; the nine follow-up aliases are recorded here.

The HAUX-152 baseline is dev commit `e769e7d` with 547 tokens. That migration delivered 685 tokens,
adding 138 unbound definitions. No existing key, collection, mode or binding identity
is removed or renamed. Twenty-six existing definitions change their alias structure.
Across all 128 setting combinations, only three existing tokens change resolved
values: `color/focus-ring/default`, `style/field/border/focus` and
`style/field/border/hover`. They now use System independently of non-Blue Brand hues.
The Blue baseline and all other existing resolved values are preserved.

The JSON migration record is a review snapshot, not another authoring source or a
mandatory Figma drift gate. `pnpm tokens:drift` intentionally reports accepted
differences against the old Figma export. Do not erase them with an older import.

Figma keeps all seven existing collections and modes. New definitions belong to
their indicated collection; aliases remain typed and cross-collection. Instances
inherit collection modes through Auto. Local Appearance is a component property,
not another Style mode. Text/effect styles require property recipes in addition to
variable bindings. The v2 importer must preview these changes, retain existing IDs,
create identities only for new definitions, preserve aliases and rerun without
duplicates. That real-runtime gate remains HAUX-85. Protected green pages require
scope/consumer checks before shared-token application; there are no library writes
in this implementation.


## Switch adoption (HAUX-100)

Fourteen additive aliases bring 738 to 752 definitions without changing any previous definition, resolved value, identity or mode. Switch reuses approved switch/control/* dimensions (32×16, 40×20, 48×24); the older infrastructure Selection 40×24 fixture is unchanged. Target is at least 44×44, with Large 48×44. Density owns surrounding Base type, gaps and boxed padding. Default corners use Style Selection radii capped by visual height, while local Rounded/Square choices retain approved anatomy; bounded Field radii own boxed corners. System owns checked and focus roles, neutral track and semantic thumb retain contrast. Invalid boundaries and disabled states retain semantic precedence; forced colors retain platform contrast. No motion or invented shadow alias.

Native binary sp-switch and sp-checkbox share form/label/default-current mechanics. Switch has no mixed-state API: APG defines binary switch semantics; Checkbox owns mixed selection. Label/description/error/icon slots and Plain/Boxed, Start/End treatments provide upstream anatomy without React/Base UI dependencies. Optional reference icons remain dynamic slot content. No Figma writes; master 370:54/page 12:35 remains a later reconciliation checkpoint for Style/System/states/labels/targets, binary Value and legacy shadow differences.


## Select adoption (HAUX-95)

Fourteen additive Component definitions bring 752 to 766: thirteen aliases reuse Field Small typography/icons, Menu item size/padding/gap, Selection System fill/foreground and corners, Surface border width and Density popup spacing; viewport-max-height is a new 288px component geometry value. All previous definitions, values and identities remain unchanged. The trigger reuses the complete shared Field recipe, sizes and appearances. Popup and items use Surface/Menu anatomy and grow with content; System owns active/selected/focus independently of Brand. Default follows Style, invalid remains Danger with independent System ring, disabled wins and forced colors retain platform contrast.

Native top-layer content preserves theme inheritance while escaping clipping, flips/clamps to the visual viewport, and remeasures on content/viewport changes. Stable Lit group/item/label/separator components and slots support listbox anatomy. Form state is single-selection; Native Select and editable Combobox are separate families. The older Figma Multi/tag anatomy is an explicit future alignment gap. No Figma writes, invented IDs or historical migration JSON changes. Field master 32:159 and composition 749:813 on page 12:33 are the resume checkpoints.

## Dropdown Menu adoption (HAUX-89)

Eighteen additive Component definitions bring 766 to 784. Thirteen aliases reuse Menu rows, Density spacing, Small Field type/icons, Selection corners/System states and Surface border widths; width tiers 240/280/320 and viewport maximum 288 are explicit anatomy, and section padding aliases Density space/3. All previous definitions, values and identities remain unchanged. Button owns the native trigger; Surface owns popup Style elevation/boundary/corners; System owns active/checked/focus independently of Brand. Destructive and disabled remain semantic. Content grows and scrolls, with no motion.

Owned Root/Trigger/Content/Item/Group/Label/Separator/Shortcut and checkbox/radio/Sub parts share menu navigation and collision behavior. Popover manual top-layer content preserves DOM theme scope. Roving focus includes disabled items for discovery, while activation is suppressed. Figma master 34:54, Item 545:118 and Sub Trigger 918:1288 remain handoff checkpoints. Current code follows the adopted Style/Density/System recipe rather than older fixed shadows/type. No Figma writes, identity invention or historical migration JSON changes.
