import {type ProfilePictureView} from '~/common/model/types/profile-picture';
import {
    type CallsSettings,
    type PrivacySettings,
    type ProfileSettings,
} from '~/common/model/types/settings';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type IdentityString} from '~/common/network/types';
import {type ProxyMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';

export type User = {
    readonly identity: IdentityString;
    readonly displayName: LocalStore<string>;
    readonly profilePicture: LocalStore<ProfilePictureView>;
    readonly profileSettings: LocalModelStore<ProfileSettings>;
    readonly privacySettings: LocalModelStore<PrivacySettings>;
    readonly callsSettings: LocalModelStore<CallsSettings>;
} & ProxyMarked;
