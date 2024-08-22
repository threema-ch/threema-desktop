import type {
    ControllerCustomUpdateFromSource,
    ControllerUpdateFromSource,
    Model,
} from '~/common/model/types/common';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {BlobId} from '~/common/network/protocol/blob';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {IdColor} from '~/common/utils/id-color';

export interface ProfilePictureView {
    readonly color: IdColor;
    readonly picture?: ReadonlyUint8Array;
}
export type ProfilePictureSource =
    | 'contact-defined'
    | 'gateway-defined'
    | 'user-defined'
    | 'admin-defined';
export type ProfilePictureController = {
    readonly meta: ModelLifetimeGuard<ProfilePictureView>;

    /**
     * Update the profile picture from a certain picture `source`.
     */
    readonly setPicture: ControllerCustomUpdateFromSource<
        [profilePicture: ReadonlyUint8Array, source: ProfilePictureSource], // Local
        [profilePicture: ReadonlyUint8Array, source: ProfilePictureSource], // Sync
        [
            // Remote
            profilePicture: {
                readonly bytes: ReadonlyUint8Array;
                readonly blobId: BlobId;
                readonly blobKey: RawBlobKey;
            },
            source: ProfilePictureSource,
        ]
    >;

    /**
     * Remove the profile picture from a certain picture `source`.
     */
    readonly removePicture: ControllerUpdateFromSource<[source: ProfilePictureSource]>;
} & ProxyMarked;
export type ProfilePicture = Model<ProfilePictureView, ProfilePictureController>;
