import {describe, expect, it, vi} from 'vitest';
import {page} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import VerticalNavigationStrip from './VerticalNavigationStrip.svelte';

describe('VerticalNavigationStrip.svelte', () => {
    it('renders start and end items as buttons labelled by their text', async () => {
        render(VerticalNavigationStrip, {
            startItems: [
                {icon: {glyph: 'chat_bubble'}, label: 'Chats', active: true},
                {icon: {glyph: 'person'}, label: 'Contacts'},
            ],
            endItems: [{icon: {glyph: 'settings'}, label: 'Settings'}],
        });

        await expect.element(page.getByRole('button', {name: 'Chats'})).toBeInTheDocument();
        await expect.element(page.getByRole('button', {name: 'Contacts'})).toBeInTheDocument();
        await expect.element(page.getByRole('button', {name: 'Settings'})).toBeInTheDocument();
    });

    it('marks the active item with `aria-current="page"`', async () => {
        render(VerticalNavigationStrip, {
            startItems: [
                {icon: {glyph: 'chat_bubble'}, label: 'Chats', active: true},
                {icon: {glyph: 'person'}, label: 'Contacts'},
            ],
        });

        await expect
            .element(page.getByRole('button', {name: 'Chats'}))
            .toHaveAttribute('aria-current', 'page');
        await expect
            .element(page.getByRole('button', {name: 'Contacts'}))
            .not.toHaveAttribute('aria-current');
    });

    it('invokes the `onclick` handler when an item is clicked', async () => {
        const onclick = vi.fn();
        render(VerticalNavigationStrip, {
            startItems: [{icon: {glyph: 'chat_bubble'}, label: 'Chats', onclick}],
        });

        await page.getByRole('button', {name: 'Chats'}).click();
        expect(onclick).toHaveBeenCalledTimes(1);
    });

    it('does not invoke the `onclick` handler when the active item is clicked', async () => {
        const onclick = vi.fn();
        render(VerticalNavigationStrip, {
            startItems: [{icon: {glyph: 'chat_bubble'}, label: 'Chats', active: true, onclick}],
        });

        await page.getByRole('button', {name: 'Chats'}).click();
        expect(onclick).not.toHaveBeenCalled();
    });

    it('renders the avatar button with its label as accessible name', async () => {
        render(VerticalNavigationStrip, {
            startItems: [{icon: {glyph: 'chat_bubble'}, label: 'Chats'}],
            avatar: {initials: 'JD', label: 'Jane Doe'},
        });

        await expect.element(page.getByRole('button', {name: 'Jane Doe'})).toBeInTheDocument();
    });
});
