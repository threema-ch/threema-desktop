/**
 * A function similar to `i18n.t`, which is easier to test.
 */
type I18nTLikeFunction = (
    key: string,
    defaultValue: string,
    options?: Record<string, string>,
) => string;

/**
 * An object with helpers to translate things.
 */
export interface I18nType {
    readonly t: I18nTLikeFunction;
    readonly locale: 'de' | 'en';
}

export type I18nLocales = I18nType['locale'];
