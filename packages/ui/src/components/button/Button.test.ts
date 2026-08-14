import {describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import {createRawTextSnippet} from '../../utils/test/create-raw-text-snippet';
import {createTestLogger} from '../../utils/test/create-test-logger';

import Button from './Button.svelte';

describe('Button.svelte', () => {
    it('forwards extra props to the underlying element', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            'children': createRawTextSnippet('Button'),
            'data-testid': 'button',
            'log': createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('button')).toHaveAttribute('data-testid', 'button');
    });

    it('renders as a <button> element by default', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            log: createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('button')).toBeInTheDocument();
    });

    it('renders as an <a> element when href is provided', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            href: '/target',
            log: createTestLogger(),
        });
        const element = getByRole('link');

        // Assert
        await expect.element(element).toBeInTheDocument();
        await expect.element(element).toHaveAttribute('href', '/target');
    });

    it('renders child content', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            log: createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('button')).toHaveTextContent('Button');
    });

    it('can be disabled via the disabled attribute (<button>)', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            disabled: true,
            log: createTestLogger(),
        });

        // Assert
        await expect.element(getByRole('button')).toBeDisabled();
    });

    it('can be disabled via the disabled attribute (<a>)', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            disabled: true,
            href: '/target',
            log: createTestLogger(),
        });
        const element = getByRole('link');

        // Assert
        await expect.element(element).not.toHaveAttribute('href');
        await expect.element(element).toHaveAttribute('aria-disabled', 'true');
    });

    it('is skipped when trying to focus it via tabbing in disabled state (<button>)', async () => {
        // Arrange: Render three buttons, of which the second one is disabled.
        render(Button, {children: createRawTextSnippet('First'), log: createTestLogger()});
        render(Button, {
            children: createRawTextSnippet('Disabled'),
            disabled: true,
            log: createTestLogger(),
        });
        render(Button, {children: createRawTextSnippet('Third'), log: createTestLogger()});

        // Act: Focus the first button, then tab once.
        page.getByRole('button', {name: 'First'}).element().focus();
        await userEvent.tab();

        // Assert: Expect the second button to have been skipped, and the third to be focused.
        await expect.element(page.getByRole('button', {name: 'Third'})).toHaveFocus();
    });

    it('is skipped when trying to focus it via tabbing in disabled state (<a>)', async () => {
        // Arrange: Render three links, of which the second one is disabled.
        render(Button, {
            children: createRawTextSnippet('First'),
            href: '/target',
            log: createTestLogger(),
        });
        render(Button, {
            children: createRawTextSnippet('Disabled'),
            disabled: true,
            href: '/target',
            log: createTestLogger(),
        });
        render(Button, {
            children: createRawTextSnippet('Third'),
            href: '/target',
            log: createTestLogger(),
        });

        // Act: Focus the first link, then tab once.
        page.getByRole('link', {name: 'First'}).element().focus();
        await userEvent.tab();

        // Assert: Expect the second link to have been skipped, and the third to be focused.
        await expect.element(page.getByRole('link', {name: 'Third'})).toHaveFocus();
    });

    // An `<a>` without an `href` loses its implicit link role, so the component must set it
    // explicitly to keep the element announced as a link by screen readers.
    it('preserves the link role if it is disabled (<a>)', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            disabled: true,
            href: '/target',
            log: createTestLogger(),
        });
        const element = getByRole('link');

        // Assert
        await expect.element(element).not.toHaveAttribute('href');
        await expect.element(element).toHaveAttribute('role', 'link');
    });

    // Property `type` is only valid for `<button>`s.
    it('does not forward the type attribute (<a>)', async () => {
        // Arrange
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            href: '/target',
            log: createTestLogger(),
            type: 'submit',
        } as Parameters<typeof render<typeof Button>>[1]);

        // Assert
        await expect.element(getByRole('link')).not.toHaveAttribute('type');
    });

    it('calls a sync onclick handler and does not enter a loading state', async () => {
        // Arrange
        let callCount = 0;
        function onclick(): void {
            callCount++;
        }
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            log: createTestLogger(),
            onclick,
        });
        const button = getByRole('button');

        // Act
        await userEvent.click(button);

        // Assert: Handler was called and button remains enabled (no loading state).
        expect(callCount).toBe(1);
        await expect.element(button).not.toBeDisabled();
    });

    it('is disabled while an async onclick handler is pending', async () => {
        // Arrange
        let resolveClick!: () => void;
        async function onclick(): Promise<void> {
            return await new Promise<void>((resolve) => {
                resolveClick = resolve;
            });
        }
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            log: createTestLogger(),
            onclick,
        });
        const button = getByRole('button');

        // Act: Click the button and let the promise hang.
        await userEvent.click(button);

        // Assert: Button is disabled while the promise is pending.
        await expect.element(button).toBeDisabled();

        // Act: Resolve the promise.
        resolveClick();

        // Assert: Button becomes enabled again after the promise settles.
        await expect.element(button).not.toBeDisabled();
    });

    it('re-enables the button after the async onclick handler rejects', async () => {
        // Arrange
        let rejectClick!: (reason?: unknown) => void;
        async function onclick(): Promise<void> {
            return await new Promise<void>((resolve, reject) => {
                rejectClick = reject;
            });
        }
        const log = createTestLogger();
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            log,
            onclick,
        });
        const button = getByRole('button');

        // Act
        await userEvent.click(button);
        await expect.element(button).toBeDisabled();
        const error = new Error('failed');
        rejectClick(error);

        // Assert: Button becomes enabled again even when the promise rejects.
        await expect.element(button).not.toBeDisabled();

        // Assert: The rejection is reported to the logger instead of being swallowed.
        expect(log.error).toHaveBeenCalledOnce();
        expect(log.error).toHaveBeenCalledWith(expect.any(String), error);
    });

    it('is disabled synchronously and discards clicks that arrive while an async onclick handler is still pending', async () => {
        // Arrange
        let callCount = 0;
        let resolveClick!: () => void;
        async function onclick(): Promise<void> {
            return await new Promise<void>((resolve) => {
                callCount++;
                resolveClick = resolve;
            });
        }
        const {getByRole} = render(Button, {
            children: createRawTextSnippet('Button'),
            log: createTestLogger(),
            onclick,
        });
        const button = getByRole('button');

        // Act: Fire three clicks synchronously via native events, instead of clicks via the
        // browser provider's `userEvent`. No microtasks can run between them, so Svelte has no
        // chance to flush the DOM update. Expect clicks 2 and 3 to be blocked anyway by a
        // manual event guard in the button's click handler.
        button.element().dispatchEvent(new MouseEvent('click', {bubbles: true}));
        button.element().dispatchEvent(new MouseEvent('click', {bubbles: true}));
        button.element().dispatchEvent(new MouseEvent('click', {bubbles: true}));

        // Assert: Expect the DOM disabled attribute to not be set yet, because Svelte hasn't
        // had a chance to flush. This confirms the above clicks were blocked by the event
        // guard.
        expect((button.element() as HTMLButtonElement).disabled).toBe(false);

        // Assert: Once we yield to the microtask queue (which this assertion does implicitly),
        // Svelte flushes and the button becomes disabled.
        await expect.element(button).toBeDisabled();

        // Assert: Across all of the above, only the first click triggered the handler.
        expect(callCount).toBe(1);

        // Assert: Resolve the promise and expect the button to become enabled again.
        resolveClick();
        await expect.element(button).not.toBeDisabled();
    });
});
