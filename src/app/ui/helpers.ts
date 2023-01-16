import {type SvelteAction} from '~/app/types';

/**
 * Return true if the keyboard event was triggered by the enter or space key.
 */
function shouldTriggerAction(event: KeyboardEvent): boolean {
    return event.key === 'Enter' || event.key === ' ';
}

/**
 * Run the {@link action} whenever a click
 */
export function clickOrKeyboadAction(
    node: HTMLElement,
    action: (ev: UIEvent) => void,
): SvelteAction {
    node.addEventListener('click', action);
    node.addEventListener('keydown', (event: KeyboardEvent) => {
        if (shouldTriggerAction(event)) {
            action(event);
        }
    });
    return {
        destroy(): void {
            node.removeEventListener('keydown', action);
            node.removeEventListener('click', action);
        },
    };
}
