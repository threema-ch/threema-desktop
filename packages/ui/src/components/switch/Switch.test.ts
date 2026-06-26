import {describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import Switch from './Switch.svelte';

describe('Switch.svelte', () => {
    it('forwards extra props to the underlying input', async () => {
        // Arrange
        const {getByRole} = render(Switch, {'data-testid': 'switch'});

        // Assert: If the element exposing the `switch` role carries the forwarded attribute, the
        // rest props were correctly applied to the underlying input.
        await expect.element(getByRole('switch')).toHaveAttribute('data-testid', 'switch');
    });

    it('renders an input with the switch role', async () => {
        // Arrange
        const {getByRole} = render(Switch);

        // Assert
        await expect.element(getByRole('switch')).toBeInTheDocument();
    });

    it('is unchecked by default', async () => {
        // Arrange
        const {getByRole} = render(Switch);

        // Assert
        const element = getByRole('switch');
        await expect.element(element).not.toBeChecked();
        await expect.element(element).toHaveAttribute('aria-checked', 'false');
    });

    it('reflects the checked prop', async () => {
        // Arrange
        const {getByRole} = render(Switch, {checked: true});

        // Assert
        const element = getByRole('switch');
        await expect.element(element).toBeChecked();
        await expect.element(element).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles its checked state when clicked', async () => {
        // Arrange
        const {getByRole} = render(Switch);
        const element = getByRole('switch');

        // Act
        await userEvent.click(element);

        // Assert
        await expect.element(element).toBeChecked();

        // Act
        await userEvent.click(element);

        // Assert
        await expect.element(element).not.toBeChecked();
    });

    it('calls the onclick handler when clicked', async () => {
        // Arrange
        let callCount = 0;
        function onclick(): void {
            callCount++;
        }
        const {getByRole} = render(Switch, {onclick});

        // Act
        await userEvent.click(getByRole('switch'));

        // Assert
        expect(callCount).toBe(1);
    });

    it('can be disabled via the disabled attribute', async () => {
        // Arrange
        const {getByRole} = render(Switch, {disabled: true});

        // Assert
        await expect.element(getByRole('switch')).toBeDisabled();
    });

    it('does not toggle while disabled', async () => {
        // Arrange
        const {getByRole} = render(Switch, {checked: false, disabled: true});
        const element = getByRole('switch');

        // Act: A disabled control swallows the native toggle.
        await userEvent.click(element, {force: true});

        // Assert
        await expect.element(element).not.toBeChecked();
    });
});
