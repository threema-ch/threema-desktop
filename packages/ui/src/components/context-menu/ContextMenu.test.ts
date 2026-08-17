import {assert} from '@threema/ts-utils/meta/assert';
import {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';
import {describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import {createRawTextSnippet} from '../../utils/test/create-raw-text-snippet';
import {createTestLogger} from '../../utils/test/create-test-logger';

import ContextMenuFixture from './ContextMenu.fixture.svelte';
import ContextMenuItem from './ContextMenuItem.svelte';

/**
 * Dispatch a `keydown` event with the given `key` on the menu itself, i.e. without any of its items
 * having focus.
 */
function dispatchKeyDownOnMenu(menu: Element, key: string): void {
    menu.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key}));
}

describe('ContextMenu.svelte', () => {
    it('forwards extra props to the underlying element', async () => {
        // Arrange
        const {getByRole} = render(ContextMenuFixture, {
            'data-testid': 'menu',
            'items': [{label: 'Copy'}],
            'log': createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('menu')).toHaveAttribute('data-testid', 'menu');
    });

    it('renders one menu item per item', async () => {
        // Arrange
        const {getByRole} = render(ContextMenuFixture, {
            items: [{label: 'Copy'}, {label: 'Forward'}],
            log: createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('menuitem', {name: 'Copy'})).toBeInTheDocument();
        expect(getByRole('menuitem').elements()).toHaveLength(2);
    });

    it('marks an item which is a choice as a radio item', async () => {
        // Arrange
        const {getByRole} = render(ContextMenuFixture, {
            items: [
                {checked: true, label: 'Built-in speakers'},
                {checked: false, label: 'Headset'},
            ],
            log: createTestLogger(),
        });

        // Assert
        await expect
            .element(getByRole('menuitemradio', {name: 'Built-in speakers'}))
            .toHaveAttribute('aria-checked', 'true');
        await expect
            .element(getByRole('menuitemradio', {name: 'Headset'}))
            .toHaveAttribute('aria-checked', 'false');
    });

    it('calls the handler of the item which was clicked', async () => {
        // Arrange
        const onclickcopy = vi.fn();
        const onclickforward = vi.fn();
        const {getByRole} = render(ContextMenuFixture, {
            items: [
                {label: 'Copy', onclick: onclickcopy},
                {label: 'Forward', onclick: onclickforward},
            ],
            log: createTestLogger(),
        });

        // Act
        await userEvent.click(getByRole('menuitem', {name: 'Forward'}));

        // Assert
        expect(onclickforward).toHaveBeenCalledOnce();
        expect(onclickcopy).not.toHaveBeenCalled();
    });

    it('does not allow a disabled item to be selected', async () => {
        // Arrange
        const {getByRole} = render(ContextMenuFixture, {
            items: [{disabled: true, label: 'Rename'}],
            log: createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('menuitem', {name: 'Rename'})).toBeDisabled();
    });

    it('reports a rejected handler to the logger of the menu', async () => {
        // Arrange
        const error = new Error('failed');
        const log = createTestLogger();
        const {getByRole} = render(ContextMenuFixture, {
            items: [{label: 'Copy', onclick: async () => await Promise.reject(error)}],
            log,
        });

        // Act
        await userEvent.click(getByRole('menuitem', {name: 'Copy'}));

        // Assert: The rejection is reported instead of being swallowed.
        await vi.waitFor(() => {
            expect(log.error).toHaveBeenCalledWith(expect.any(String), error);
        });
    });

    it('throws if an item is rendered outside of a menu', () => {
        // Act
        function renderItemWithoutMenu(): unknown {
            return render(ContextMenuItem, {children: createRawTextSnippet('Copy')});
        }

        // Assert
        expect(renderItemWithoutMenu).toThrow(
            'A `ContextMenu.Item` must be rendered as a child of a `ContextMenu`',
        );
    });

    it('reserves the leading cell of a choice which is not selected', () => {
        // Arrange: Selecting an item must not widen the leading column and shift every label.
        const {getByRole} = render(ContextMenuFixture, {
            items: [{checked: false, label: 'Headset'}],
            log: createTestLogger(),
        });

        // Assert: The cell takes up the space an icon would, without showing anything.
        const cell = getByRole('menuitemradio', {name: 'Headset'}).element().firstElementChild;
        assert(cell instanceof HTMLElement, 'Expected the item to render a leading cell');
        expect(cell.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(cell.textContent).toBe('');
    });

    describe('async handler', () => {
        it('replaces the check mark of a choice with a spinner while it runs', async () => {
            // Arrange
            const selection = new ResolvablePromise<void>({uncaught: 'discard'});
            const {getByRole} = render(ContextMenuFixture, {
                items: [{checked: true, label: 'Headset', onclick: async () => await selection}],
                log: createTestLogger(),
            });
            const item = getByRole('menuitemradio', {name: 'Headset'});

            // Act
            await userEvent.click(item);

            // Assert: A spinner takes the place of the check mark while the choice is being
            // applied.
            await expect.element(item).toHaveAttribute('aria-busy', 'true');
            expect(item.element().querySelector('svg')).not.toBeNull();
            expect(item.element().textContent).not.toContain('check');

            // Act
            selection.resolve();

            // Assert
            await vi.waitFor(() => {
                expect(item.element().hasAttribute('aria-busy')).toBe(false);
            });
            expect(item.element().textContent).toContain('check');
        });

        // The leading column of a menu is only as wide as its widest icon, so a spinner in an item
        // which has neither an icon nor a check mark would widen it and shift every label.
        it('shows no spinner for an item which occupies no leading cell', async () => {
            // Arrange
            const {getByRole} = render(ContextMenuFixture, {
                items: [
                    {
                        label: 'Copy',
                        onclick: async () =>
                            await new ResolvablePromise<void>({uncaught: 'discard'}),
                    },
                ],
                log: createTestLogger(),
            });
            const item = getByRole('menuitem', {name: 'Copy'});

            // Act
            await userEvent.click(item);

            // Assert: Reported as busy, but nothing is rendered which was not there before.
            await expect.element(item).toHaveAttribute('aria-busy', 'true');
            expect(item.element().querySelector('svg')).toBeNull();
        });

        it('ignores further clicks while it runs', async () => {
            // Arrange
            const pending = new ResolvablePromise<void>({uncaught: 'discard'});
            const onclick = vi.fn(async () => await pending);
            const {getByRole} = render(ContextMenuFixture, {
                items: [{checked: false, label: 'Headset', onclick}],
                log: createTestLogger(),
            });
            const item = getByRole('menuitemradio', {name: 'Headset'});

            // Act
            await userEvent.click(item);
            await userEvent.click(item);

            // Assert
            expect(onclick).toHaveBeenCalledOnce();
        });
    });

    describe('sections', () => {
        it('labels a section by its heading', async () => {
            // Arrange
            const {getByRole} = render(ContextMenuFixture, {
                groups: [{heading: 'Speakers', items: [{label: 'Built-in speakers'}]}],
                log: createTestLogger(),
            });

            // Assert
            await expect.element(getByRole('group', {name: 'Speakers'})).toBeInTheDocument();
        });

        it('does not label a section without a heading', async () => {
            // Arrange
            const {getByRole} = render(ContextMenuFixture, {
                groups: [{items: [{label: 'Delete'}]}],
                log: createTestLogger(),
            });

            // Assert
            await expect.element(getByRole('group')).not.toHaveAttribute('aria-labelledby');
        });

        it('renders the items of a section as items of the menu', async () => {
            // Arrange
            const {getByRole} = render(ContextMenuFixture, {
                groups: [
                    {heading: 'Speakers', items: [{label: 'Built-in speakers'}]},
                    {heading: 'Microphone', items: [{label: 'Built-in microphone'}]},
                ],
                items: [{label: 'Copy'}],
                log: createTestLogger(),
            });

            // Assert
            await expect.element(getByRole('menuitem', {name: 'Copy'})).toBeInTheDocument();
            expect(getByRole('menuitem').elements()).toHaveLength(3);
        });
    });

    describe('keyboard navigation', () => {
        /**
         * Returns the tab index of every item which can be focused, in the order the items appear
         * in. Note: The tab index of a disabled item is irrelevant, because it cannot be focused
         * either way.
         */
        function getTabIndices(items: readonly (HTMLElement | SVGElement)[]): readonly number[] {
            return items
                .filter((item) => !(item instanceof HTMLButtonElement && item.disabled))
                .map((item) => item.tabIndex);
        }

        /**
         * Render a menu of three items, of which the second one is disabled.
         */
        function renderMenu(): {
            readonly items: () => readonly (HTMLElement | SVGElement)[];
            readonly menu: () => Element;
        } {
            const {getByRole} = render(ContextMenuFixture, {
                items: [{label: 'First'}, {disabled: true, label: 'Disabled'}, {label: 'Third'}],
                log: createTestLogger(),
            });

            return {
                items: () => getByRole('menuitem').elements(),
                menu: () => getByRole('menu').element(),
            };
        }

        it('makes a single item the tab stop of the menu', async () => {
            // Arrange
            const {items, menu} = renderMenu();
            await expect.element(page.getByRole('menu')).toBeInTheDocument();

            // Assert: The first item can be tabbed to, and the third one is only reachable with the
            // arrow keys. The menu itself is not a tab stop either.
            expect(getTabIndices(items())).toEqual([0, -1]);
            expect(menu()).not.toHaveAttribute('tabindex');
        });

        it('moves the tab stop to the item which has focus', async () => {
            // Arrange
            const {items} = renderMenu();
            await expect.element(page.getByRole('menu')).toBeInTheDocument();

            // Act
            page.getByRole('menuitem', {name: 'Third'}).element().focus();

            // Assert
            await vi.waitFor(() => {
                expect(getTabIndices(items())).toEqual([-1, 0]);
            });
        });

        it('moves the tab stop back to the first item if the items change', async () => {
            // Arrange
            const {getByRole, rerender} = render(ContextMenuFixture, {
                items: [{label: 'First'}, {label: 'Second'}],
                log: createTestLogger(),
            });
            await expect.element(getByRole('menu')).toBeInTheDocument();
            getByRole('menuitem', {name: 'Second'}).element().focus();

            // Act: Replace the item which holds the tab stop.
            await rerender({items: [{label: 'First'}, {label: 'Third'}]});

            // Assert
            await vi.waitFor(() => {
                expect(getTabIndices(getByRole('menuitem').elements())).toEqual([0, -1]);
            });
        });

        it('moves focus to the next and previous item, skipping disabled ones', async () => {
            // Arrange
            renderMenu();
            page.getByRole('menuitem', {name: 'First'}).element().focus();

            // Act
            await userEvent.keyboard('{ArrowDown}');

            // Assert: The disabled item was skipped.
            await expect.element(page.getByRole('menuitem', {name: 'Third'})).toHaveFocus();

            // Act
            await userEvent.keyboard('{ArrowUp}');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'First'})).toHaveFocus();
        });

        it('wraps around at both ends', async () => {
            // Arrange
            renderMenu();
            page.getByRole('menuitem', {name: 'First'}).element().focus();

            // Act
            await userEvent.keyboard('{ArrowUp}');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'Third'})).toHaveFocus();

            // Act
            await userEvent.keyboard('{ArrowDown}');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'First'})).toHaveFocus();
        });

        it('moves focus to the first and the last item', async () => {
            // Arrange
            renderMenu();
            page.getByRole('menuitem', {name: 'First'}).element().focus();

            // Act
            await userEvent.keyboard('{End}');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'Third'})).toHaveFocus();

            // Act
            await userEvent.keyboard('{Home}');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'First'})).toHaveFocus();
        });

        it('enters the menu from either end if none of its items has focus', async () => {
            // Arrange
            const {menu} = renderMenu();

            // Act
            dispatchKeyDownOnMenu(menu(), 'ArrowDown');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'First'})).toHaveFocus();

            // Act
            page.getByRole('menuitem', {name: 'First'}).element().blur();
            dispatchKeyDownOnMenu(menu(), 'ArrowUp');

            // Assert
            await expect.element(page.getByRole('menuitem', {name: 'Third'})).toHaveFocus();
        });

        it('calls the keydown handler of the consumer', () => {
            // Arrange
            const onkeydown = vi.fn();
            const {getByRole} = render(ContextMenuFixture, {
                items: [{label: 'Copy'}],
                log: createTestLogger(),
                onkeydown,
            });

            // Act: A key which does not navigate the menu.
            dispatchKeyDownOnMenu(getByRole('menu').element(), 'Escape');

            // Assert
            expect(onkeydown).toHaveBeenCalledOnce();
        });
    });
});
