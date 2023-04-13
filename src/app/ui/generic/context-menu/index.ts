import {type SvelteAction} from '~/app/types';

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
