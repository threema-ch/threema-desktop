// SOURCE: https://github.com/i18next/i18next/issues/1901

import i18next, {type i18n as I18nextType} from 'i18next';
import ICU from 'i18next-icu';

import type {I18nType} from '~/app/ui/i18n-types';
import type {LoggerFactory, LogRecordFn} from '~/common/logging';
import type {StrictPartial, u53} from '~/common/types';
import {assertUnreachable} from '~/common/utils/assert';
import {keys} from '~/common/utils/object';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import translationDeRendezvousEmojiJson from '~/translations/de/rendezvous-emoji.json';
import translationDeMainJson from '~/translations/de/translation.json';
import translationEnRendezvousEmojiJson from '~/translations/en/rendezvous-emoji.json';
import translationEnMainJson from '~/translations/en/translation.json';

// Merge translation files
const translationDeJson = {...translationDeMainJson, ...translationDeRendezvousEmojiJson};
const translationEnJson = {...translationEnMainJson, ...translationEnRendezvousEmojiJson};

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

type OptionalTranslationTopicModifier = 'dialog' | 'settings';

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
const translationDe: StrictPartial<typeof translationDeJson, BaseTranslationNamespace> =
    translationDeJson;

// Consider keeping the locales in sync in the config/i18next-parser.config.js file.
export const resources = {
    de: {translation: translationDe},
    en: {translation: translationEn},
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

/**
 * Mapping from locale identifier to name in that language.
 */
export const LOCALE_NAMES: {[Locale in keyof typeof resources]: string} & {
    readonly cimode: string;
} = {
    cimode: 'Translation Mode',
    de: 'Deutsch',
    en: 'English',
};

export type Locale = (typeof LOCALES)[u53];

const FALLBACK_LOCALE: Locale = 'en' as const;

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

    // TODO(DESK-1122): This is somewhat naive. Use a more intelligent algorithm.
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

// Returning an object `{i18n: i18nextType}` instead of directly `i18n: i18nextType` is a way to force
// triggering an update.
function createI18nStore(i18n: I18nextType): WritableStore<{i18n: I18nextType}> {
    const i18nStore = new WritableStore<{i18n: I18nextType}>({i18n});

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

export async function initialize(config: LocaleConfig): Promise<void> {
    const log = config.logging.logger('i18n');
    const i18n = i18nStore.get().i18n;

    if (i18n.isInitialized) {
        log.warn('Already initialized');
        return;
    }

    log.info('Initializing...', {config});

    await i18n
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
        });

    log.info('Initialization complete', {
        language: i18n.language,
        resolvedLanguage: i18n.resolvedLanguage,
        loadedLanguages: i18n.languages,
    });

    // Note: We can ignore the unsubscriber because we will maintain a global reference to the store
    config.localeStore.subscribe((locale) => {
        if (isLocale(locale)) {
            if (i18n.language === locale) {
                return;
            }
            i18n.changeLanguage(locale).catch(assertUnreachable);
        }
    });
}

// Svelte only re-renders the component using the store, when the store is updated.
// Returning an object is a way to force triggering an update.
//
// TODO(DESK-1081): `i18n` should not be a global, but exposed through `globals`.
export type I18n = Pick<I18nextType, 't'> & Omit<I18nType, 't'>;
export const i18n: IQueryableStore<I18n> = derive(
    [i18nStore],
    ([{currentValue: updatedI18nStore}]) => {
        const locale = ensureLocale(updatedI18nStore.i18n.resolvedLanguage);

        return {
            t: updatedI18nStore.i18n.t,
            locale: locale === 'cimode' ? 'en' : locale,
        };
    },
);
