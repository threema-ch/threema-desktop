import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import {LOCALES, LOCALE_NAMES, type Locale} from '~/app/ui/i18n';
import type {I18nType} from '~/app/ui/i18n-types';
import type {Theme} from '~/common/dom/ui/theme';
import {unreachable} from '~/common/utils/assert';

/**
 * Returns the corresponding dropdown label for a specific {@link Theme}.
 */
export function getThemeDropdownLabel(theme: Theme, i18n: I18nType): string {
    switch (theme) {
        case 'light':
            return i18n.t('settings--appearance.label--theme-light', 'Light');
        case 'dark':
            return i18n.t('settings--appearance.label--theme-dark', 'Dark');
        case 'system':
            return i18n.t('settings--appearance.label--theme-system', 'System');
        default:
            return unreachable(theme);
    }
}

/**
 * Returns a {@link SettingsDropdown} spec for the theme dropdown.
 */
export function getThemeDropdown(
    i18n: I18nType,
): SettingsDropdown<Record<Theme, string>, Theme, undefined> {
    return {
        updateKey: undefined,
        items: [
            {
                text: getThemeDropdownLabel('light', i18n),
                value: 'light',
            },
            {
                text: getThemeDropdownLabel('dark', i18n),
                value: 'dark',
            },
            {
                text: getThemeDropdownLabel('system', i18n),
                value: 'system',
            },
        ],
    };
}

/**
 * Returns the corresponding dropdown label for a specific {@link Locale}.
 */
export function getLocaleDropdownLabel(locale: Locale): string {
    return LOCALE_NAMES[locale];
}

/**
 * Returns a {@link SettingsDropdown} spec for the theme dropdown.
 */
export function getLocaleDropdown(): SettingsDropdown<Record<Locale, string>, Locale, undefined> {
    return {
        updateKey: undefined,
        items: LOCALES.map((locale) => ({
            text: getLocaleDropdownLabel(locale),
            value: locale,
        })),
    };
}
