import {default as i18next} from 'i18next';

import {FALLBACK_LOCALE, isLocale, type Locale} from '~/common/dom/ui/locale';
import {type Logger, type LoggerFactory, type LogRecordFn} from '~/common/logging';
import {assert} from '~/common/utils/assert';
import {type IQueryableStore, type ISubscribableStore, WritableStore} from '~/common/utils/store';

import translationDe from '../../translations/de/translation.json';
import translationEn from '../../translations/en/translation.json';

export const resources = {
    en: {
        translation: translationEn,
    },
    de: {
        translation: translationDe,
    },
} as const;

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
