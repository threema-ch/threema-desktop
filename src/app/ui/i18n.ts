/* eslint '@typescript-eslint/no-misused-promises': 0 */
// SOURCE: https://github.com/i18next/i18next/issues/1901

import {default as i18next, type i18n as i18nType} from 'i18next';
import ICU from 'i18next-icu';

import {type Logger, type LoggerFactory, type LogRecordFn} from '~/common/logging';
import {type StrictPartial, type u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {keys} from '~/common/utils/object';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';

import translationDebugJson from '../../translations/debug/translation.json';
import translationEnJson from '../../translations/en/translation.json';

/**
 * Define English as the base translation. All other translations will only be able to (optionally)
 * provide keys defined by the base translation.
 */
type BaseTranslation = typeof translationEnJson;

/**
 * This type together with {@link BaseTranslationTopic} ensure that the keys defined in the base
 * translation strictly follow the format described in the documentation.
 */
type BaseTranslationNamespace = {
    readonly [TKey in keyof BaseTranslation]: TKey extends Lowercase<string>
        ? TKey extends 'locale'
            ? Record<Locale, string>
            : TKey extends `${string}--${string}`
            ? TKey extends `${OptionalTranslationTopicModifier}--${Lowercase<string>}`
                ? BaseTranslationTopic<BaseTranslation[TKey]>
                : never
            : BaseTranslationTopic<BaseTranslation[TKey]>
        : never;
};
type BaseTranslationTopic<TRecord extends Record<string, string>> = {
    readonly [TKey in keyof TRecord]: TKey extends `${TranslationKeyModifier}--${Lowercase<string>}`
        ? string
        : never;
};

type OptionalTranslationTopicModifier = 'dialog';

type TranslationKeyModifier =
    | 'error'
    | 'success'
    | 'action'
    | 'label'
    | 'hint'
    | 'markup'
    | 'prose';

// This cast makes usage of the `BaseTranslationNamespace` to ensure that all keys in the base
// translation follow the format described in the documentation. Otherwise a type error is raised
// here when typechecking.
const translationEn: BaseTranslationNamespace = translationEnJson;

// Casting the `translation*Json` (other than the base `translationEnJson`) values imported from the
// JSON files as `StrictPartial` of `BaseTranslationNamespace` ensures that all translations provide
// only keys defined in the base translation while allowing for missing keys. If a translation
// provides a key that does not exist in the base translation, a type error is raised here when
// typechecking.
const translationDebug: StrictPartial<typeof translationDebugJson, BaseTranslationNamespace> =
    translationDebugJson;

const debugResources = {
    debug: {
        translation: translationDebug,
    },
} as const;

// Consider keeping the locales in sync in the config/i18next-parser.config.js file.
export const resources = {
    en: {
        translation: translationEn,
    },
    ...debugResources,
} as const;

/**
 * Available locales.
 */
const DEBUG_LOCALES = keys(debugResources);
const LOCALES_WITH_TRANSLATIONS = keys(resources);

// Note: 'cimode' is a special locale from i18next to always display the translation key instead
// of the translation.
export const LOCALES = import.meta.env.DEBUG
    ? ([...LOCALES_WITH_TRANSLATIONS, 'cimode'] as const)
    : LOCALES_WITH_TRANSLATIONS.filter((locale) => !(DEBUG_LOCALES as string[]).includes(locale));

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
    readonly localeStore: IQueryableStore<Locale>;
    readonly logging: LoggerFactory;
}

function i18nLogAdapter(logRecordFn: LogRecordFn): (args: unknown[]) => void {
    return (args: unknown[]) => {
        logRecordFn(...args);
    };
}

let log: Logger;

// Returning an object `{i18n: i18nType}` instead of directly `i18n: i18nType` is a way to force
// triggering an update.
function createI18nStore(i18n: i18nType): WritableStore<{i18n: i18nType}> {
    const i18nStore = new WritableStore<{i18n: i18nType}>({i18n});

    function forceStoreRefresh(): void {
        i18nStore.set({i18n});
    }

    i18n.on('initialized', forceStoreRefresh);
    i18n.on('loaded', forceStoreRefresh);
    i18n.on('added', forceStoreRefresh);
    i18n.on('languageChanged', forceStoreRefresh);

    return i18nStore;
}

const i18nStore = createI18nStore(i18next);

function currentI18n(): i18nType {
    return i18nStore.get().i18n;
}

export async function initialize(config: LocaleConfig): Promise<void> {
    log = config.logging.logger('i18n');

    if (currentI18n().isInitialized) {
        log.warn('Already initialized');
        return;
    }

    log.info('Initializing...', {config});

    await currentI18n()
        .use({
            type: 'logger',
            log: i18nLogAdapter(log.info),
            warn: i18nLogAdapter(log.warn),
            error: i18nLogAdapter(log.error),
        })
        .use(ICU)
        .init({
            lng: config.localeStore.get(),
            resources,
            fallbackLng: FALLBACK_LOCALE,
            debug: import.meta.env.DEBUG,
            returnNull: false,
            i18nFormat: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                parseLngForICU: (locale: (typeof LOCALES_WITH_TRANSLATIONS)[u53]) =>
                    (DEBUG_LOCALES as string[]).includes(locale) ? 'de' : locale,
            },
        });

    log.info('Initialization complete', {
        language: currentI18n().language,
        resolvedLanguage: currentI18n().resolvedLanguage,
        loadedLanguages: currentI18n().languages,
    });

    config.localeStore.subscribe((locale) => {
        if (isLocale(locale)) {
            void setLanguage(locale);
        }
    });
}

async function setLanguage(locale: Locale): Promise<void> {
    assert(currentI18n().isInitialized, 'i18n must be initialized before calling `setLanguage`');

    if (currentI18n().language === locale) {
        return;
    }

    await currentI18n().changeLanguage(locale);
}

// Svelte only re-renders the component using the store, when the store is updated.
// Returning an object is a way to force triggering an update.
// TODO(DESK-1081): `i18n` should not be a global, but exposed through `globals`.
export const i18n: IQueryableStore<Pick<i18nType, 't'>> = derive(i18nStore, (updatedI18nStore) => ({
    t: updatedI18nStore.i18n.t,
}));
