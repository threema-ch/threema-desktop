import type {
    AppearanceSettingsUpdate,
    CallsSettingsUpdate,
    ChatSettingsUpdate,
    DevicesSettingsUpdate,
    MediaSettingsUpdate,
    PrivacySettingsUpdate,
    ProfileSettingsUpdate,
} from '~/common/model/types/settings';
import type {SettingsCategory} from '~/common/settings';

type UpdateableSettingsCategory = Exclude<SettingsCategory, 'about' | 'security'>;

type SettingsUpdateOf<TCategory extends UpdateableSettingsCategory> = {
    readonly ['appearance']: AppearanceSettingsUpdate;
    readonly ['calls']: CallsSettingsUpdate;
    readonly ['chat']: ChatSettingsUpdate;
    readonly ['devices']: DevicesSettingsUpdate;
    readonly ['media']: MediaSettingsUpdate;
    readonly ['privacy']: PrivacySettingsUpdate;
    // The profile picture needs separate handling.
    readonly ['profile']: Omit<ProfileSettingsUpdate, 'profilePicture'>;
}[TCategory];

export type SettingsPageUpdate = {
    readonly [TType in UpdateableSettingsCategory]: {
        readonly update: SettingsUpdateOf<TType>;
        readonly type: TType;
    };
}[UpdateableSettingsCategory];
