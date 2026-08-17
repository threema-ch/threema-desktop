/**
 * Selector which matches the items of a menu that can receive focus, i.e. excluding the disabled
 * ones. Note: It covers `menuitem`, `menuitemcheckbox` and `menuitemradio` alike.
 */
const FOCUSABLE_ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';

/**
 * Returns the focusable items of the given `menu`, in the order they appear in.
 *
 * Note: The items are looked up in the DOM instead of being registered by the items themselves,
 * because keyboard navigation has to follow the order the items are rendered in, which is only
 * authoritative in the DOM.
 */
export function getFocusableItems(menu: HTMLElement): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE_ITEM_SELECTOR));
}

/**
 * Returns the item to move focus to when the given `key` is pressed while `current` has focus, or
 * `undefined` if the key does not navigate the menu.
 *
 * Note: Navigation wraps around at both ends, and starts at the respective end of the menu if none
 * of the `items` currently has focus.
 */
export function getItemToFocus(
    items: readonly HTMLElement[],
    current: Element | undefined,
    key: string,
): HTMLElement | undefined {
    const currentIndex = items.findIndex((item) => item === current);

    switch (key) {
        case 'ArrowDown':
            return items[currentIndex < 0 ? 0 : (currentIndex + 1) % items.length];

        case 'ArrowUp':
            return items[
                currentIndex < 0
                    ? items.length - 1
                    : (currentIndex - 1 + items.length) % items.length
            ];

        case 'Home':
            return items[0];

        case 'End':
            return items[items.length - 1];

        default:
            return undefined;
    }
}
