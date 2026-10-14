import { SpDropdownMenu, SpDropdownMenuTrigger, SpDropdownMenuSub } from './sp-dropdown-menu.js';
import { SpDropdownMenuItem, SpDropdownMenuCheckboxItem, SpDropdownMenuRadioItem, SpDropdownMenuSubTrigger } from './sp-dropdown-menu-item.js';
import { SpDropdownMenuContent, SpDropdownMenuSubContent, SpDropdownMenuGroup, SpDropdownMenuRadioGroup, SpDropdownMenuLabel, SpDropdownMenuSeparator, SpDropdownMenuShortcut } from './sp-dropdown-menu-content.js';
export * from './sp-dropdown-menu.js';
export * from './sp-dropdown-menu-item.js';
export * from './sp-dropdown-menu-content.js';
for (const [name, type] of [['sp-dropdown-menu', SpDropdownMenu], ['sp-dropdown-menu-trigger', SpDropdownMenuTrigger], ['sp-dropdown-menu-content', SpDropdownMenuContent], ['sp-dropdown-menu-item', SpDropdownMenuItem], ['sp-dropdown-menu-checkbox-item', SpDropdownMenuCheckboxItem], ['sp-dropdown-menu-radio-item', SpDropdownMenuRadioItem], ['sp-dropdown-menu-group', SpDropdownMenuGroup], ['sp-dropdown-menu-radio-group', SpDropdownMenuRadioGroup], ['sp-dropdown-menu-label', SpDropdownMenuLabel], ['sp-dropdown-menu-separator', SpDropdownMenuSeparator], ['sp-dropdown-menu-shortcut', SpDropdownMenuShortcut], ['sp-dropdown-menu-sub', SpDropdownMenuSub], ['sp-dropdown-menu-sub-trigger', SpDropdownMenuSubTrigger], ['sp-dropdown-menu-sub-content', SpDropdownMenuSubContent]] as const)
    if (!customElements.get(name))
        customElements.define(name, type);
declare global {
    interface HTMLElementTagNameMap {
        'sp-dropdown-menu': SpDropdownMenu;
        'sp-dropdown-menu-trigger': SpDropdownMenuTrigger;
        'sp-dropdown-menu-content': SpDropdownMenuContent;
        'sp-dropdown-menu-item': SpDropdownMenuItem;
        'sp-dropdown-menu-checkbox-item': SpDropdownMenuCheckboxItem;
        'sp-dropdown-menu-radio-item': SpDropdownMenuRadioItem;
        'sp-dropdown-menu-group': SpDropdownMenuGroup;
        'sp-dropdown-menu-radio-group': SpDropdownMenuRadioGroup;
        'sp-dropdown-menu-label': SpDropdownMenuLabel;
        'sp-dropdown-menu-separator': SpDropdownMenuSeparator;
        'sp-dropdown-menu-shortcut': SpDropdownMenuShortcut;
        'sp-dropdown-menu-sub': SpDropdownMenuSub;
        'sp-dropdown-menu-sub-trigger': SpDropdownMenuSubTrigger;
        'sp-dropdown-menu-sub-content': SpDropdownMenuSubContent;
    }
}
