import { SpRadioGroup } from './sp-radio-group.js';
import { SpRadioGroupItem } from './sp-radio-group-item.js';
if (!customElements.get('sp-radio-group-item'))
    customElements.define('sp-radio-group-item', SpRadioGroupItem);
if (!customElements.get('sp-radio-group'))
    customElements.define('sp-radio-group', SpRadioGroup);
export { SpRadioGroup, SpRadioGroupItem };
export type { RadioGroupOrientation } from './sp-radio-group.js';
export type { RadioItemAppearance, RadioItemPlacement } from './sp-radio-group-item.js';
