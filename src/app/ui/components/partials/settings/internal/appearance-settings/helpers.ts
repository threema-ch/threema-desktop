import type {
    LocaleRecord,
    LocaleType,
    ThemeRecord,
    ThemeType,
} from '~/app/ui/components/partials/settings/internal/appearance-settings/types';
import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import {LOCALES, LOCALE_NAMES} from '~/app/ui/i18n';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';

export function themeLabel(label: ThemeType, i18n: I18nType): string {
    switch (label) {
        case 'light':
            return i18n.t('settings--appearance.label--theme-light', 'Light');
        case 'dark':
            return i18n.t('settings--appearance.label--theme-dark', 'Dark');
        case 'system':
            return i18n.t('settings--appearance.label--theme-system', 'System');
        default:
            return unreachable(label);
    }
}

export function themeDropdown(i18n: I18nType): SettingsDropdown<ThemeRecord, ThemeType, undefined> {
    return {
        updateKey: undefined,
        items: [
            {
                text: themeLabel('light', i18n),
                value: 'light',
            },
            {
                text: themeLabel('dark', i18n),
                value: 'dark',
            },
            {
                text: themeLabel('system', i18n),
                value: 'system',
            },
        ],
    };
}

/**
 * Return the label corresponding to the specified {@link LocaleType}.
 */
export function localeLabel(locale: LocaleType): string {
    return LOCALE_NAMES[locale];
}

export function localeDropdown(): SettingsDropdown<LocaleRecord, LocaleType, undefined> {
    return {
        updateKey: undefined,
        items: LOCALES.map((locale) => ({
            text: localeLabel(locale),
            value: locale,
        })),
    };
}
