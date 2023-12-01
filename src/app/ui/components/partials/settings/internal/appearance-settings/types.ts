import type {LOCALES} from '~/app/ui/i18n';
import type {THEMES} from '~/common/dom/ui/theme';
import type {u53} from '~/common/types';

export type ThemeType = (typeof THEMES)[u53];
/**
 * This is a "dummy type" so that it can be used for the instantiation of the dropdown helpers
 * The reason is that {@link THEMES} is defined as a constant array and not in a settings object
 */
export type ThemeRecord = {
    readonly [P in ThemeType]: string;
};

export type LocaleType = (typeof LOCALES)[u53];
/**
 * This is a "dummy type" so that it can be used for the instantiation of the dropdown helpers
 * The reason is that {@link LOCALES} is defined as a constant array and not in a settings object
 */
export type LocaleRecord = {
    readonly [P in LocaleType]: string;
};
