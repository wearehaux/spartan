import { css, unsafeCSS } from 'lit';
const check = unsafeCSS(`url("${new URL('./assets/check.svg', import.meta.url).href}")`);
const chevron = unsafeCSS(`url("${new URL('./assets/chevron-right.svg', import.meta.url).href}")`);
export const itemStyles = css `
 :host{display:flex;align-items:center;box-sizing:border-box;gap:var(--sp-dropdown-menu-item-gap);min-block-size:var(--sp-dropdown-menu-item-min-height);padding:var(--sp-dropdown-menu-item-padding-y) var(--sp-dropdown-menu-item-padding-x);border-radius:var(--sp-dropdown-menu-item-radius);font:inherit;color:var(--sp-color-foreground-default);cursor:default;outline:none}
 :host([hidden]){display:none}.copy{flex:1;min-inline-size:0;overflow-wrap:anywhere}.description{display:block;color:var(--sp-color-foreground-muted);font-size:var(--sp-font-size-body-small)}.icon{display:none;flex:none}.icon.has-content{display:flex}
 ::slotted([slot=start]),.mark,.arrow{inline-size:var(--sp-dropdown-menu-icon-size);block-size:var(--sp-dropdown-menu-icon-size);flex:none}.mark,.arrow{display:block;background:currentColor;mask-size:contain;mask-position:center;mask-repeat:no-repeat}.mark{mask-image:${check};visibility:hidden}.mark[data-checked]{visibility:visible}.mark[data-mixed]{visibility:visible;mask-image:none;block-size:var(--sp-dropdown-menu-border-width)}.arrow{mask-image:${chevron}}:host(:dir(rtl)) .arrow{transform:scaleX(-1)}
 :host([data-checked]){color:var(--sp-color-system-text)}:host([variant=destructive]){color:var(--sp-color-danger-text)}
 :host(:focus),:host([data-active]){background:var(--sp-dropdown-menu-item-active-background);color:var(--sp-dropdown-menu-item-active-foreground);outline:var(--sp-dropdown-menu-border-width) solid var(--sp-selection-focus-color);outline-offset:calc(-1 * var(--sp-dropdown-menu-border-width))}
 :host(:focus) .description,:host([data-active]) .description{color:inherit}
 :host([variant=destructive]:focus),:host([variant=destructive][data-active]){background:var(--sp-color-danger-subtle-hover);color:var(--sp-color-danger-text);outline-color:var(--sp-selection-focus-color)}
 :host([disabled]),:host([data-disabled]){color:var(--sp-color-foreground-disabled)}:host([disabled]) .description,:host([data-disabled]) .description{color:inherit}
 ::slotted([slot=shortcut]){color:inherit;font-size:var(--sp-font-size-body-small);white-space:nowrap}
 @media(forced-colors:active){:host{color:CanvasText}:host(:focus),:host([data-active]),:host([variant=destructive]:focus),:host([variant=destructive][data-active]){forced-color-adjust:none;background:Highlight;color:HighlightText;outline-color:Highlight}:host([disabled]),:host([data-disabled]){color:GrayText}.mark,.arrow{forced-color-adjust:none;background:currentColor}}
`;
export const contentStyles = css `
 :host{display:none;position:fixed;inset:auto;margin:0;box-sizing:border-box;inline-size:var(--sp-dropdown-menu-width-small);max-inline-size:calc(100vw - var(--sp-dropdown-menu-popup-gap)*2);max-block-size:min(var(--sp-dropdown-menu-viewport-max-height),var(--_available,100vh));overflow:auto;overscroll-behavior:contain;scroll-behavior:auto;padding:var(--sp-dropdown-menu-popup-padding);border:var(--sp-dropdown-menu-border-width) solid var(--sp-surface-border);border-radius:var(--sp-menu-radius);background:var(--sp-surface-background);color:var(--sp-color-foreground-default);box-shadow:0 var(--sp-surface-shadow-offset-y) var(--sp-surface-shadow-blur) var(--sp-surface-shadow);font-family:var(--sp-font-family-body),sans-serif;font-size:var(--sp-dropdown-menu-font-size);line-height:var(--sp-dropdown-menu-line-height);outline:none}
 :host(:popover-open){display:block}:host([size=base]){inline-size:var(--sp-dropdown-menu-width-base)}:host([size=large]){inline-size:var(--sp-dropdown-menu-width-large)}
 .section{padding:var(--sp-dropdown-menu-section-padding);overflow-wrap:anywhere}.section[hidden]{display:none}.section[part=header]{font-weight:var(--sp-font-weight-emphasis)}.section[part=footer]{color:var(--sp-color-foreground-muted);font-size:var(--sp-font-size-body-small)}
 @media(forced-colors:active){:host{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}}
`;
