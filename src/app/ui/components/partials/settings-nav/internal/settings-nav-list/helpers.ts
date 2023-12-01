import type {SettingsInformationMap} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/types';
import type {I18nType} from '~/app/ui/i18n-types';

/**
 * This function returns the information that is displayed in the navbar
 * It also defined the order in which these are displayed
 */
export function getSettingsInformationMap(
    i18n: I18nType,
): Omit<SettingsInformationMap, 'calls' | 'privacy'> {
    return {
        profile: {
            title: i18n.t(`settings.label--profile`, 'Profile'),
            icon: 'account_circle',
            subText: i18n.t('settings--profile-settings.prose--subtitle', 'Threema ID'),
        },

        // Will be added later
        /*
        privacy: {
            icon: 'shield',
            subText: i18n.t('settings--privacy-settings.prose--subtitle', 'Contacts, Chats, Lists'),
        },
        calls: {
            icon: 'call',
            subText: i18n.t(
                'settings.prose--call-settings',
                'Threema Calls, Video Calls, Group Calls',
            ),
        },
        */
        security: {
            title: i18n.t(`settings.label--security`, 'Security'),
            icon: 'lock',
            subText: i18n.t('settings--security-settings.prose--subtitle', 'Password'),
        },
        appearance: {
            title: i18n.t(`settings.label--appearance`, 'Appearance'),
            icon: 'palette',
            subText: i18n.t(
                'settings--appearance-settings.prose--subtitle',
                'Theme, Language, Hour Format',
            ),
        },
        about: {
            title: i18n.t(`settings.label--about`, 'About'),
            icon: 'info',
            subText: '',
        },
    };
}
