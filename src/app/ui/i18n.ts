import {default as i18next} from 'i18next';

import {type Logger, type LoggerFactory, type LogRecordFn} from '~/common/logging';
import {type u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {keys} from '~/common/utils/object';
import {type IQueryableStore, type ISubscribableStore, WritableStore} from '~/common/utils/store';

import translationDe from '../../translations/de/translation.json';
import translationEn from '../../translations/en/translation.json';

// Consider keeping the locales in sync in the config/i18next-parser.config.js file.
export const resources = {
    en: {
        translation: translationEn,
    },
    de: {
        translation: translationDe,
    },
} as const;

/**
 * Available locales.
 */
const LOCALES_WITH_TRANSLATIONS = keys(resources);

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

interface LocaleConfig {
    localeStore: IQueryableStore<Locale>;
    logging: LoggerFactory;
}

function i18nLogAdapter(logRecordFn: LogRecordFn): (args: unknown[]) => void {
    return (args: unknown[]) => {
        logRecordFn(...args);
    };
}

const currentLanguage = new WritableStore<Locale>(FALLBACK_LOCALE);
let log: Logger;

async function initialize(config: LocaleConfig): Promise<void> {
    log = config.logging.logger('i18n');

    if (i18next.isInitialized) {
        log.warn('Already initialized');
        return;
    }

    log.info('Initializing...', {config});

    const lng = config.localeStore.get();

    await i18next
        .use({
            type: 'logger',
            log: i18nLogAdapter(log.info),
            warn: i18nLogAdapter(log.warn),
            error: i18nLogAdapter(log.error),
        })
        .init({
            lng,
            resources,
            fallbackLng: FALLBACK_LOCALE,
            debug: import.meta.env.DEBUG,
            returnNull: false,
        });

    currentLanguage.set(lng);

    log.info('Initialization complete', {
        language: i18next.language,
        resolvedLanguage: i18next.resolvedLanguage,
        loadedLanguages: i18next.languages,
    });

    config.localeStore.subscribe((locale) => {
        if (isLocale(locale)) {
            void setLanguage(locale);
        }
    });
}

async function setLanguage(locale: Locale): Promise<void> {
    assert(i18next.isInitialized, 'i18n must be initialized before calling `setLanguage`');

    if (i18next.language === locale) {
        return;
    }

    await i18next.changeLanguage(locale);

    currentLanguage.set(locale);
}

export const i18n = {
    initialize,
    /**
     * This store is updated after localStorage.locale, when the i18n framework is ready with the
     * new language, to avoid racing conditions.
     */
    currentLanguage: currentLanguage as ISubscribableStore<Locale>,
    t: i18next.t,
} as const;
