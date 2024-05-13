import {
    ConversationCategory,
    ConversationVisibility,
    GroupUserState,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, Group, GroupInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import type {GroupCreator} from '~/common/model/types/group';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {GroupCreatorContainer, GroupSetup} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {idColorIndex} from '~/common/utils/id-color';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Base class for handling CSP or D2D incoming group setup messages.
 */
export abstract class GroupSetupTaskBase<
    TTaskCodecHandleType extends PassiveTaskCodecHandle | ActiveTaskCodecHandle<'volatile'>,
> implements ComposableTask<TTaskCodecHandleType, void>
{
    protected readonly _log: Logger;
    protected readonly _groupDebugString: string;

    public constructor(
        protected readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderIdentity: IdentityString,
        private readonly _container: GroupCreatorContainer.Type,
        private readonly _groupSetup: GroupSetup.Type,
        taskName: string,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(`network.protocol.task.${taskName}.${messageIdHex}`);
        this._groupDebugString = groupDebugString(_senderIdentity, _container.groupId);
    }

    public async run(handle: TTaskCodecHandleType): Promise<void> {
        const {device, model} = this._services;

        this._log.info(
            `Processing group setup from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;

        // 1. Let `members` be the given member list. Remove all duplicate entries from `members`.
        //    Remove the sender from members if present.
        const memberIdentities = new Set(this._groupSetup.members); // Set to avoid duplicates
        memberIdentities.delete(creatorIdentity); // Creator is an implicit member

        const creator: GroupCreator =
            creatorIdentity === device.identity.string
                ? {creatorIsUser: true}
                : {creatorIsUser: false, creatorIdentity};

        // 2. Look up group
        const group = model.groups.getByGroupIdAndCreator(groupId, creator)?.get();

        // 3. If the group could not be found
        if (group === undefined) {
            // 3.1 If the user is not present in `members`, abort these steps
            if (!memberIdentities.has(device.identity.string)) {
                // Group was not found and we were apparently just removed from this unknown group.
                // We can safely ignore this message.
                this._log.info(`We were removed from the unknown group ${this._groupDebugString}`);
                return;
            }
        }

        // 4. If the group could be found
        if (group !== undefined) {
            // 4.1 If members is empty or does not include the user, mark the group as left and
            //     abort these steps.
            if (!memberIdentities.has(device.identity.string)) {
                // Group was found, but we're not part of the group anymore. Reflect and return.
                await this._reflectIncomingGroupSetup(handle);
                if (group.view.userState === GroupUserState.MEMBER) {
                    await this._kick(handle, group);
                    this._log.info(`We were removed from the group ${this._groupDebugString}`);
                } else {
                    this._log.info(
                        `We were removed from the group ${this._groupDebugString} that we already left`,
                    );
                }
                return;
            }
        }

        // 5. For each member of members, create a contact with acquaintance level group if not
        //    already present in the contact list. (Do not add the user's own identity as a
        //    contact.)

        // Look up group member contacts
        const memberContacts: LocalModelStore<Contact>[] = [];
        const identitiesToAdd: IdentityString[] = [];
        for (const identity of memberIdentities) {
            if (identity === device.identity.string) {
                // Our own identity is not a valid contact
                continue;
            }

            const contact = model.contacts.getByIdentity(identity);
            if (contact !== undefined) {
                // Contact found
                memberContacts.push(contact);
            } else {
                identitiesToAdd.push(identity);
            }
        }

        // Add creator explicitly as member
        const creatorContact = model.contacts.getByIdentity(creatorIdentity);
        // Creator contact must exist, because the message could not have been decrypted
        // without having a contact for the sender.
        assert(creatorContact !== undefined);
        // Create missing contacts (with acquaintance level "GROUP").
        if (identitiesToAdd.length > 0) {
            memberContacts.push(
                ...(await this._handleMissingGroupMembers(handle, identitiesToAdd)),
            );
        }

        // Now that contacts were created, reflect the group setup message. (This will be a no-op
        // for the D2D subclass.)
        const reflectedAt = await this._reflectIncomingGroupSetup(handle);

        // 6. Create or update the group with the given members plus the sender (creator)

        // Update group if the group exists already
        if (group !== undefined) {
            // Update member list
            const previousUserState = group.view.userState;

            // 7. If group was previously marked as left, re-join it
            await this._setMembers(
                handle,
                group,
                memberContacts,
                previousUserState !== GroupUserState.MEMBER ? GroupUserState.MEMBER : undefined,
            );
            this._log.info(`Group ${this._groupDebugString} member list updated`);
            if (previousUserState !== GroupUserState.MEMBER) {
                this._log.info(`Group ${this._groupDebugString} re-joined`);
            }
        } else {
            // Create new group
            await this._addGroup(
                handle,
                {
                    groupId,
                    creator: creatorContact,
                    // Name will be updated by group name message
                    name: '',
                    colorIndex: idColorIndex({type: ReceiverType.GROUP, creatorIdentity, groupId}),
                    userState: GroupUserState.MEMBER,
                    category: ConversationCategory.DEFAULT,
                    visibility: ConversationVisibility.SHOW,
                },
                memberContacts,
                reflectedAt,
            );
            this._log.info(
                `Group ${this._groupDebugString} with ${memberContacts.length + 1} member(s) added`,
            );
        }
    }

    /**
     * Reflect the incoming group setup message to other devices.
     *
     * If the message is reflected, then the reflection date will be returned.
     *
     * This method will be called after preprocessing the group, i.e. after creating missing
     * contacts. It is only relevant for the CSP task, not for the D2D task.
     */
    protected abstract _reflectIncomingGroupSetup(
        handle: TTaskCodecHandleType,
    ): Promise<Date | undefined>;

    /**
     * Mark our own user as kicked from the specified group.
     */
    protected abstract _kick(handle: TTaskCodecHandleType, group: Group): Promise<void>;

    /**
     * Replace the member list for the specified group.
     */
    protected abstract _setMembers(
        handle: TTaskCodecHandleType,
        group: Group,
        memberUids: LocalModelStore<Contact>[],
        newUserState?: GroupUserState.MEMBER,
    ): Promise<void>;

    /**
     * Add the specified group.
     *
     * @param handle The task codec handle
     * @param init The group init (without `createdAt` timestamp)
     * @param members The list of group members
     * @param reflectedAt The reflection timestamp. Must be defined in CSP subclasses, but not in
     *   D2D subclasses.
     */
    protected abstract _addGroup(
        handle: TTaskCodecHandleType,
        init: Omit<GroupInit, 'createdAt'>,
        members: LocalModelStore<Contact>[],
        reflectedAt: Date | undefined,
    ): Promise<void>;

    /**
     * Add the missing group members and return the UIDs of the created contacts.
     */
    protected abstract _handleMissingGroupMembers(
        handle: TTaskCodecHandleType,
        identitiesToAdd: IdentityString[],
    ): Promise<LocalModelStore<Contact>[]>;
}
