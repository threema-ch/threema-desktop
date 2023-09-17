import type {ActionReturn} from 'svelte/action';

/*
 * `clickoutside` Svelte Action
 */

/**
 * The data that is sent as the `detail` of the {@link CustomEvent}.
 */
interface ClickOutsideEventDetail {
    readonly event: MouseEvent;
}

/**
 * Additional properties that will be accepted on the `use:clickoutside` action.
 */
interface ClickOutsideActionProperties {
    readonly enabled: boolean;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:clickoutside`
 * action.
 */
interface ClickOutsideActionAttributes {
    readonly 'on:clickoutside': (event: CustomEvent<ClickOutsideEventDetail>) => void;
}

export function clickoutside(
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
