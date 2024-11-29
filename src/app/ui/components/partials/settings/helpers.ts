import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import type {I18nType} from '~/app/ui/i18n-types';
import type {SettingsCategory} from '~/common/settings';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

/**
 * This functions creates a list of {@link ContextMenuItem}s that can be used for a settings
 * dropdown.
 *
 * @param dropdown A list of dropdown items of the appropriate type.
 * @param handler Handler function to call when a dropdown item is selected.
 * @returns A list of ContextMenuItems.
 */
export function createDropdownItems<
    TSettings,
    TSettingType,
    TUpdateKey extends keyof TSettings | undefined = keyof TSettings,
>(
    dropdown: SettingsDropdown<TSettings, TSettingType, TUpdateKey>,
    handler: (newValue: TSettingType) => void,
): ContextMenuItem[] {
    type DropdownItem = (typeof dropdown.items)[u53];

    return Object.values<DropdownItem>({...dropdown.items}).map((item) => ({
        type: 'option',
        handler: () => handler(item.value),
        icon: item.options?.icon ?? undefined,
        label: item.text,
    }));
}

export function getCategoryTitle(
    currentCategory: Exclude<SettingsCategory, 'calls' | 'privacy'>,
    i18n: I18nType,
): string {
    switch (currentCategory) {
        case 'about':
            return i18n.t('settings--about.label--title', 'About Threema');
        case 'appearance':
            return i18n.t('settings--appearance.label--title', 'Appearance Settings');
        case 'chat':
            return i18n.t('settings--chat.label--title', 'Chat Settings');
        case 'devices':
            return i18n.t('settings--devices.label--title', 'Device Settings');
        case 'media':
            return i18n.t('settings--media.label--title', 'Media & Storage');
        case 'profile':
            return i18n.t('settings--profile.label--title', 'Profile Settings');
        case 'security':
            return i18n.t('settings--security.label--title', 'Security Settings');
        default:
            return unreachable(currentCategory);
    }
}
