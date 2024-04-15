import type {PublicKey} from '~/common/crypto';
import type {
    DbContactReceiverLookup,
    DbDistributionListReceiverLookup,
    DbGroupReceiverLookup,
    DbReceiverLookup,
} from '~/common/db';
import {
    ActivityState,
    ContactNotificationTriggerPolicy,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    NotificationSoundPolicy,
    ReadReceiptPolicy,
    ReceiverType,
    TypingIndicatorPolicy,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import type {Contact, Group} from '~/common/model';
import {getGroupInitials} from '~/common/model/group';
import type {Conversation} from '~/common/model/types/conversation';
import type {AnyReceiver} from '~/common/model/types/receiver';
import {getUserInitials} from '~/common/model/user';
import type {IdentityString} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import type {IdColor} from '~/common/utils/id-color';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ReceiverBadgeType} from '~/common/viewmodel/types';
import {getContactBadge} from '~/common/viewmodel/utils/contact';

export type AnyReceiverData =
    | ContactReceiverData
    | DistributionListReceiverData
    | GroupReceiverData;

export type AnyReceiverDataOrSelf = SelfReceiverData | AnyReceiverData;

export type ReceiverDataFor<TReceiver extends AnyReceiver> = {
    readonly [ReceiverType.CONTACT]: ContactReceiverData;
    readonly [ReceiverType.DISTRIBUTION_LIST]: DistributionListReceiverData;
    readonly [ReceiverType.GROUP]: GroupReceiverData;
}[TReceiver['type']];

export type AnyReceiverUpdateData =
    | ContactReceiverUpdateData
    | GroupReceiverUpdateData
    | DistributionListReceiverUpdateData;

export type ReceiverUpdateDataFor<TReceiver extends AnyReceiver> = {
    readonly [ReceiverType.CONTACT]: ContactReceiverUpdateData;
    readonly [ReceiverType.DISTRIBUTION_LIST]: DistributionListReceiverUpdateData;
    readonly [ReceiverType.GROUP]: GroupReceiverUpdateData;
}[TReceiver['type']];

/**
 * Extracts and returns data related to a conversation's receiver from the specified
 * {@link conversationModel}.
 */
export function getConversationReceiverData(
    services: Pick<ServicesForViewModel, 'model'>,
    conversationModel: Conversation,
    getAndSubscribe: GetAndSubscribeFunction,
): AnyReceiverData {
    const receiverModel = getAndSubscribe(conversationModel.controller.receiver());

    return getReceiverData(services, receiverModel, getAndSubscribe);
}

/**
 * Collects the respective receiver data for the given `receiverModel`.
 */
export function getReceiverData<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'model'>,
    receiverModel: TReceiver,
    getAndSubscribe: GetAndSubscribeFunction,
): ReceiverDataFor<TReceiver> {
    switch (receiverModel.type) {
        case ReceiverType.CONTACT:
            // Cast is necessary, as TypeScript isn't able to infer that at this point, `TReceiver`
            // is `Contact`.
            return getContactReceiverData(
                services,
                receiverModel,
                getAndSubscribe,
            ) satisfies ContactReceiverData as ReceiverDataFor<TReceiver>;

        case ReceiverType.GROUP:
            // Cast is necessary, as TypeScript isn't able to infer that at this point, `TReceiver`
            // is `Group`.
            return getGroupReceiverData(
                services,
                receiverModel,
                getAndSubscribe,
            ) satisfies GroupReceiverData as ReceiverDataFor<TReceiver>;

        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(DESK-771): Support distribution lists');

        default:
            return unreachable(receiverModel);
    }
}

/**
 * Extracts and returns common data related to a conversation's receiver from the specified
 * {@link conversationModel}.
 */
export function getCommonReceiverData(receiverModel: AnyReceiver): CommonReceiverData {
    switch (receiverModel.type) {
        case ReceiverType.CONTACT:
            return {
                color: receiverModel.view.color,
                initials: receiverModel.view.initials,
                isDisabled: isReceiverDisabled(receiverModel),
                lookup: {
                    type: receiverModel.type,
                    uid: receiverModel.ctx,
                },
                name: receiverModel.view.displayName,
                notificationPolicy: getContactNotificationPolicyData(receiverModel),
            };

        case ReceiverType.GROUP:
            return {
                color: receiverModel.view.color,
                initials: getGroupInitials(receiverModel.view),
                isDisabled: isReceiverDisabled(receiverModel),
                lookup: {
                    type: receiverModel.type,
                    uid: receiverModel.ctx,
                },
                name: receiverModel.view.displayName,
                notificationPolicy: getGroupNotificationPolicyData(receiverModel),
            };

        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(DESK-771): Support distribution lists');

        default:
            return unreachable(receiverModel);
    }
}

/**
 * Returns the collected {@link SelfReceiverData} object for the user themself.
 */
export function getSelfReceiverData(
    services: Pick<ServicesForViewModel, 'model'>,
    getAndSubscribe: GetAndSubscribeFunction,
): SelfReceiverData {
    const {user} = services.model;

    const profilePicture = getAndSubscribe(user.profilePicture);
    const displayName = getAndSubscribe(user.displayName);
    const profileSettings = getAndSubscribe(user.profileSettings);

    return {
        type: 'self',
        color: profilePicture.color,
        identity: user.identity,
        initials: getUserInitials(displayName),
        isDisabled: false,
        name: displayName,
        nickname: profileSettings.view.nickname,
    };
}

/**
 * Returns the collected {@link ContactReceiverData} object for a specific receiver of type
 * {@link ReceiverType.CONTACT}.
 */
function getContactReceiverData(
    services: Pick<ServicesForViewModel, 'model'>,
    contactModel: Contact,
    getAndSubscribe: GetAndSubscribeFunction,
): ContactReceiverData {
    return {
        type: 'contact',
        ...getCommonReceiverData(contactModel),
        badge: getContactBadge(contactModel.view),
        firstName: contactModel.view.firstName,
        identity: contactModel.view.identity,
        isBlocked: isContactReceiverBlocked(services, contactModel, getAndSubscribe),
        isInactive: isContactReceiverInactive(contactModel),
        isInvalid: isContactReceiverInvalid(contactModel),
        lastName: contactModel.view.lastName,
        lookup: {
            type: contactModel.type,
            uid: contactModel.ctx,
        },
        nickname: contactModel.view.nickname,
        publicKey: contactModel.view.publicKey,
        readReceiptPolicy: getContactReadReceiptPolicyData(contactModel),
        typingIndicatorPolicy: getContactTypingIndicatorPolicyData(contactModel),
        verification: getContactVerificationData(contactModel),
    };
}

/**
 * Returns the collected {@link GroupReceiverData} object for a specific receiver of type
 * {@link ReceiverType.GROUP}.
 */
function getGroupReceiverData(
    services: Pick<ServicesForViewModel, 'model'>,
    groupModel: Group,
    getAndSubscribe: GetAndSubscribeFunction,
): GroupReceiverData {
    const groupCreatorData = getGroupCreatorData(services, groupModel, getAndSubscribe);

    return {
        type: 'group',
        ...getCommonReceiverData(groupModel),
        creator: groupCreatorData,
        initials: getGroupInitials(groupModel.view),
        lookup: {
            type: groupModel.type,
            uid: groupModel.ctx,
        },
        members: groupModel.view.members
            .map((identity) => getGroupMemberData(services, identity, getAndSubscribe))
            .filter(
                // As all `undefined` items are removed using the filter, the remeining items are of
                // type `ContactReceiverData`.
                (member): member is SelfReceiverData | ContactReceiverData => {
                    // If group member data is `undefined`, discard item from the members array.
                    if (member === undefined) {
                        return false;
                    }

                    // If this member is the creator, remove it from the members array.
                    if (member.identity === groupCreatorData.identity) {
                        return false;
                    }

                    return true;
                },
            ),
        isLeft: isGroupReceiverLeft(groupModel),
    };
}

/**
 * Returns whether the receiver contact belonging to the given {@link contactModel} is blocked
 * according to the user's privacy settings.
 */
function isContactReceiverBlocked(
    services: Pick<ServicesForViewModel, 'model'>,
    contactModel: Contact,
    getAndSubscribe: GetAndSubscribeFunction,
): boolean {
    const {privacySettings} = services.model.user;

    return getAndSubscribe(privacySettings).controller.isIdentityExplicitlyBlocked(
        contactModel.view.identity,
    );
}

/**
 * Returns whether the receiver belonging to the given {@link receiverModel} is disabled, which is
 * true in the following cases:
 *
 * - An invalid contact.
 * - A left group.
 */
function isReceiverDisabled(receiverModel: AnyReceiver): boolean {
    switch (receiverModel.type) {
        case ReceiverType.CONTACT:
            return isContactReceiverInvalid(receiverModel);

        case ReceiverType.GROUP:
            return isGroupReceiverLeft(receiverModel);

        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(DESK-771): Support distribution lists.
            return false;

        default:
            return unreachable(receiverModel);
    }
}

/**
 * Returns whether the receiver contact belonging to the given {@link receiverModel} is inactive.
 */
function isContactReceiverInactive(receiverModel: Contact): boolean {
    return receiverModel.view.activityState === ActivityState.INACTIVE;
}

/**
 * Returns whether the receiver contact belonging to the given {@link receiverModel} is invalid.
 */
function isContactReceiverInvalid(receiverModel: Contact): boolean {
    return receiverModel.view.activityState === ActivityState.INVALID;
}

function getContactNotificationPolicyData(contactModel: Contact): NotificationPolicyData {
    const isMuted =
        contactModel.view.notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED;
    if (contactModel.view.notificationTriggerPolicyOverride === undefined) {
        return {
            type: 'default',
            isMuted,
        };
    }

    switch (contactModel.view.notificationTriggerPolicyOverride.policy) {
        case ContactNotificationTriggerPolicy.NEVER:
            return {
                type: 'never',
                expiresAt: contactModel.view.notificationTriggerPolicyOverride.expiresAt,
                isMuted,
            };

        default:
            return unreachable(contactModel.view.notificationTriggerPolicyOverride.policy);
    }
}

function getContactReadReceiptPolicyData(contactModel: Contact): ReadReceiptPolicyData {
    switch (contactModel.view.readReceiptPolicyOverride) {
        case undefined:
            return 'default';

        case ReadReceiptPolicy.DONT_SEND_READ_RECEIPT:
            return 'do-not-send';

        case ReadReceiptPolicy.SEND_READ_RECEIPT:
            return 'send';

        default:
            return unreachable(contactModel.view.readReceiptPolicyOverride);
    }
}

function getContactTypingIndicatorPolicyData(contactModel: Contact): TypingIndicatorPolicyData {
    switch (contactModel.view.typingIndicatorPolicyOverride) {
        case undefined:
            return 'default';

        case TypingIndicatorPolicy.DONT_SEND_TYPING_INDICATOR:
            return 'do-not-send';

        case TypingIndicatorPolicy.SEND_TYPING_INDICATOR:
            return 'send';

        default:
            return unreachable(contactModel.view.typingIndicatorPolicyOverride);
    }
}

/**
 * Returns data about the verification status of the receiver contact that belongs to the given
 * {@link receiverModel}.
 */
function getContactVerificationData(receiverModel: Contact): VerificationData {
    let verificationType: VerificationData['type'];
    switch (receiverModel.view.workVerificationLevel) {
        case WorkVerificationLevel.NONE:
            verificationType = 'default';
            break;

        case WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED:
            verificationType = 'shared-work-subscription';
            break;

        default:
            unreachable(receiverModel.view.workVerificationLevel);
    }

    let verificationLevel: VerificationData['level'];
    switch (receiverModel.view.verificationLevel) {
        case VerificationLevel.UNVERIFIED:
            verificationLevel = 'unverified';
            break;

        case VerificationLevel.SERVER_VERIFIED:
            verificationLevel = 'server-verified';
            break;

        case VerificationLevel.FULLY_VERIFIED:
            verificationLevel = 'fully-verified';
            break;

        default:
            unreachable(receiverModel.view.verificationLevel);
    }

    return {
        type: verificationType,
        level: verificationLevel,
    };
}

/**
 * Returns whether the receiver group belonging to the given {@link receiverModel} was left (the
 * user has left or was kicked from the group).
 */
function isGroupReceiverLeft(receiverModel: Group): boolean {
    return (
        receiverModel.view.userState === GroupUserState.KICKED ||
        receiverModel.view.userState === GroupUserState.LEFT
    );
}

/**
 * Returns the {@link ContactReceiverData} of a group's creator identity.
 */
function getGroupCreatorData(
    services: Pick<ServicesForViewModel, 'model'>,
    groupModel: Group,
    getAndSubscribe: GetAndSubscribeFunction,
): SelfReceiverData | ContactReceiverData {
    const creatorIdentity = groupModel.view.creatorIdentity;
    const creatorModelStore = services.model.contacts.getByIdentity(creatorIdentity);

    // If the user is the creator of the group, return the user's data.
    if (creatorIdentity === services.model.user.identity) {
        return getSelfReceiverData(services, getAndSubscribe);
    }

    // Since a group must have a creator, we assume that the contact model store of
    // `creatorIdentity` is never `undefined`.
    assert(
        creatorModelStore !== undefined,
        `The group creator with id ${creatorIdentity} must exist as contact.`,
    );
    const creatorModel: Contact = getAndSubscribe(creatorModelStore);

    return getContactReceiverData(services, creatorModel, getAndSubscribe);
}

/**
 * Returns the receiver data of a group member.
 */
function getGroupMemberData(
    services: Pick<ServicesForViewModel, 'model'>,
    identity: IdentityString,
    getAndSubscribe: GetAndSubscribeFunction,
): SelfReceiverData | ContactReceiverData | undefined {
    // If the user is the creator of the group, return the user's data.
    if (identity === services.model.user.identity) {
        return getSelfReceiverData(services, getAndSubscribe);
    }

    const receiverModelStore = services.model.contacts.getByIdentity(identity);
    if (receiverModelStore === undefined) {
        return undefined;
    }
    const receiverModel = getAndSubscribe(receiverModelStore);

    return getContactReceiverData(services, receiverModel, getAndSubscribe);
}

function getGroupNotificationPolicyData(groupModel: Group): NotificationPolicyData {
    const isMuted =
        groupModel.view.notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED;

    switch (groupModel.view.notificationTriggerPolicyOverride?.policy) {
        case GroupNotificationTriggerPolicy.MENTIONED:
            return {
                type: 'mentioned',
                expiresAt: groupModel.view.notificationTriggerPolicyOverride.expiresAt,
                isMuted,
            };

        case GroupNotificationTriggerPolicy.NEVER:
            return {
                type: 'never',
                expiresAt: groupModel.view.notificationTriggerPolicyOverride.expiresAt,
                isMuted,
            };

        default:
            return {
                type: 'default',
                isMuted,
            };
    }
}

/**
 * Update the given receiver's model with the provided data.
 */
export async function updateReceiverData<TReceiver extends AnyReceiver>(
    receiver: TReceiver,
    update: ReceiverUpdateDataFor<TReceiver>,
): Promise<void> {
    switch (receiver.type) {
        case ReceiverType.CONTACT: {
            // Even though `update` is dependent on `TReceiver`, TypeScript is not able to
            // narrow its type.
            assert(update.type === 'contact', `Expected given update data to be of type "contact"`);

            return await receiver.controller.update.fromLocal({
                firstName: update.firstName,
                lastName: update.lastName,
            });
        }

        case ReceiverType.DISTRIBUTION_LIST: {
            throw new Error('TODO(DESK-771): Implement distribution lists');
        }

        case ReceiverType.GROUP: {
            throw new Error('TODO(DESK-653): Implement group renaming');
        }

        default:
            return unreachable(receiver);
    }
}

type NotificationPolicyData =
    | DefaultNotificationPolicyData
    | MentionedNotificationPolicyData
    | NeverNotificationPolicyData;

interface CommonNotificationPolicyData {
    readonly isMuted: boolean;
}

interface DefaultNotificationPolicyData extends CommonNotificationPolicyData {
    readonly type: 'default';
}

interface MentionedNotificationPolicyData extends CommonNotificationPolicyData {
    readonly type: 'mentioned';
    readonly expiresAt?: Date;
}

interface NeverNotificationPolicyData extends CommonNotificationPolicyData {
    readonly type: 'never';
    readonly expiresAt?: Date;
}

type ReadReceiptPolicyData = 'default' | 'send' | 'do-not-send';

type TypingIndicatorPolicyData = 'default' | 'send' | 'do-not-send';

interface VerificationData {
    readonly type: 'default' | 'shared-work-subscription';
    readonly level: 'unverified' | 'server-verified' | 'fully-verified';
}

interface CommonReceiverData {
    /** Color used as the backdrop. */
    readonly color: IdColor;
    /** Fallback initials if the image is not provided or unavailable. */
    readonly initials: string;
    /** Whether to display this receiver as disabled (strikethrough). */
    readonly isDisabled: boolean;
    /** Necessary data to lookup the receiver from db. */
    readonly lookup: DbReceiverLookup;
    /** Full display name of the receiver. */
    readonly name: string;
    /** How the user wants to be notified of updates from this receiver. */
    readonly notificationPolicy: NotificationPolicyData;
}

interface SelfReceiverData extends Omit<CommonReceiverData, 'lookup' | 'notificationPolicy'> {
    readonly type: 'self';
    readonly nickname?: string;
    readonly identity: IdentityString;
}

export interface ContactReceiverData extends CommonReceiverData {
    readonly type: 'contact';
    readonly badge?: Extract<ReceiverBadgeType, 'contact-consumer' | 'contact-work'>;
    readonly firstName: string;
    readonly identity: IdentityString;
    readonly isBlocked: boolean;
    readonly isInactive: boolean;
    readonly isInvalid: boolean;
    readonly lastName: string;
    readonly lookup: DbContactReceiverLookup;
    readonly nickname?: string;
    readonly publicKey: PublicKey;
    readonly readReceiptPolicy: ReadReceiptPolicyData;
    readonly typingIndicatorPolicy: TypingIndicatorPolicyData;
    readonly verification: VerificationData;
}

export interface GroupReceiverData extends CommonReceiverData {
    readonly type: 'group';
    /** Creator of the group. */
    readonly creator: SelfReceiverData | ContactReceiverData;
    /** Whether the user is still part of the group or not. */
    readonly isLeft: boolean;
    readonly lookup: DbGroupReceiverLookup;
    /** Group members (excluding the group creator). */
    readonly members: (SelfReceiverData | ContactReceiverData)[];
}

// TODO(DESK-771): Implement distribution lists.
export interface DistributionListReceiverData extends CommonReceiverData {
    readonly type: 'distribution-list';
    readonly lookup: DbDistributionListReceiverLookup;
}

interface ContactReceiverUpdateData {
    readonly type: 'contact';
    readonly firstName: string;
    readonly lastName: string;
}

// TODO(DESK-771): Implement distribution lists.
interface DistributionListReceiverUpdateData {
    readonly type: 'distribution-list';
}

// TODO(DESK-653): Implement group renaming.
interface GroupReceiverUpdateData {
    readonly type: 'group';
}
