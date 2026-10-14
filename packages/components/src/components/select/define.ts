import { SpSelect } from './sp-select.js';
import { SpSelectItem } from './sp-select-item.js';
import { SpSelectGroup, SpSelectLabel, SpSelectSeparator } from './sp-select-group.js';
for (const [name, element] of [['sp-select', SpSelect], ['sp-select-item', SpSelectItem], ['sp-select-group', SpSelectGroup], ['sp-select-label', SpSelectLabel], ['sp-select-separator', SpSelectSeparator]] as const)
    if (!customElements.get(name))
        customElements.define(name, element);
export { SpSelect, SpSelectItem, SpSelectGroup, SpSelectLabel, SpSelectSeparator };
export type { SelectSize, SelectAppearance } from './sp-select.js';
