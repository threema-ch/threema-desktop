/**
 * Main model types.
 *
 * For every entity, there are a few different types. For example, for a contact:
 *
 * - The `ContactView` interface contains the "actual model fields"
 * - The `ContactController` defines methods to work with a contact's data, e.g. to get a related conversation
 * - The `Contact` type ties the view to a controller and makes it a `LocalModel`
 * - The `ContactInit` type contains all fields of `ContactView` that are not generated
 *   automatically by the storage backend (e.g. `createdAt` timestamps or auto-incrementing values),
 *   it is used to create a new contact
 * - The `ContactListController` defines methods that can be used on lists of contact models
 * - The `Contacts` type is an entry point that is used to insert, list and retrieve contact models
 */
import {type ServicesForBackend} from '~/common/backend';
import {type PublicKey} from '~/common/crypto';
import {
    type DatabaseBackend,
    type DbContact,
    type DbContactUid,
    type DbConversation,
    type DbGroup,
    type DbGroupUid,
    type DbReceiverLookup,
    type DbTable,
} from '~/common/db';
import {
    type AcquaintanceLevel,
    type ActivityState,
    type BlobDownloadState,
    type ContactNotificationTriggerPolicy,
    type ConversationCategory,
    type ConversationVisibility,
    type GlobalPropertyKey,
    type GroupNotificationTriggerPolicy,
    type GroupUserState,
    type IdentityType,
    type MessageDirection,
    type MessageReaction,
    type MessageType,
    type NotificationSoundPolicy,
    type ReceiverType,
    type SyncState,
    type VerificationLevel,
    type WorkVerificationLevel,
} from '~/common/enum';
import {type FileEncryptionKey, type FileId} from '~/common/file-storage';
import {type ProfilePictureShareWith} from '~/common/model/settings/profile';
import {type ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {type LocalModelStore, type RemoteModelStore} from '~/common/model/utils/model-store';
import {type BlobId} from '~/common/network/protocol/blob';
import {type ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {type TaskManager} from '~/common/network/protocol/task/manager';
import {
    type ConversationId,
    type FeatureMask,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {type RawBlobKey} from '~/common/network/types/keys';
import {type NotificationTag} from '~/common/notification';
import {
    type i53,
    type PickKeysForType,
    type ReadonlyUint8Array,
    type u8,
    type u53,
} from '~/common/types';
import {type ProxyMarked, type RemoteProxy} from '~/common/utils/endpoint';
import {type IdColor} from '~/common/utils/id-color';
import {type SequenceNumberU53} from '~/common/utils/sequence-number';
import {type LocalStore} from '~/common/utils/store';
import {type LocalSetStore, type RemoteSetStore} from '~/common/utils/store/set-store';
import {type MessageStatus} from '~/common/viewmodel/types';

/**
 * Services required by the model backend.
 */
export type ServicesForModel = Pick<
    ServicesForBackend,
    | 'blob'
    | 'config'
    | 'crypto'
    | 'device'
    | 'directory'
    | 'endpoint'
    | 'file'
    | 'logging'
    | 'model'
    | 'notification'
    | 'systemDialog'
    | 'timer'
> & {
    readonly db: DatabaseBackend;
    readonly taskManager: Pick<TaskManager, 'schedule'>;
};

/**
 * Strip all non-data from an interface (functions).
 */
export type DataOf<T> = Omit<
    T,
    PickKeysForType<
        T,
        // eslint-disable-next-line @typescript-eslint/ban-types
        Function | ProxyMarked
    >
>;

/**
 * UID pick of a table.
 */
export interface PickUid<T extends DbTable, O = undefined> {
    readonly uid: T['uid'] | O;
}

/**
 * Extract the UID type from a table.
 */
export type UidOf<T extends DbTable> = T['uid'];

/**
 * A handle to the controller's associated store, guarded by the {@link ModelLifetimeGuard}.
 *
 * IMPORTANT: Only valid while running within a {@link ModelLifetimeGuard} executor. Async executors
 *            are **not** allowed!
 */
export interface GuardedStoreHandle<TView> {
    /**
     * Get the current view of the associated store's model.
     */
    readonly view: () => Readonly<TView>;

    /**
     * Alias to {@link ModelLifetimeGuard.update}.
     */
    readonly update: (fn: (view: Readonly<TView>) => Partial<TView>) => void;
}

/**
 * A local model controller.
 */
export type LocalModelController<TView> = {
    readonly meta: ModelLifetimeGuard<TView>;
} & ProxyMarked;

/**
 * A remote controller of a model.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RemoteModelController<TLocalController extends LocalModelController<any>> = RemoteProxy<
    Omit<Readonly<TLocalController>, 'meta'>
>;

/**
 * A model where the controller lives on the local side.
 *
 * IMPORTANT: Because the {@link view} property is replaced on each update, this object should not
 *            be forward to other functions. Either forward the associated {@link LocalModelStore}
 *            **or** the current {@link view} snapshot.
 */
export interface LocalModel<
    TView,
    TController extends LocalModelController<TView>,
    TCtx = undefined,
    TType = undefined,
> {
    /**
     * Current data of the model. Must be structurally cloneable. This is the only field that will
     * be **replaced with another object** in case it is being updated.
     */
    readonly view: Readonly<TView>;

    /**
     * Methods available on the model. The controller is a proxy when used by another endpoint.
     */
    readonly controller: TController;

    /**
     * Arbitrary context data. May be used for matching.
     */
    readonly ctx: TCtx;

    /**
     * Concrete type. Should only be used for matching.
     */
    readonly type: TType;
}

/**
 * A model where the controller lives on the remote side.
 */
export interface RemoteModel<
    TView,
    TRemoteController extends RemoteModelController<LocalModelController<TView>>,
    TCtx = undefined,
    TType = undefined,
> {
    readonly view: Readonly<TView>;
    readonly controller: TRemoteController;
    readonly ctx: TCtx;
    readonly type: TType;
}

/**
 * Helper type to infer type parameters for a local model.
 */
export type LocalModelFor<T> = T extends LocalModel<
    infer TView,
    infer TController,
    infer TCtx,
    infer TType
>
    ? LocalModel<TView, TController, TCtx, TType>
    : never;

/**
 * Map a local model type to its remote model type.
 */
export type RemoteModelFor<T> = T extends LocalModel<
    infer TView,
    infer TLocalController,
    infer TCtx,
    infer TType
>
    ? RemoteModel<TView, RemoteModelController<TLocalController>, TCtx, TType>
    : never;

/**
 * Map a local model store type to its remote model store type.
 */
export type RemoteModelStoreFor<T> = T extends LocalModelStore<
    infer TModel,
    infer TView,
    infer TLocalController,
    infer TCtx,
    infer TType
>
    ? RemoteModelStore<TModel, TView, TLocalController, TCtx, TType>
    : never;

/* eslint-disable @typescript-eslint/no-invalid-void-type */
export type ControllerUpdateFromSource<
    TParams extends readonly unknown[] = [],
    TReturn = void,
> = ControllerCustomUpdateFromSource<TParams, TParams, TParams, TReturn>;

export type ControllerCustomUpdateFromSource<
    TParamsFromLocal extends readonly unknown[] = [],
    TParamsFromSync extends readonly unknown[] = [],
    TParamsFromRemote extends readonly unknown[] = [],
    TReturn = void,
> = {
    /**
     * Update from local source (e.g. nickname change due to user interaction).
     */
    readonly fromLocal: (...params: TParamsFromLocal) => Promise<TReturn>;

    /**
     * Update from another linked device (e.g. reflected nickname change).
     */
    readonly fromSync: (...params: TParamsFromSync) => TReturn;

    /**
     * Update from other identity (e.g. being removed from a group).
     */
    readonly fromRemote: (
        handle: ActiveTaskCodecHandle<'volatile'>,
        ...params: TParamsFromRemote
    ) => Promise<TReturn>;
} & ProxyMarked;
/* eslint-enable @typescript-eslint/no-invalid-void-type */

export type ControllerUpdateFromLocal<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdateFromSource<TParams, TReturn>, 'fromLocal'>;

export type ControllerUpdateFromRemote<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdateFromSource<TParams, TReturn>, 'fromRemote'>;

export type ControllerUpdateFromSync<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdateFromSource<TParams, TReturn>, 'fromSync'>;

// Profile picture
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
export type ProfilePicture = LocalModel<ProfilePictureView, ProfilePictureController>;

// Profile Settings

// Note: Type must be compatible with common.settings.ProfileSettings
export interface ProfileSettingsView {
    readonly nickname?: Nickname | undefined;
    readonly profilePicture?: ReadonlyUint8Array;
    readonly profilePictureShareWith: ProfilePictureShareWith;
}
export type ProfileSettingsUpdate = Partial<ProfileSettingsView>;
export type ProfileSettingsController = {
    readonly meta: ModelLifetimeGuard<ProfileSettingsView>;
    readonly update: (change: ProfileSettingsUpdate) => void;
} & ProxyMarked;
export type ProfileSettings = LocalModel<ProfileSettingsView, ProfileSettingsController>;

// Global Properties

/**
 * Mapping of GlobalProperty Keys to decoded Value Types.
 */
export interface GlobalPropertyValues extends Record<GlobalPropertyKey, unknown> {
    readonly lastMediatorConnection: {readonly date?: Date | undefined};
}

export type IGlobalPropertyRepository = {
    /**
     * Create a system property with a certain value corresponding to the key-value type mapping in
     * {@link GlobalPropertyValues}. Note that the property must not yet exist.
     *
     * @param init The system property data
     * @throws Error if property already exists.
     */
    readonly create: <K extends GlobalPropertyKey>(
        key: K,
        value: GlobalPropertyValues[K],
    ) => LocalModelStore<IGlobalPropertyModel<K>>;

    /**
     * Create a system property with a certain value corresponding to the key-value type mapping in
     * {@link GlobalPropertyValues}. Note that the property may already exist and will be
     * overwritten.
     *
     * @param init The system property data
     */
    readonly createOrUpdate: <K extends GlobalPropertyKey>(
        key: K,
        value: GlobalPropertyValues[K],
    ) => LocalModelStore<IGlobalPropertyModel<K>>;

    /**
     * Get a system property, if it exists.
     *
     * @param init The system property data
     */
    readonly get: <K extends GlobalPropertyKey>(
        key: K,
    ) => LocalModelStore<IGlobalPropertyModel<K>> | undefined;

    /**
     * Get a system property or create one with the default value if it does not yet exist.
     *
     * @param init The system property data
     */
    readonly getOrCreate: <K extends GlobalPropertyKey>(
        key: K,
        defaultValue: GlobalPropertyValues[K],
    ) => LocalModelStore<IGlobalPropertyModel<K>>;
} & ProxyMarked;
export interface GlobalPropertyView<K extends GlobalPropertyKey> {
    readonly key: K;
    readonly value: GlobalPropertyValues[K];
}
export type GlobalPropertyInit<K extends GlobalPropertyKey> = GlobalPropertyView<K>;
export type GlobalPropertyUpdate<K extends GlobalPropertyKey> = Omit<GlobalPropertyView<K>, 'key'>;
export type IGlobalPropertyController<K extends GlobalPropertyKey> = {
    readonly meta: ModelLifetimeGuard<GlobalPropertyView<K>>;
    readonly update: (change: GlobalPropertyUpdate<K>) => void;
} & ProxyMarked;
export type IGlobalPropertyModel<K extends GlobalPropertyKey> = LocalModel<
    GlobalPropertyView<K>,
    IGlobalPropertyController<K>,
    K
>;

// User

export type User = {
    readonly identity: IdentityString;
    readonly displayName: LocalStore<string>;
    readonly profilePicture: LocalStore<ProfilePictureView>;
    readonly profileSettings: LocalModelStore<ProfileSettings>;
} & ProxyMarked;

// Receiver

interface ReceiverController {
    /** Unique notification tag. */
    readonly notificationTag: NotificationTag;

    /**
     * The receiver's associated profile picture store.
     */
    readonly profilePicture: LocalModelStore<ProfilePicture>;

    /**
     * Get the receiver's associated conversation.
     */
    readonly conversation: () => LocalModelStore<Conversation>;
}

// Conversation
export interface ConversationInitMixin {
    readonly lastUpdate?: Date;
    readonly category: ConversationCategory;
    readonly visibility: ConversationVisibility;
}

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
    readonly verificationLevel: VerificationLevel;
    readonly workVerificationLevel: WorkVerificationLevel;
    readonly identityType: IdentityType;
    readonly acquaintanceLevel: AcquaintanceLevel;
    readonly activityState: ActivityState;
    readonly featureMask: FeatureMask;
    readonly syncState: SyncState;
    // TODO(DESK-687): Read receipt policy override
    // TODO(DESK-687): Typing indicator policy override
    readonly notificationTriggerPolicyOverride?: {
        readonly policy: ContactNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    readonly notificationSoundPolicyOverride?: NotificationSoundPolicy;
}
export type ContactInit = Omit<ContactView, 'displayName' | 'initials'> & ConversationInitMixin;
export type ContactUpdate = Partial<
    Omit<ContactView, 'identity' | 'publicKey' | 'displayName' | 'initials' | 'colorIndex'>
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
} & ProxyMarked;

// Distribution list

export interface DistributionListView {
    readonly stub: 'TODO(DESK-236)';
}
type DistributionListController = ReceiverController & {
    readonly meta: ModelLifetimeGuard<DistributionListView>;
} & ProxyMarked;
export type DistributionList = LocalModel<
    DistributionListView,
    DistributionListController,
    undefined,
    ReceiverType.DISTRIBUTION_LIST
>;

// Group

export interface GroupView {
    readonly groupId: GroupId;
    readonly creatorIdentity: IdentityString;
    readonly createdAt: Date;
    readonly name: string;
    readonly displayName: string;
    readonly colorIndex: u8;
    readonly userState: GroupUserState;
    readonly notificationTriggerPolicyOverride?: {
        readonly policy: GroupNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    readonly notificationSoundPolicyOverride?: NotificationSoundPolicy;
    readonly members: IdentityString[];
}
export type GroupInit = Omit<GroupView, 'displayName' | 'members'> & ConversationInitMixin;
export type GroupUpdate = Partial<
    Omit<
        GroupView,
        'groupId' | 'creatorIdentity' | 'createdAt' | 'displayName' | 'colorIndex' | 'members'
    >
>;
export type GroupUpdateFromLocal = Pick<
    GroupUpdate,
    'notificationTriggerPolicyOverride' | 'notificationSoundPolicyOverride'
>;
/**
 * Group update that may be processed from/to the other devices to/from the local device via group sync.
 */
export type GroupUpdateFromToSync = Pick<
    GroupUpdate,
    'notificationTriggerPolicyOverride' | 'notificationSoundPolicyOverride'
> & {profilePictureAdminDefined?: ReadonlyUint8Array};

export type GroupController = ReceiverController & {
    readonly meta: ModelLifetimeGuard<GroupView>;

    /**
     * Manage group members.
     */
    readonly members: GroupMemberController;

    /**
     * Update group properties that only come from a sync or only trigger a sync.
     */
    readonly update: ControllerUpdateFromSync<[update: GroupUpdateFromToSync]> &
        ControllerUpdateFromLocal<[update: GroupUpdateFromLocal]>;

    /**
     * Update update a group's name.
     */
    readonly name: ControllerUpdateFromSource<[name: string]>;

    /**
     * Remove the group and the corresponding conversation, and deactivate the controller. In case
     * the remove is called locally, sync the update to other devices.
     *
     * fromLocal returns a promise that will be resolved if the group was successfully removed by
     * this or another device. It will be rejected with an error if removing failed.
     */
    readonly remove: Omit<ControllerUpdateFromSource, 'fromRemote'>;

    /**
     * Mark group membership as {@link GroupUserState.KICKED}. This means that we were removed from
     * the group by the creator.
     */
    readonly kick: Omit<ControllerUpdateFromSource, 'fromLocal'>;

    /**
     * Mark group membership as {@link GroupUserState.LEFT}. This means that we left the group.
     */
    readonly leave: Omit<ControllerUpdateFromSource, 'fromRemote'>;

    /**
     * Dissolve a group that we created.
     */
    readonly dissolve: Omit<ControllerUpdateFromSource, 'fromLocal' | 'fromRemote'>;

    /**
     * Mark group membership as {@link GroupUserState.MEMBER}. This means that we were added to the
     * group by the creator.
     */
    readonly join: Omit<ControllerUpdateFromSource, 'fromLocal'>;
} & ProxyMarked;
export interface GroupControllerHandle {
    /**
     * UID of the group.
     */
    readonly uid: UidOf<DbGroup>;

    /**
     * Debug string of the group.
     */
    readonly debugString: string;

    /**
     * Group version counter that should be incremented for every group update.
     */
    readonly version: SequenceNumberU53<u53>;
}

export type Group = LocalModel<GroupView, GroupController, UidOf<DbGroup>, ReceiverType.GROUP>;

export type GroupMemberController = {
    /**
     * Return whether the specified contact is part of the member list.
     */
    readonly has: (contactUid: DbContactUid) => boolean;

    /**
     * Add multiple members to a group.
     * Triggered by interaction locally on this client.
     *
     * @throws if group or contact does not exist
     */
    readonly add: ControllerUpdateFromLocal<[contactUids: DbContactUid[]]>;

    /**
     * Remove multiple members from the group. Return the number of members that were actually
     * removed.
     */
    readonly remove: ControllerUpdateFromSource<[contactUids: DbContactUid[]], u53>;

    /**
     * Set member list to a specific state.
     * Triggered by synchronization.
     * Triggered by a remote update.
     *
     * This updates the differences in the database.
     */
    readonly set: Omit<ControllerUpdateFromSource<[contactUids: DbContactUid[]]>, 'fromLocal'>;

    /**
     * Return list of unique member identities (excluding the current user).
     */
    readonly identities: () => IdentityString[];
} & ProxyMarked;

/**
 * Groups storage
 */
export type GroupRepository = {
    /**
     * Add a group and handle the protocol flow according to the source.
     *
     * @param init The group data
     * @param members The members list (including the creator)
     * TODO(DESK-558): Handle the member list with models.
     */
    readonly add: ControllerUpdateFromSource<
        [init: GroupInit, members: DbContactUid[]],
        LocalModelStore<Group>
    >;
    readonly getByUid: (uid: DbGroupUid) => LocalModelStore<Group> | undefined;
    readonly getByGroupIdAndCreator: (
        groupId: GroupId,
        creator: IdentityString,
    ) => LocalModelStore<Group> | undefined;
    readonly getAll: () => LocalSetStore<LocalModelStore<Group>>;
} & ProxyMarked;

// Conversation

export type AnyReceiver = Contact | DistributionList | Group;
export type AnyReceiverStore =
    | LocalModelStore<Contact>
    | LocalModelStore<DistributionList>
    | LocalModelStore<Group>;

/**
 * Maximum text length to be applied to message previews.
 */
export const PREVIEW_MESSAGE_MAX_TEXT_LENGTH = 64;
interface CommonConversationPreviewMessageView<TDirection extends MessageDirection> {
    /**
     * Message direction.
     */
    readonly direction: TDirection;
    /**
     * Message type.
     */
    readonly type: MessageType;
    /**
     * Message preview text. Should be shortened for performance.
     */
    readonly text?: string;
    /**
     * When the message was last updated in a relevant manner, concretely...
     *
     * For outbound messages:
     *
     * - When the message was created.
     * - When the message has been reflected to other devices / by another device / delivered to the
     *   server.
     * - When the message was read by the recipient.
     *
     * For inbound messages:
     *
     * - When the message was created.
     */
    readonly updatedAt: Date;
    /**
     * Current status of the message.
     */
    readonly status: MessageStatus;
    /**
     * Reaction towards the message.
     */
    readonly reaction?: MessageReaction;
}
export type InboundConversationPreviewMessageView =
    CommonConversationPreviewMessageView<MessageDirection.INBOUND>;
export type OutboundConversationPreviewMessageView =
    CommonConversationPreviewMessageView<MessageDirection.OUTBOUND> & {
        /**
         * Whether the message is a draft.
         */
        readonly draft: boolean;
    };
export type AnyConversationPreviewMessageView =
    | InboundConversationPreviewMessageView
    | OutboundConversationPreviewMessageView;

export interface ConversationView {
    // TODO(DESK-611): Remove type from ConversationView and get it from the new ConversationViewModel
    readonly type: ReceiverType;
    readonly lastUpdate?: Date;
    readonly unreadMessageCount: u53;
    readonly category: ConversationCategory;
    readonly visibility: ConversationVisibility;
}
export type ConversationInit = Omit<ConversationView, 'type'>;
export type ConversationUpdate = Partial<Omit<ConversationView, 'unreadMessageCount' | 'type'>>;
/**
 * Conversation update that may be processed from/to the other devices to/from the local device via D2D sync.
 */
export type ConversationUpdateFromToSync = Pick<ConversationUpdate, 'category' | 'visibility'>;
export type ConversationController = {
    readonly uid: UidOf<DbConversation>;
    readonly meta: ModelLifetimeGuard<ConversationView>;
    readonly receiver: () => AnyReceiverStore;
    readonly preview: () => LocalStore<AnyConversationPreviewMessageView | undefined>;
    /**
     * Update a conversation.
     *
     * If {@link unreadMessageCountDelta} is set, the unread message count will be incremented or
     * decremented by the specified amount. Note that the unread message count can never go below 0.
     */
    readonly update: (change: ConversationUpdate, unreadMessageCountDelta?: i53) => void;
    /**
     * Add a new message to this conversation.
     *
     * The message will be stored in the database. If `source` is `TriggerSource.LOCAL`, the
     * outgoing message task will be triggered.
     */
    readonly addMessage: ControllerCustomUpdateFromSource<
        [init: DirectedMessageFor<MessageDirection.OUTBOUND, MessageType, 'init'>],
        [init: DirectedMessageFor<MessageDirection, MessageType, 'init'>],
        [init: DirectedMessageFor<MessageDirection.INBOUND, MessageType, 'init'>],
        AnyMessageModelStore
    >;
    /**
     * Remove a message from this conversation.
     *
     * The message will be only removed from the device where the action is executed. I.e. this
     * action is not reflected.
     */
    readonly removeMessage: ControllerUpdateFromLocal<[uid: MessageId]>;
    /**
     * Remove all message from this conversation, i.e. empty the conversation.
     *
     * The messages will be only removed from the device where the action is executed. I.e. this
     * action is not reflected.
     */
    readonly removeAllMessages: ControllerUpdateFromLocal;
    /**
     * Return whether the message with the specified id exists in the this conversation.
     */
    readonly hasMessage: (id: MessageId) => boolean;
    /**
     * Return a {@link LocalModelStore} of the message with the specified id.
     */
    readonly getMessage: (id: MessageId) => AnyMessageModelStore | undefined;
    /**
     * Return a {@link LocalModelStore} of every message in the current conversation.
     */
    readonly getAllMessages: () => SetOfAnyLocalMessageModelStore;
    /**
     * The user read (i.e. opened) the conversation on the current device.
     */
    readonly read: ControllerUpdateFromLocal<[readAt: Date]>;
} & ProxyMarked;
export interface ConversationControllerHandle {
    /**
     * UID of the conversation.
     */
    readonly uid: UidOf<DbConversation>;

    /**
     * Receiver associated with the conversation.
     */
    readonly receiverLookup: DbReceiverLookup;

    /**
     * Return the {@link ConversationId} for the current conversation.
     */
    readonly conversationId: () => ConversationId;

    /**
     * Update the conversation.
     *
     * If {@link unreadMessageCountDelta} is set, the unread message count will be incremented or
     * decremented by the specified amount. Note that the unread message count can never go below 0.
     *
     * Note: This implicitly adds the conversation to the conversation list, so it should not be
     *       called before a commitment to the conversation has been made (e.g. a message is being
     *       sent or has been received).
     */
    readonly update: (
        change: Required<Pick<ConversationUpdate, 'lastUpdate'>> & ConversationUpdate,
        unreadMessageCountDelta?: i53,
    ) => void;

    /**
     * Decrement the unread message count of the conversation.
     *
     * The unread message count will be decremented by the specified amount. Note that the unread
     * message count can never go below 0.
     */
    readonly decrementUnreadMessageCount: () => void;
}
export type Conversation = LocalModel<
    ConversationView,
    ConversationController,
    UidOf<DbConversation>
>;
export type ConversationListController = {
    readonly meta: ModelLifetimeGuard<readonly LocalModelStore<Conversation>[]>;
} & ProxyMarked;

export type ConversationRepository = {
    readonly totalUnreadMessageCount: LocalStore<u53>;
    getForReceiver: (receiver: DbReceiverLookup) => LocalModelStore<Conversation> | undefined;
    getAll: () => LocalSetStore<LocalModelStore<Conversation>>;
} & ProxyMarked;

// Profile pictures

export type ContactProfilePictureFields = Pick<
    DbContact,
    | 'colorIndex'
    | 'profilePictureContactDefined'
    | 'profilePictureGatewayDefined'
    | 'profilePictureUserDefined'
>;
export type GroupProfilePictureFields = Pick<DbGroup, 'colorIndex' | 'profilePictureAdminDefined'>;

export type IProfilePictureRepository = {
    /**
     * Return the profile picture model store for the specified contact.
     */
    readonly getForContact: (
        uid: DbContactUid,
        identity: IdentityString,
        profilePictureData: ContactProfilePictureFields,
    ) => LocalModelStore<ProfilePicture>;
    /**
     * Return the profile picture model store for the specified group.
     */
    readonly getForGroup: (
        uid: DbGroupUid,
        creatorIdentity: IdentityString,
        groupId: GroupId,
        profilePictureData: GroupProfilePictureFields,
    ) => LocalModelStore<ProfilePicture>;
} & ProxyMarked;

// Message
export interface CommonBaseMessageView {
    /**
     * Message ID.
     */
    readonly id: MessageId;

    /**
     * Timestamp for when the message...
     *
     * - Outbound: ...has been created on the local device.
     * - Inbound: ...has been created on the remote device.
     *
     * Note: For inbound messages, this timestamp may have an arbitrary value as it's controlled by
     *       the sender.
     */
    readonly createdAt: Date;

    /**
     * Optional timestamp for when...
     *
     * - Outbound: ...the 'read' delivery receipt message or the 'OutgoingMessageUpdate' with
     *     'update=read' has been reflected to the mediator server.
     * - Inbound: ...the 'read' delivery receipt message has been reflected to the mediator server
     *     by the leader device.
     */
    readonly readAt?: Date;

    /**
     * Optional reaction to a message.
     */
    readonly lastReaction?: {
        readonly at: Date;
        readonly type: MessageReaction;
    };
}
export type InboundBaseMessageView = CommonBaseMessageView & {
    /**
     * Message direction.
     */
    readonly direction: MessageDirection.INBOUND;

    /**
     * When the message has been received from the chat server and reflected to the mediator server
     * by the leader device.
     */
    readonly receivedAt: Date;

    /**
     * Unparsed raw body.
     */
    readonly raw: ReadonlyUint8Array;
};
export type OutboundBaseMessageView = CommonBaseMessageView & {
    /**
     * Message direction.
     */
    readonly direction: MessageDirection.OUTBOUND;

    /**
     * When the message has been delivered to and acknowledged by the chat server.
     */
    readonly sentAt?: Date;

    /**
     * When the message was delivered to the recipient and confirmed by the recipient with a
     * "received" delivery receipt.
     */
    readonly deliveredAt?: Date;
};
export type BaseMessageView<TDirection extends MessageDirection> =
    TDirection extends MessageDirection.INBOUND
        ? InboundBaseMessageView
        : TDirection extends MessageDirection.OUTBOUND
        ? OutboundBaseMessageView
        : never;

type CommonBaseMessageInit<TType extends MessageType> = {
    /**
     * Message type (e.g. text, file, etc).
     */
    readonly type: TType;
} & CommonBaseMessageView;
type InboundBaseMessageInit<TType extends MessageType> = CommonBaseMessageInit<TType> &
    Pick<InboundBaseMessageView, 'receivedAt' | 'raw'> & {
        readonly sender: UidOf<DbContact>;
    };
type OutboundBaseMessageInit<TType extends MessageType> = CommonBaseMessageInit<TType> &
    Pick<OutboundBaseMessageView, 'sentAt'>;

export type CommonBaseMessageController<TView extends CommonBaseMessageView> = {
    readonly meta: ModelLifetimeGuard<TView>;

    /**
     * Remove the message.
     */
    readonly remove: () => void;
} & ProxyMarked;
export type InboundBaseMessageController<TView extends InboundBaseMessageView> =
    CommonBaseMessageController<TView> & {
        /**
         * Convert this message into a preview.
         */
        readonly preview: () => InboundConversationPreviewMessageView;

        /**
         * Contact that sent this message.
         */
        readonly sender: () => LocalModelStore<Contact>;

        /**
         * The user read the message on a linked device.
         *
         * Note: This interface does not allow updating `fromLocal`, because when viewing a
         *       conversation on the local device, the _entire_ conversation should be marked as
         *       read. Thus, use `ConversationController.read.fromLocal` instead.
         */
        readonly read: ControllerUpdateFromSync<[readAt: Date]>;

        /**
         * The user's reaction towards the message.
         */
        readonly reaction: Omit<
            ControllerUpdateFromSource<[type: MessageReaction, reactedAt: Date]>,
            'fromRemote'
        >;
    };
export type OutboundBaseMessageController<TView extends OutboundBaseMessageView> =
    CommonBaseMessageController<TView> & {
        /**
         * Convert this message into a preview.
         */
        readonly preview: () => OutboundConversationPreviewMessageView;

        /**
         * The message has been delivered to and acknowledged by the chat server.
         */
        readonly sent: (sentAt: Date) => void;

        /**
         * The message was delivered to the recipient.
         *
         * (Note: On the protocol level, this corresponds to a delivery receipt of type "received".)
         */
        readonly delivered: Omit<ControllerUpdateFromSource<[deliveredAt: Date]>, 'fromLocal'>;

        /**
         * The receiver read the message.
         */
        readonly read: Omit<ControllerUpdateFromSource<[readAt: Date]>, 'fromLocal'>;

        /**
         * The receiver's reaction towards the message.
         */
        readonly reaction: Omit<
            ControllerUpdateFromSource<[type: MessageReaction, reactedAt: Date]>,
            'fromLocal'
        >;
    };

export interface TextMessageViewFragment {
    readonly text: string;
    readonly quotedMessageId?: MessageId;
}
type CommonTextMessageView = CommonBaseMessageView & TextMessageViewFragment;
type InboundTextMessageView = InboundBaseMessageView & CommonTextMessageView;
type OutboundTextMessageView = OutboundBaseMessageView & CommonTextMessageView;
type CommonTextMessageInit = CommonBaseMessageInit<MessageType.TEXT> &
    Pick<CommonTextMessageView, 'text' | 'quotedMessageId'>;
type InboundTextMessageInit = CommonTextMessageInit & InboundBaseMessageInit<MessageType.TEXT>;
type OutboundTextMessageInit = CommonTextMessageInit & OutboundBaseMessageInit<MessageType.TEXT>;
type CommonTextMessageController<TView extends CommonTextMessageView> =
    CommonBaseMessageController<TView>;
export type InboundTextMessageController = InboundBaseMessageController<InboundTextMessageView> &
    CommonTextMessageController<InboundTextMessageView>;
export type OutboundTextMessageController = OutboundBaseMessageController<OutboundTextMessageView> &
    CommonTextMessageController<OutboundTextMessageView>;
export type InboundTextMessageModel = LocalModel<
    InboundTextMessageView,
    InboundTextMessageController,
    MessageDirection.INBOUND,
    MessageType.TEXT
>;
export type IInboundTextMessageModelStore = LocalModelStore<InboundTextMessageModel>;
export type OutboundTextMessageModel = LocalModel<
    OutboundTextMessageView,
    OutboundTextMessageController,
    MessageDirection.OUTBOUND,
    MessageType.TEXT
>;
export type IOutboundTextMessageModelStore = LocalModelStore<OutboundTextMessageModel>;
export interface InboundTextMessage {
    readonly view: InboundTextMessageView;
    readonly init: InboundTextMessageInit;
    readonly controller: InboundTextMessageController;
    readonly model: InboundTextMessageModel;
}

export interface OutboundTextMessage {
    readonly view: OutboundTextMessageView;
    readonly init: OutboundTextMessageInit;
    readonly controller: OutboundTextMessageController;
    readonly model: OutboundTextMessageModel;
}

export interface FileData {
    readonly fileId: FileId;
    readonly encryptionKey: FileEncryptionKey;
    readonly unencryptedByteCount: u53;
    readonly storageFormatVersion: u53;
}

export type InboundFileMessageState = 'remote' | 'downloading' | 'local' | 'failed';
export type OutboundFileMessageState = 'local' | 'uploading' | 'remote' | 'failed';
export interface FileMessageViewFragment {
    readonly fileName?: string;
    readonly fileSize: u53;
    readonly caption?: string;
    readonly mediaType: string;
    readonly thumbnailMediaType?: string;
    readonly blobId?: BlobId;
    readonly thumbnailBlobId?: BlobId;
    readonly blobDownloadState?: BlobDownloadState;
    readonly thumbnailBlobDownloadState?: BlobDownloadState;
    readonly encryptionKey: RawBlobKey;
    readonly fileData?: FileData;
    readonly thumbnailFileData?: FileData;
}
type CommonFileMessageView = CommonBaseMessageView & FileMessageViewFragment;
export type InboundFileMessageView = InboundBaseMessageView &
    CommonFileMessageView & {readonly state: InboundFileMessageState};
export type OutboundFileMessageView = OutboundBaseMessageView &
    CommonFileMessageView & {readonly state: OutboundFileMessageState};
type CommonFileMessageInit = CommonBaseMessageInit<MessageType.FILE> &
    Pick<
        CommonFileMessageView,
        | 'fileName'
        | 'fileSize'
        | 'caption'
        | 'mediaType'
        | 'thumbnailMediaType'
        | 'blobId'
        | 'thumbnailBlobId'
        | 'fileData'
        | 'thumbnailFileData'
    > & {
        readonly encryptionKey: RawBlobKey;
        readonly correlationId?: string;
    };
type InboundFileMessageInit = CommonFileMessageInit & InboundBaseMessageInit<MessageType.FILE>;
type OutboundFileMessageInit = CommonFileMessageInit &
    OutboundBaseMessageInit<MessageType.FILE> & {
        readonly fileId: FileId;
        readonly thumbnailFileId: FileId;
    };
type CommonFileMessageController<TView extends CommonFileMessageView> =
    CommonBaseMessageController<TView> & {
        /**
         * Return the blob bytes.
         *
         * If the blob has not yet been downloaded, the download will be started and the database
         * will be updated. Once that is done, the promise will resolve with the blob data.
         *
         * If the download fails (for any reason), then the promise is rejected with an error.
         */
        readonly blob: () => Promise<ReadonlyUint8Array>;

        /**
         * Return the thumbnail blob bytes.
         *
         * If the blob has not yet been downloaded, the download will be started and the database
         * will be updated. Once that is done, the promise will resolve with the blob data.
         *
         * If the download fails (for any reason), then the promise is rejected with an error.
         */
        readonly thumbnailBlob: () => Promise<ReadonlyUint8Array | undefined>;
    };
export type InboundFileMessageController = InboundBaseMessageController<InboundFileMessageView> &
    CommonFileMessageController<InboundFileMessageView>;
export type OutboundFileMessageController = OutboundBaseMessageController<OutboundFileMessageView> &
    CommonFileMessageController<OutboundFileMessageView>;
type InboundFileMessageModel = LocalModel<
    InboundFileMessageView,
    InboundFileMessageController,
    MessageDirection.INBOUND,
    MessageType.FILE
>;
export type IInboundFileMessageModelStore = LocalModelStore<InboundFileMessageModel>;
type OutboundFileMessageModel = LocalModel<
    OutboundFileMessageView,
    OutboundFileMessageController,
    MessageDirection.OUTBOUND,
    MessageType.FILE
>;
export type IOutboundFileMessageModelStore = LocalModelStore<OutboundFileMessageModel>;
export interface InboundFileMessage {
    readonly view: InboundFileMessageView;
    readonly init: InboundFileMessageInit;
    readonly controller: InboundFileMessageController;
    readonly model: InboundFileMessageModel;
    readonly store: LocalModelStore<InboundFileMessageModel>;
}
export interface OutboundFileMessage {
    readonly view: OutboundFileMessageView;
    readonly init: OutboundFileMessageInit;
    readonly controller: OutboundFileMessageController;
    readonly model: OutboundFileMessageModel;
    readonly store: LocalModelStore<OutboundFileMessageModel>;
}

export type InboundMessageFor<TType extends MessageType> = TType extends MessageType.TEXT
    ? InboundTextMessage
    : TType extends MessageType.FILE
    ? InboundFileMessage
    : never;
export type OutboundMessageFor<TType extends MessageType> = TType extends MessageType.TEXT
    ? OutboundTextMessage
    : TType extends MessageType.FILE
    ? OutboundFileMessage
    : never;

type MessageVariants = 'view' | 'init' | 'controller' | 'model';
export type DirectedMessageFor<
    TDirection extends MessageDirection,
    TType extends MessageType,
    TVariant extends MessageVariants,
> = TDirection extends MessageDirection.INBOUND
    ? {
          readonly direction: MessageDirection.INBOUND;
      } & InboundMessageFor<TType>[TVariant]
    : TDirection extends MessageDirection.OUTBOUND
    ? {
          readonly direction: MessageDirection.OUTBOUND;
      } & OutboundMessageFor<TType>[TVariant]
    : never;
export type MessageFor<
    TDirection extends MessageDirection,
    TType extends MessageType,
    TVariant extends MessageVariants,
> = TDirection extends MessageDirection.INBOUND
    ? InboundMessageFor<TType>[TVariant]
    : TDirection extends MessageDirection.OUTBOUND
    ? OutboundMessageFor<TType>[TVariant]
    : never;
export type AnyMessage<TVariant extends MessageVariants> = MessageFor<
    MessageDirection,
    MessageType,
    TVariant
>;
export type AnyMessageModel = AnyInboundMessageModel | AnyOutboundMessageModel;
export type AnyInboundMessageModel = InboundTextMessage['model'] | InboundFileMessage['model'];
export type AnyOutboundMessageModel = OutboundTextMessage['model'] | OutboundFileMessage['model'];
export type AnyMessageModelStore = AnyInboundMessageModelStore | AnyOutboundMessageModelStore;
export type AnyInboundMessageModelStore =
    | IInboundTextMessageModelStore
    | IInboundFileMessageModelStore;
export type AnyOutboundMessageModelStore =
    | IOutboundTextMessageModelStore
    | IOutboundFileMessageModelStore;
export type AnyTextMessageModelStore =
    | IInboundTextMessageModelStore
    | IOutboundTextMessageModelStore;
export type AnyFileMessageModelStore =
    | IInboundFileMessageModelStore
    | IOutboundFileMessageModelStore;

export type SetOfAnyRemoteMessageModel =
    | ReadonlySet<RemoteModelStore<InboundTextMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundTextMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundFileMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundFileMessage['model']>>;
export type SetOfAnyLocalMessageModelStore = LocalSetStore<
    | LocalModelStore<InboundTextMessage['model']>
    | LocalModelStore<OutboundTextMessage['model']>
    | LocalModelStore<InboundFileMessage['model']>
    | LocalModelStore<OutboundFileMessage['model']>
>;
export type SetOfAnyRemoteMessageModelStore = RemoteSetStore<
    | RemoteModelStore<InboundTextMessage['model']>
    | RemoteModelStore<OutboundTextMessage['model']>
    | RemoteModelStore<InboundFileMessage['model']>
    | RemoteModelStore<OutboundFileMessage['model']>
>;

export type Settings = {
    readonly blockUnknown: boolean;
    readonly contactIsBlocked: (identity: IdentityString) => boolean;
} & ProxyMarked;

export type Repositories = {
    readonly user: User;
    readonly contacts: ContactRepository;
    readonly groups: GroupRepository;
    readonly conversations: ConversationRepository;
    readonly profilePictures: IProfilePictureRepository;
    readonly settings: Settings;
    readonly globalProperties: IGlobalPropertyRepository;
} & ProxyMarked;
