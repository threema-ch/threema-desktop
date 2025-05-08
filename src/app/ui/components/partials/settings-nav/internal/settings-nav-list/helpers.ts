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
            title: i18n.t('settings.label--profile', 'Profile'),
            iconName: 'account_circle',
            subtitle: i18n.t('settings--profile.prose--subtitle', '{shortAppName} ID', {
                shortAppName: import.meta.env.SHORT_APP_NAME,
            }),
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
                '{shortAppName} Calls, Video Calls, Group Calls',             {
              shortAppName: import.meta.env.SHORT_APP_NAME,
            },
            ),
        },
        */
        security: {
            title: i18n.t('settings.label--security', 'Security'),
            iconName: 'lock',
            subtitle: i18n.t('settings--security.prose--subtitle', 'Password'),
        },
        devices: {
            title: i18n.t('settings.label--devices', 'Devices'),
            iconName: 'computer',
            subtitle: i18n.t(
                'settings--devices.prose--subtitle',
                'Devices linked to your {shortAppName} ID',
                {
                    shortAppName: import.meta.env.SHORT_APP_NAME,
                },
            ),
        },
        appearance: {
            title: i18n.t('settings.label--appearance', 'Appearance'),
            iconName: 'palette',
            subtitle: i18n.t(
                'settings--appearance.prose--subtitle',
                'Theme, language, hour format',
            ),
        },
        chat: {
            title: i18n.t('settings.label--chat', 'Chat'),
            iconName: 'forum',
            subtitle: i18n.t('settings--chat.prose--subtitle', 'Keyboard'),
        },
        media: {
            title: i18n.t('settings.label--media', 'Media & Storage'),
            iconName: 'image',
            subtitle: i18n.t('settings--media.prose--subtitle', 'Automatically download media'),
        },
        about: {
            title: i18n.t('settings.label--about', 'About {shortAppName}', {
                shortAppName: import.meta.env.SHORT_APP_NAME,
            }),
            iconName: 'info',
            subtitle: '',
        },
    };
}
