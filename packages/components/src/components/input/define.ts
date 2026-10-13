import { SpInput } from './sp-input.js';
if (!customElements.get('sp-input')) customElements.define('sp-input', SpInput);
export { SpInput };
export type { InputType, InputSize, InputAppearance } from './sp-input.js';
