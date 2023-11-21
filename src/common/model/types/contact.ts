import type {PublicKey} from '~/common/crypto';
import type {DbContact, DbContactUid, UidOf} from '~/common/db';
import type {
    AcquaintanceLevel,
    ActivityState,
    ContactNotificationTriggerPolicy,
    IdentityType,
    NotificationSoundPolicy,
    ReadReceiptPolicy,
    ReceiverType,
    SyncState,
    TypingIndicatorPolicy,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import type {ControllerUpdateFromSource, LocalModel} from '~/common/model/types/common';
import type {ConversationInitMixin} from '~/common/model/types/conversation';
import type {ReceiverController} from '~/common/model/types/receiver';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {FeatureMask, IdentityString, Nickname} from '~/common/network/types';
import type {StrictExtract, StrictOmit, u8} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {IdColor} from '~/common/utils/id-color';
import type {LocalSetStore} from '~/common/utils/store/set-store';

// Contact
export interface ContactView {
    readonly identity: IdentityString;
    readonly publicKey: PublicKey;
    readonly createdAt: Date;
    readonly firstName: string;
    readonly lastName: string;
    readonly nickname: Nickname | undefined;
    readonly displayName: string;
    readonly initials: string;
    readonly colorIndex: u8;
    readonly color: IdColor;
    readonly verificationLevel: VerificationLevel;
    readonly workVerificationLevel: WorkVerificationLevel;
    readonly identityType: IdentityType;
    readonly acquaintanceLevel: AcquaintanceLevel;
    readonly activityState: ActivityState;
    readonly featureMask: FeatureMask;
    readonly syncState: SyncState;
    readonly typingIndicatorPolicyOverride?: TypingIndicatorPolicy;
    readonly readReceiptPolicyOverride?: ReadReceiptPolicy;
    readonly notificationTriggerPolicyOverride?: {
        readonly policy: ContactNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    readonly notificationSoundPolicyOverride?: NotificationSoundPolicy;
}

export type ContactViewDerivedProperties = StrictExtract<
    keyof ContactView,
    'displayName' | 'initials' | 'color'
>;
export type ContactInit = StrictOmit<ContactView, ContactViewDerivedProperties> &
    ConversationInitMixin;
export type ContactUpdate = Partial<
    StrictOmit<ContactView, ContactViewDerivedProperties | 'identity' | 'publicKey' | 'colorIndex'>
>;

/**
 * Contact model controller.
 */
export type ContactController = ReceiverController & {
    /**
     * View accessor.
     */
    readonly meta: ModelLifetimeGuard<ContactView>;

    /**
     * Update the contact.
     */
    readonly update: ControllerUpdateFromSource<[change: ContactUpdate]>;

    /**
     * Remove the contact and the corresponding conversation, and deactivate the controller.
     */
    readonly remove: Omit<ControllerUpdateFromSource, 'fromRemote'>;

    /**
     * Informs whether a contact can be deleted. Currently a user is only deletable if it does not
     * belong to any active group. This might change with DESK-770.
     */
    readonly isRemovable: () => boolean;
} & ProxyMarked;
export type Contact = LocalModel<
    ContactView,
    ContactController,
    UidOf<DbContact>,
    ReceiverType.CONTACT
>;

export type ContactRepository = {
    /**
     * Add a contact and handle the protocol flow according to the source.
     *
     * @param init The contact data
     */
    readonly add: ControllerUpdateFromSource<[init: ContactInit], LocalModelStore<Contact>>;
    readonly getByUid: (uid: DbContactUid) => LocalModelStore<Contact> | undefined;
    readonly getByIdentity: (identity: IdentityString) => LocalModelStore<Contact> | undefined;
    readonly getAll: () => LocalSetStore<LocalModelStore<Contact>>;
    readonly getOrCreateByIdentity: (identity: IdentityString) => Promise<LocalModelStore<Contact>>;
} & ProxyMarked;
