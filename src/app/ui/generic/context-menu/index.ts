import {type ActionReturn} from 'svelte/action';

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

/**
 * The data that is sent as the `detail` of the `CustomEvent`.
 */
interface ClickOutsideEventDetail {
    readonly event: MouseEvent;
}

/**
 * Additional properties that will be accepted on the `use:clickOutside` action.
 */
interface ClickOutsideActionProperties {
    readonly enabled: boolean;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:clickOutside`
 * action.
 */
interface ClickOutsideActionAttributes {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'on:clickoutside': (event: CustomEvent<ClickOutsideEventDetail>) => void;
}

export function clickOutside(
    node: HTMLElement,
    {enabled: initialEnabled}: ClickOutsideActionProperties,
): ActionReturn<ClickOutsideActionProperties, ClickOutsideActionAttributes> {
    function handleOutsideClick(event: MouseEvent): void {
        if (!node.contains(event.target as Node)) {
            node.dispatchEvent(
                new CustomEvent<ClickOutsideEventDetail>('clickoutside', {detail: {event}}),
            );
        }
    }

    function update({enabled}: ClickOutsideActionProperties): void {
        if (enabled) {
            window.addEventListener('click', handleOutsideClick);
        } else {
            window.removeEventListener('click', handleOutsideClick);
        }
    }

    update({enabled: initialEnabled});

    return {
        update,
        destroy(): void {
            window.removeEventListener('click', handleOutsideClick);
        },
    };
}
