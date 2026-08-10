import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import Icon from './Icon.svelte';

/** The font family each combination of icon font family and style is expected to resolve to. */
const FONTS = [
    {font: {family: 'material', style: 'outlined'}, expected: 'Material Symbols Outlined'},
    {font: {family: 'material', style: 'filled'}, expected: 'Material Symbols Outlined'},
    {font: {family: 'threema', style: 'outlined'}, expected: 'Threema Icons Outlined'},
    {font: {family: 'threema', style: 'filled'}, expected: 'Threema Icons Filled'},
] as const;

describe('Icon.svelte', () => {
    it('forwards extra props to the underlying element', async () => {
        // Arrange
        const {getByTestId} = render(Icon, {'data-testid': 'icon', 'glyph': 'chat_bubble'});

        // Assert
        await expect.element(getByTestId('icon')).toBeInTheDocument();
    });

    it('renders the glyph as its text content', async () => {
        // Arrange
        const {getByTestId} = render(Icon, {'data-testid': 'icon', 'glyph': 'chat_bubble'});

        // Assert: The icon fonts resolve the text content as a ligature, so it must be the exact
        // glyph name.
        await expect.element(getByTestId('icon')).toHaveTextContent('chat_bubble');
    });

    describe('fonts', () => {
        it('uses the outlined Material Symbols font by default', () => {
            // Arrange
            const {getByTestId} = render(Icon, {'data-testid': 'icon', 'glyph': 'chat_bubble'});

            // Assert
            expect(getComputedStyle(getByTestId('icon').element()).fontFamily).toContain(
                'Material Symbols Outlined',
            );
        });

        it('defaults the font style to outlined if only a family is given', () => {
            // Arrange
            const {getByTestId} = render(Icon, {
                'data-testid': 'icon',
                'font': {family: 'threema'},
                'glyph': 'star',
            });

            // Assert
            expect(getComputedStyle(getByTestId('icon').element()).fontFamily).toContain(
                'Threema Icons Outlined',
            );
        });

        it('defaults the font family to Material Symbols if only a style is given', () => {
            // Arrange
            const {getByTestId} = render(Icon, {
                'data-testid': 'icon',
                'font': {style: 'filled'},
                'glyph': 'chat_bubble',
            });

            // Assert
            expect(getComputedStyle(getByTestId('icon').element()).fontFamily).toContain(
                'Material Symbols Outlined',
            );
        });

        for (const {font: iconFont, expected} of FONTS) {
            it(`resolves the '${iconFont.family}' family in '${iconFont.style}' style to '${expected}'`, () => {
                // Arrange
                const {getByTestId} = render(Icon, {
                    'data-testid': 'icon',
                    'font': iconFont,
                    'glyph': 'chat_bubble',
                });

                // Assert
                expect(getComputedStyle(getByTestId('icon').element()).fontFamily).toContain(
                    expected,
                );
            });
        }

        it('fills the glyph via the variable font axis for the filled Material Symbols font', () => {
            // Arrange
            const {getByTestId} = render(Icon, {
                'data-testid': 'icon',
                'font': {family: 'material', style: 'filled'},
                'glyph': 'chat_bubble',
            });

            // Assert: The filled variant is the same font with its `FILL` axis set, so setting the
            // axis is the only thing that distinguishes it from the outlined variant.
            expect(getComputedStyle(getByTestId('icon').element()).fontVariationSettings).toMatch(
                /"?FILL"?\s+1/u,
            );
        });

        it('does not set a variable font axis for the outlined Material Symbols font', () => {
            // Arrange
            const {getByTestId} = render(Icon, {
                'data-testid': 'icon',
                'font': {family: 'material', style: 'outlined'},
                'glyph': 'chat_bubble',
            });

            // Assert
            expect(getComputedStyle(getByTestId('icon').element()).fontVariationSettings).toBe(
                'normal',
            );
        });
    });

    describe('accessibility', () => {
        it('is hidden from assistive technology if no label is given', async () => {
            // Arrange
            const {getByTestId} = render(Icon, {'data-testid': 'icon', 'glyph': 'chat_bubble'});

            // Assert
            await expect.element(getByTestId('icon')).toHaveAttribute('aria-hidden', 'true');
            expect(page.getByRole('img').elements()).toHaveLength(0);
        });

        it('is exposed as an image with the given label', async () => {
            // Arrange
            render(Icon, {glyph: 'mic_off', label: 'Microphone is muted'});

            // Assert
            await expect
                .element(page.getByRole('img', {name: 'Microphone is muted'}))
                .toBeInTheDocument();
        });
    });

    describe('sizing', () => {
        it('matches the line height of its surrounding text by default', () => {
            // Arrange
            const {container, getByTestId} = render(Icon, {
                'data-testid': 'icon',
                'glyph': 'chat_bubble',
            });

            // Act: Set a line height on the parent. Note that `lh` in a `font-size` resolves
            // against the parent's line height.
            container.style.lineHeight = '40px';

            // Assert
            expect(getComputedStyle(getByTestId('icon').element()).fontSize).toBe('40px');
        });

        it('can be sized arbitrarily via the class prop', () => {
            // Arrange
            const {container, getByTestId} = render(Icon, {
                'class': 'text-2xl',
                'data-testid': 'icon',
                'glyph': 'chat_bubble',
            });

            // Act: Set a line height that the icon would inherit its size from, to verify that the
            // class overrides the default size instead of being merged with it.
            container.style.lineHeight = '40px';

            // Assert: `text-2xl` (24px at the default 16px root font size).
            expect(getComputedStyle(getByTestId('icon').element()).fontSize).toBe('24px');
        });

        // `tailwind-merge` treats the `font-size` group as conflicting with the `leading` group, so
        // a font size passed via the class prop would drop the component's own line height if the
        // line height was not applied after the class prop.
        it('keeps its line height when it is resized via the class prop', () => {
            // Arrange
            const {container, getByTestId} = render(Icon, {
                'class': 'text-2xl',
                'data-testid': 'icon',
                'glyph': 'chat_bubble',
            });

            // Act: Set a line height on the parent, which the icon must not inherit.
            container.style.lineHeight = '40px';

            // Assert: The box is exactly as tall as the font size, i.e. it hugs the glyph.
            const icon = getByTestId('icon').element();
            expect(getComputedStyle(icon).lineHeight).toBe('24px');
            expect(icon.getBoundingClientRect().height).toBe(24);
        });
    });
});
