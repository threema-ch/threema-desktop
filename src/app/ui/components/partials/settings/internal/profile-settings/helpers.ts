import type {ProfilePictureShareWithOptions} from '~/app/ui/components/partials/settings/internal/profile-settings/types';
import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import type {I18nType} from '~/app/ui/i18n-types';
import type {ProfilePictureShareWith} from '~/common/model/settings/profile';
import type {ProfileSettingsView} from '~/common/model/types/settings';
import type {IdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';

export function profilePictureSharedWithLabel(
    label: ProfilePictureShareWithOptions,
    i18n: I18nType,
): string {
    switch (label) {
        case 'nobody':
            return i18n.t('settings--profile.label--profile-picture-nobody', 'Nobody');

        case 'everyone':
            return i18n.t('settings--profile.label--profile-picture-everyone', 'Everyone');

        case 'allowList':
            return i18n.t('settings--profile.label--profile-picture-selected', 'Selected');

        default:
            return unreachable(label);
    }
}

export function profilePictureShareWithDropdown(
    i18n: I18nType,
    currentAllowList: Readonly<IdentityString[]>,
): SettingsDropdown<ProfileSettingsView, ProfilePictureShareWith> {
    return {
        updateKey: 'profilePictureShareWith',
        items: [
            {
                text: profilePictureSharedWithLabel('everyone', i18n),
                value: {group: 'everyone'},
            },
            {
                text: profilePictureSharedWithLabel('nobody', i18n),
                value: {group: 'nobody'},
            },
            {
                text: profilePictureSharedWithLabel('allowList', i18n),
                value: {group: 'allowList', allowList: currentAllowList},
            },
        ],
    };
}
