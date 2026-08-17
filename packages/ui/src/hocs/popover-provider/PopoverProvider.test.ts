import {assert} from '@threema/ts-utils/meta/assert';
import {describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import PopoverProviderFixture from './PopoverProvider.fixture.svelte';

/**
 * Returns the popover element of the rendered fixture, which is marked with a `data-testid` because
 * it is not exposed to assistive technology while it is closed.
 */
function getPopover(container: HTMLElement): HTMLElement {
    const element = container.querySelector('[data-testid="popover"]');
    assert(element instanceof HTMLElement, 'Expected the fixture to render a popover');

    return element;
}

function getTrigger(): ReturnType<typeof page.getByRole> {
    return page.getByRole('button', {name: 'Trigger'});
}

/**
 * Wait for the next animation frame, i.e. for the point at which the popover reports the end of a
 * hover.
 */
async function nextFrame(): Promise<void> {
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

describe('PopoverProvider.svelte', () => {
    describe('open state', () => {
        // The popover API throws if the popover is already in the requested state, which is why the
        // component checks before calling it.
        it('stays closed without failing if it is rendered closed', () => {
            // Act
            const {container} = render(PopoverProviderFixture, {
                'data-testid': 'popover',
                'isOpen': false,
            });

            // Assert
            expect(getPopover(container).matches(':popover-open')).toBe(false);
        });

        it('opens and closes as the requested state changes', async () => {
            // Arrange
            const {container, rerender} = render(PopoverProviderFixture, {
                'data-testid': 'popover',
                'isOpen': false,
            });

            // Act
            await rerender({isOpen: true});

            // Assert
            expect(getPopover(container).matches(':popover-open')).toBe(true);

            // Act
            await rerender({isOpen: false});

            // Assert
            expect(getPopover(container).matches(':popover-open')).toBe(false);
        });

        it('reports a click on the trigger', async () => {
            // Arrange
            const onclicktrigger = vi.fn();
            render(PopoverProviderFixture, {isOpen: false, onclicktrigger});

            // Act
            await userEvent.click(getTrigger());

            // Assert
            expect(onclicktrigger).toHaveBeenCalledOnce();
        });
    });

    describe('outside clicks', () => {
        it('reports a click which landed outside of the trigger and the popover', async () => {
            // Arrange
            const onclickoutside = vi.fn();
            render(PopoverProviderFixture, {isOpen: true, onclickoutside});

            // Act
            await userEvent.click(page.getByRole('button', {name: 'Outside'}));

            // Assert
            expect(onclickoutside).toHaveBeenCalledOnce();
        });

        // The popover is rendered in the top layer, so it is not a descendant of the trigger, and a
        // click inside it must not be mistaken for a click outside.
        it('does not report a click inside the popover', async () => {
            // Arrange
            const onclickoutside = vi.fn();
            render(PopoverProviderFixture, {isOpen: true, onclickoutside});

            // Act
            await userEvent.click(page.getByRole('button', {name: 'Inside'}));

            // Assert
            expect(onclickoutside).not.toHaveBeenCalled();
        });

        it('does not report a click on the trigger', async () => {
            // Arrange
            const onclickoutside = vi.fn();
            render(PopoverProviderFixture, {isOpen: true, onclickoutside});

            // Act
            await userEvent.click(getTrigger());

            // Assert
            expect(onclickoutside).not.toHaveBeenCalled();
        });

        it('does not report clicks while the popover is closed', async () => {
            // Arrange
            const onclickoutside = vi.fn();
            render(PopoverProviderFixture, {isOpen: false, onclickoutside});

            // Act
            await userEvent.click(page.getByRole('button', {name: 'Outside'}));

            // Assert
            expect(onclickoutside).not.toHaveBeenCalled();
        });

        // The consumer opens the popover from the same click, so the popover must not treat that
        // click as one which landed outside of it.
        it('does not report the click which opened the popover', async () => {
            // Arrange
            const handleClickOutside = vi.fn();
            let open: (() => void) | undefined = undefined;
            const {container, rerender} = render(PopoverProviderFixture, {
                'data-testid': 'popover',
                'isOpen': false,
                'onclickoutside': handleClickOutside,
                'onclicktrigger': () => open?.(),
            });
            open = () => {
                rerender({isOpen: true}).catch(() => {
                    // Handled by the assertions below.
                });
            };

            // Act
            await userEvent.click(getTrigger());

            // Assert
            await vi.waitFor(() => {
                expect(getPopover(container).matches(':popover-open')).toBe(true);
            });
            expect(handleClickOutside).not.toHaveBeenCalled();
        });

        // The trigger is tracked by an attachment (see: `svelte/attachments`) which is deliberately
        // created once, so that updating a prop does not detach it.
        it('still recognizes the trigger after the props changed', async () => {
            // Arrange
            const onclickoutside = vi.fn();
            const {rerender} = render(PopoverProviderFixture, {
                align: 'center',
                isOpen: true,
                onclickoutside,
            });

            // Act
            await rerender({align: 'end'});
            await userEvent.click(getTrigger());

            // Assert
            expect(onclickoutside).not.toHaveBeenCalled();
        });

        it('does not report anything after it was destroyed', () => {
            // Arrange
            const onclickoutside = vi.fn();
            const {unmount} = render(PopoverProviderFixture, {isOpen: true, onclickoutside});

            // Act
            unmount();
            document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}));

            // Assert
            expect(onclickoutside).not.toHaveBeenCalled();
        });
    });

    describe('hover', () => {
        it('reports the start of a hover on the trigger', async () => {
            // Arrange
            const onhoverstart = vi.fn();
            render(PopoverProviderFixture, {isOpen: false, onhoverstart});

            // Act
            await userEvent.hover(getTrigger());

            // Assert
            expect(onhoverstart).toHaveBeenCalledOnce();
        });

        // The trigger and the popover form a single hover region, so that the pointer can be moved
        // into the popover without it closing behind the pointer.
        it('does not end the hover when the pointer moves from the trigger into the popover', async () => {
            // Arrange
            const onhoverend = vi.fn();
            const onhoverstart = vi.fn();
            render(PopoverProviderFixture, {isOpen: true, onhoverend, onhoverstart});

            // Act
            await userEvent.hover(getTrigger());
            await userEvent.hover(page.getByRole('button', {name: 'Inside'}));
            await nextFrame();
            await nextFrame();

            // Assert: The hover neither ended nor started a second time.
            expect(onhoverend).not.toHaveBeenCalled();
            expect(onhoverstart).toHaveBeenCalledOnce();
        });

        it('ends the hover once the pointer left both the trigger and the popover', async () => {
            // Arrange
            const onhoverend = vi.fn();
            render(PopoverProviderFixture, {isOpen: true, onhoverend});

            // Act
            await userEvent.hover(getTrigger());
            await userEvent.hover(page.getByRole('button', {name: 'Inside'}));
            await userEvent.hover(page.getByRole('button', {name: 'Outside'}));

            // Assert
            await vi.waitFor(() => {
                expect(onhoverend).toHaveBeenCalledOnce();
            });
        });
    });

    describe('accessibility', () => {
        it('marks the trigger as the control of the popover', () => {
            // Arrange
            const {container} = render(PopoverProviderFixture, {
                'data-testid': 'popover',
                'isOpen': false,
            });

            // Assert
            expect(getTrigger().element().getAttribute('aria-controls')).toBe(
                getPopover(container).id,
            );
            expect(getTrigger().element()).not.toHaveAttribute('aria-describedby');
        });

        // A trigger which is described by its popover, e.g. a tooltip, neither controls it nor is
        // expandable.
        it('describes the trigger by the popover instead if it is requested', () => {
            // Arrange
            const {container} = render(PopoverProviderFixture, {
                'data-testid': 'popover',
                'isOpen': false,
                'semantics': 'description',
            });

            // Assert
            expect(getTrigger().element().getAttribute('aria-describedby')).toBe(
                getPopover(container).id,
            );
            expect(getTrigger().element()).not.toHaveAttribute('aria-controls');
            expect(getTrigger().element()).not.toHaveAttribute('aria-expanded');
        });

        it('reports on the trigger whether the popover is expanded', async () => {
            // Arrange
            const {rerender} = render(PopoverProviderFixture, {isOpen: false});

            // Assert
            await expect.element(getTrigger()).toHaveAttribute('aria-expanded', 'false');

            // Act
            await rerender({isOpen: true});

            // Assert
            await expect.element(getTrigger()).toHaveAttribute('aria-expanded', 'true');
        });
    });
});
