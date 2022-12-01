import {type u53} from '~/common/types';

/**
 * Available themes.
 */
export const THEMES = ['light', 'dark'] as const;
export type Theme = typeof THEMES[u53];

/**
 * Validate a theme and fall back to the browsers preferred color scheme, if
 * necessary.
 */
export function ensureTheme(theme: string): Theme {
    if (!(THEMES as readonly string[]).includes(theme)) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme as Theme;
}

/**
 * Apply a theme to the app container.
 */
export function applyTheme(theme: Theme, container: HTMLElement): void {
    // Note: Keep this in sync with CSS selectors in `_theme.scss`
    container.setAttribute(`data-theme`, theme);
}

/**
 * Apply a theme branding (from build variant) to the app container.
 */
export function applyThemeBranding(
    branding: ImportMetaEnv['BUILD_VARIANT'],
    container: HTMLElement,
): void {
    // Note: Keep this in sync with CSS selectors in `_theme.scss`
    container.setAttribute('data-branding', branding);
}
