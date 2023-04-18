import {type u53} from '~/common/types';

/**
 * Available locales.
 */

const LOCALES_WITH_TRANSLATIONS = ['en', 'de'] as const;

// Note: 'cimode' is a special locale from i18next to always display the translation key instead
// of the translation.
export const LOCALES = import.meta.env.DEBUG
    ? ([...LOCALES_WITH_TRANSLATIONS, 'cimode'] as const)
    : LOCALES_WITH_TRANSLATIONS;

export type Locale = (typeof LOCALES)[u53];

export const FALLBACK_LOCALE: Locale = 'en' as const;

export function ensureLocale(locale: string | undefined): Locale {
    if (locale === undefined) {
        return FALLBACK_LOCALE;
    }

    return getClosestAvailableLocale(locale);
}

export function isLocale(locale: string): locale is Locale {
    return (LOCALES as readonly string[]).includes(locale);
}

function getClosestAvailableLocale(locale: string): Locale {
    if (isLocale(locale)) {
        return locale;
    }

    try {
        const minimizedLocale = new Intl.Locale(locale).language;
        if (isLocale(minimizedLocale)) {
            return minimizedLocale;
        }
    } catch (error) {
        // Unable to create an Intl.Locale object from locale.
        // Ignoring error.
    }

    return FALLBACK_LOCALE;
}
