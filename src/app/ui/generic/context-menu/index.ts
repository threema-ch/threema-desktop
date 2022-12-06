import {type SvelteAction} from '#3sc/types';
import {WritableStore} from '~/common/utils/store';

/**
 * A function which will close the currently opened context menu.
 */
type MenuCloseFunction = (event?: MouseEvent) => void;

/**
 * A store that stores a {@link MenuCloseFunction}.
 *
 * If the store contains `undefined`, then no menu is currently visible.
 */
export const contextMenuStore = new WritableStore<MenuCloseFunction | undefined>(undefined);

export type ContextMenuDirectionX = 'auto' | 'left';

export function contextMenuAction(
    node: HTMLElement,
    action: (event: MouseEvent, ...args: unknown[]) => void,
): SvelteAction {
    node.addEventListener('contextmenu', action);

    return {
        destroy(): void {
            node.removeEventListener('contextmenu', action);
        },
    };
}
