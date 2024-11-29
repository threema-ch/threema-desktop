import type {ProfileSettingsView} from '~/common/model/types/settings';

/**
 * This function strips the {@link ProfileSettingsView} of the profile picture so that it is not
 * unnecessarily transferred. To access the profile picture bytes in the frontend, there is a
 * separate view model.
 */
export function getProfileSettingsData(
    profileSettingsView: ProfileSettingsView,
): Omit<ProfileSettingsView, 'profilePicture'> {
    return {
        profilePictureShareWith: profileSettingsView.profilePictureShareWith,
        nickname: profileSettingsView.nickname,
    };
}
