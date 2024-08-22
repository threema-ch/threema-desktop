import {ensurePublicKey, type PublicKey} from '~/common/crypto';
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
import type {ModelStore} from '~/common/model/utils/model-store';
import type {FeatureMask, IdentityString, Nickname} from '~/common/network/types';
import type {StrictExtract, StrictOmit, u8} from '~/common/types';
import {hexToBytes} from '~/common/utils/byte';
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
    readonly add: ControllerUpdateFromSource<[init: ContactInit], ModelStore<Contact>>;
    readonly getByUid: (uid: DbContactUid) => ModelStore<Contact> | undefined;
    readonly getByIdentity: (identity: IdentityString) => ModelStore<Contact> | undefined;
    readonly getAll: () => LocalSetStore<ModelStore<Contact>>;
    readonly getOrCreatePredefinedContact: (
        identity: PredefinedContactIdentity,
    ) => Promise<ModelStore<Contact>>;
} & ProxyMarked;

/**
 * List of predefined contacts by Threema.
 */
export const PREDEFINED_CONTACTS = {
    /* eslint-disable @typescript-eslint/naming-convention */
    '*SUPPORT': {
        name: 'Threema Support',
        publicKey: ensurePublicKey(
            hexToBytes('0f944d18324b2132c61d8e40afce60a0ebd701bb11e89be94972d4229e94722a'),
        ),
        visibleInContactList: true,
    },
    '*THREEMA': {
        name: 'Threema Channel',
        publicKey: ensurePublicKey(
            hexToBytes('3a38650c681435bd1fb8498e213a2919b09388f5803aa44640e0f706326a865c'),
        ),
        visibleInContactList: true,
    },
    '*MY3DATA': {
        name: 'My Threema Data',
        publicKey: ensurePublicKey(
            hexToBytes('3b01854f24736e2d0d2dc387eaf2c0273c5049052147132369bf3960d0a0bf02'),
        ),
        visibleInContactList: true,
    },
    '*3MAPUSH': {
        name: 'Threema Push',
        publicKey: ensurePublicKey(
            hexToBytes('fd711e1a0db0e2f03fcaab6c43da2575b9513664a62a12bd0728d87f7125cc24'),
        ),
        visibleInContactList: false,
    },
    /* eslint-enable @typescript-eslint/naming-convention */
} as const;

export type PredefinedContactIdentity = keyof typeof PREDEFINED_CONTACTS;

/**
 * Return whether the specified identity is a {@link PredefinedContactIdentity}.
 */
export function isPredefinedContact(identity: string): identity is PredefinedContactIdentity {
    return Object.keys(PREDEFINED_CONTACTS).includes(identity);
}
