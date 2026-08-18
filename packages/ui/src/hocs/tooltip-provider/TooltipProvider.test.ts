import {describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import TooltipProviderFixture from './TooltipProvider.fixture.svelte';

/**
 * Wait for the next animation frame, i.e. for the point at which the underlying popover reports the
 * end of a hover.
 */
async function nextFrame(): Promise<void> {
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

function getTooltips(): readonly (HTMLElement | SVGElement)[] {
    return page.getByRole('tooltip').elements();
}

function getTrigger(): ReturnType<typeof page.getByRole> {
    return page.getByRole('button', {name: 'Trigger'});
}

describe('TooltipProvider.svelte', () => {
    it('shows the tooltip while its trigger has focus', async () => {
        // Arrange
        render(TooltipProviderFixture, {text: 'Copy conference link'});

        // Assert
        expect(getTooltips()).toHaveLength(0);

        // Act
        getTrigger().element().focus();

        // Assert
        await expect.element(page.getByRole('tooltip')).toHaveTextContent('Copy conference link');

        // Act
        getTrigger().element().blur();

        // Assert
        await vi.waitFor(() => {
            expect(getTooltips()).toHaveLength(0);
        });
    });

    // Hover and focus are two independent reasons to be shown, so losing one of them while the
    // other persists must not hide the tooltip.
    it('stays open when the pointer leaves while its trigger has focus', async () => {
        // Arrange
        render(TooltipProviderFixture, {text: 'Copy conference link'});
        getTrigger().element().focus();
        await userEvent.hover(getTrigger());
        await expect.element(page.getByRole('tooltip')).toBeVisible();

        // Act
        await userEvent.hover(page.getByRole('button', {name: 'Elsewhere'}));
        await nextFrame();
        await nextFrame();

        // Assert
        expect(getTooltips()).toHaveLength(1);
    });

    // A trigger which does something when clicked replaces the click handler the tooltip hands
    // over, so the tooltip must not depend on it to stop showing the focus a click leaves behind.
    it('hides the tooltip once the pointer leaves a trigger which handles its own click', async () => {
        // Arrange
        render(TooltipProviderFixture, {
            hasOwnClickHandler: true,
            text: 'Copy conference link',
        });
        await userEvent.hover(getTrigger());
        await expect.element(page.getByRole('tooltip')).toBeVisible();

        // Act
        await userEvent.click(getTrigger());
        await userEvent.hover(page.getByRole('button', {name: 'Elsewhere'}));
        await nextFrame();
        await nextFrame();

        // Assert: The trigger still has focus, but not the kind which is worth showing.
        expect(getTrigger().element()).toBe(document.activeElement);
        await vi.waitFor(() => {
            expect(getTooltips()).toHaveLength(0);
        });
    });

    it('hides the tooltip when its trigger is clicked', async () => {
        // Arrange
        render(TooltipProviderFixture, {text: 'Copy conference link'});
        await userEvent.hover(getTrigger());
        await expect.element(page.getByRole('tooltip')).toBeVisible();

        // Act
        await userEvent.click(getTrigger());

        // Assert
        await vi.waitFor(() => {
            expect(getTooltips()).toHaveLength(0);
        });
    });
});
