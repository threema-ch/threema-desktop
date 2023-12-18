import type {SettingsNavItemProps} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/internal/settings-nav-item/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {SettingsCategory} from '~/common/settings';

/**
 * Returns the settings nav items to render (ordered).
 */
export function getSettingsNavItems(
    i18n: I18nType,
): Record<Exclude<SettingsCategory, 'calls' | 'privacy'>, SettingsNavItemProps> {
    return {
        profile: {
            title: i18n.t(`settings.label--profile`, 'Profile'),
            iconName: 'account_circle',
            subtitle: i18n.t('settings--profile.prose--subtitle', 'Threema ID'),
        },
        // Will be added later.
        /*
        privacy: {
            iconName: 'shield',
            subtitle: i18n.t('settings--privacy.prose--subtitle', 'Contacts, Chats, Lists'),
        },
        calls: {
            iconName: 'call',
            subtitle: i18n.t(
                'settings.prose--call-settings',
                'Threema Calls, Video Calls, Group Calls',
            ),
        },
        */
        security: {
            title: i18n.t(`settings.label--security`, 'Security'),
            iconName: 'lock',
            subtitle: i18n.t('settings--security.prose--subtitle', 'Password'),
        },
        appearance: {
            title: i18n.t(`settings.label--appearance`, 'Appearance'),
            iconName: 'palette',
            subtitle: i18n.t(
                'settings--appearance.prose--subtitle',
                'Theme, Language, Hour Format',
            ),
        },
        about: {
            title: i18n.t(`settings.label--about`, 'About'),
            iconName: 'info',
            subtitle: '',
        },
    };
}
