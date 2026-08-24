import {assert} from '@threema/ts-utils/meta/assert';
import {describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import {createTestLogger} from '../../utils/test/create-test-logger';

import ControlFixture from './Control.fixture.svelte';

/**
 * Returns the popover element which holds the menu.
 */
function getMenuPopover(container: HTMLElement): HTMLElement {
    const element = container.querySelector('[popover]');
    assert(element instanceof HTMLElement, 'Expected the control to render a popover');

    return element;
}

function getToggle(): ReturnType<typeof page.getByRole> {
    // Exact, because the name of the chevron contains the name of the control.
    return page.getByRole('button', {exact: true, name: 'Microphone'});
}

function getChevron(): ReturnType<typeof page.getByRole> {
    return page.getByRole('button', {name: 'Select microphone'});
}

describe('Control.svelte', () => {
    it('forwards extra props to the underlying element', async () => {
        // Arrange
        const {getByTestId} = render(ControlFixture, {
            'data-testid': 'control',
            'log': createTestLogger(),
            'type': 'button',
            'variant': 'neutral',
        });

        // Assert
        await expect.element(getByTestId('control')).toBeInTheDocument();
    });

    // The size is explicit rather than derived from the glyph, so that a row of controls keeps its
    // geometry even if the icon font is slow to load or missing.
    it('renders a button of a fixed size', () => {
        // Arrange
        render(ControlFixture, {log: createTestLogger(), type: 'button', variant: 'neutral'});

        // Assert
        const {height, width} = getToggle().element().getBoundingClientRect();
        expect({height, width}).toStrictEqual({height: 46, width: 46});
    });

    it('names the control by its label, and has no chevron without a menu', async () => {
        // Arrange
        render(ControlFixture, {log: createTestLogger(), type: 'button', variant: 'neutral'});

        // Assert
        await expect.element(getToggle()).toBeInTheDocument();
        expect(getChevron().elements()).toHaveLength(0);
    });

    it('reports whether it is on, so that its state is announced', async () => {
        // Arrange
        const {rerender} = render(ControlFixture, {
            isActive: true,
            log: createTestLogger(),
            type: 'toggle',
        });

        // Assert
        await expect.element(getToggle()).toHaveAttribute('aria-pressed', 'true');

        // Act
        await rerender({isActive: false});

        // Assert
        await expect.element(getToggle()).toHaveAttribute('aria-pressed', 'false');
    });

    it('reports no state if it does not toggle anything', async () => {
        // Arrange
        render(ControlFixture, {log: createTestLogger(), type: 'button', variant: 'neutral'});

        // Assert
        await expect.element(getToggle()).not.toHaveAttribute('aria-pressed');
    });

    it('reports a click on the control', async () => {
        // Arrange
        const onclick = vi.fn();
        render(ControlFixture, {
            log: createTestLogger(),
            onclick,
            type: 'button',
            variant: 'neutral',
        });

        // Act
        await userEvent.click(getToggle());

        // Assert
        expect(onclick).toHaveBeenCalledOnce();
    });

    it('shows the menu when the chevron is clicked', async () => {
        // Arrange
        const {container} = render(ControlFixture, {
            hasMenu: true,
            log: createTestLogger(),
            type: 'button',
            variant: 'neutral',
        });
        expect(getMenuPopover(container).matches(':popover-open')).toBe(false);

        // Act
        await userEvent.click(getChevron());

        // Assert
        expect(getMenuPopover(container).matches(':popover-open')).toBe(true);
        await expect.element(page.getByRole('menuitemradio', {name: 'Headset'})).toBeVisible();
    });

    it('hides the menu when the chevron is clicked again', async () => {
        // Arrange
        const {container} = render(ControlFixture, {
            hasMenu: true,
            log: createTestLogger(),
            type: 'button',
            variant: 'neutral',
        });
        await userEvent.click(getChevron());

        // Act
        await userEvent.click(getChevron());

        // Assert
        expect(getMenuPopover(container).matches(':popover-open')).toBe(false);
    });

    // Selecting a device can take a moment, and the menu is where that is reported, so it stays
    // open until it is dismissed deliberately.
    it('keeps the menu open when one of its items is selected', async () => {
        // Arrange
        const {container} = render(ControlFixture, {
            hasMenu: true,
            log: createTestLogger(),
            type: 'button',
            variant: 'neutral',
        });
        await userEvent.click(getChevron());

        // Act
        await userEvent.click(page.getByRole('menuitemradio', {name: 'Built-in microphone'}));

        // Assert
        expect(getMenuPopover(container).matches(':popover-open')).toBe(true);
    });

    it('hides the menu when a click lands outside of it', async () => {
        // Arrange
        const {container} = render(ControlFixture, {
            hasMenu: true,
            log: createTestLogger(),
            type: 'button',
            variant: 'neutral',
        });
        await userEvent.click(getChevron());

        // Act
        await userEvent.click(page.getByRole('button', {name: 'Outside'}));

        // Assert
        expect(getMenuPopover(container).matches(':popover-open')).toBe(false);
    });

    it('disables the chevron along with the control', async () => {
        // Arrange
        render(ControlFixture, {
            disabled: true,
            hasMenu: true,
            log: createTestLogger(),
            type: 'button',
            variant: 'neutral',
        });

        // Assert
        await expect.element(getToggle()).toBeDisabled();
        await expect.element(getChevron()).toBeDisabled();
    });
});
