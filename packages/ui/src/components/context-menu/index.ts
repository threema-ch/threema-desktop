import ContextMenuRoot from './ContextMenu.svelte';
import Group from './ContextMenuGroup.svelte';
import Item from './ContextMenuItem.svelte';

export type {ContextMenuProps} from './ContextMenu.svelte';
export type {ContextMenuGroupProps} from './ContextMenuGroup.svelte';
export type {ContextMenuItemProps} from './ContextMenuItem.svelte';

/**
 * A context menu, with `ContextMenu.Group` as its sections and `ContextMenu.Item` as its items (see
 * `ContextMenu.svelte`).
 */
// Components are named in `PascalCase`, unlike other variables and properties.
//
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ContextMenu = Object.assign(ContextMenuRoot, {Group, Item});
