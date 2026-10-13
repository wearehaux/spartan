import { SpTextarea } from './sp-textarea.js';
if (!customElements.get('sp-textarea')) customElements.define('sp-textarea', SpTextarea);
export { SpTextarea };
export type { TextareaSize, TextareaAppearance, TextareaResize, TextareaWrap } from './sp-textarea.js';
