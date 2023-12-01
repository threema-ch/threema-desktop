import type {
    LocaleRecord,
    LocaleType,
    ThemeRecord,
    ThemeType,
} from '~/app/ui/components/partials/settings/internal/appearance-settings/types';
import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';

export function themeLabel(label: ThemeType, i18n: I18nType): string {
    switch (label) {
        case 'light':
            return i18n.t('settings--appearance-settings.label--theme-light', 'Light');
        case 'dark':
            return i18n.t('settings--appearance-settings.label--theme-dark', 'Dark');
        case 'system':
            return i18n.t('settings--appearance-settings.label--theme-system', 'System');
        default:
            return unreachable(label);
    }
}

export function themeDropdown(i18n: I18nType): SettingsDropdown<ThemeRecord, ThemeType, ThemeType> {
    return [
        {
            text: themeLabel('light', i18n),
            value: 'light',
            label: 'light',
        },
        {
            text: themeLabel('dark', i18n),
            value: 'dark',
            label: 'dark',
        },
        {
            text: themeLabel('system', i18n),
            value: 'system',
            label: 'system',
        },
    ];
}

export function localeLabel(label: LocaleType, i18n: I18nType): string {
    switch (label) {
        case 'de':
            return i18n.t('settings--appearance-settings.label--german', 'German');
        case 'en':
            return i18n.t('settings--appearance-settings.label--english', 'English');
        case 'cimode':
            return i18n.t('settings--appearance-settings.label--cimode', 'Translation Mode');
        default:
            return unreachable(label);
    }
}

export function localeDropdown(
    i18n: I18nType,
): SettingsDropdown<LocaleRecord, LocaleType, LocaleType> {
    return [
        {
            text: localeLabel('de', i18n),
            value: 'de',
            label: 'de',
        },
        {
            text: localeLabel('en', i18n),
            value: 'en',
            label: 'en',
        },
        {
            text: localeLabel('cimode', i18n),
            value: 'cimode',
            label: 'cimode',
        },
    ];
}
