import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {
    AcquaintanceLevel,
    ConversationCategory,
    ConversationVisibility,
    GroupMemberState,
    GroupUserState,
    ReceiverType,
    TransactionScope,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit, GroupInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import type {ContactInitFragment} from '~/common/model/types/contact';
import {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {validContactsLookupSteps} from '~/common/network/protocol/task/common/contact-helper';
import {
    getD2dGroupSyncCreate,
    getD2dGroupSyncUpdate,
} from '~/common/network/protocol/task/d2d/group-sync-helper';
import {getD2dContactSyncCreate} from '~/common/network/protocol/task/d2d/reflect-contact-sync';
import {transactionCompleted} from '~/common/network/protocol/task/manager';
import type {GroupCreatorContainer, GroupSetup} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {assert, unwrap} from '~/common/utils/assert';
import {idColorIndex} from '~/common/utils/id-color';
import {difference, differenceWithTransform} from '~/common/utils/set';

/**
 * Base class for handling CSP or D2D incoming group setup messages.
 */
export class IncomingGroupSetupTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderIdentity: IdentityString,
        private readonly _container: GroupCreatorContainer.Type,
        private readonly _groupSetup: GroupSetup.Type,
        private readonly _reflectGroupSetup: protobuf.d2d.IncomingMessage,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.incoming-group-setup.${messageIdHex}`,
        );
        this._groupDebugString = groupDebugString(_senderIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
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

        // 2. Look up group
        const group = model.groups.getByGroupIdAndCreator(groupId, creatorIdentity)?.get();

        // 3. If the group could be found
        if (group !== undefined) {
            // 3.1 Let `group` be a snapshot of the current group state.
            const {userState} = group.view;
            const currentMemberIdentities = [...group.view.members].map(
                (contact) => contact.get().view.identity,
            );

            // 3.2 If the group is marked as _left_ and `members` is empty (i.e. no
            // change), discard the message and abort these steps.
            if (
                memberIdentities.size === 0 &&
                (userState === GroupUserState.KICKED || userState === GroupUserState.LEFT)
            ) {
                return;
            }

            // 3. If the group is not marked as _left_:
            if (userState === GroupUserState.MEMBER) {
                // 3.2 Add the user to `current-members`.
                currentMemberIdentities.push(this._services.device.identity.string);

                // 3.3 If `current-members` equals `members` (i.e. no change), discard the message
                // and abort these steps.
                if (
                    currentMemberIdentities.length === memberIdentities.size &&
                    currentMemberIdentities.every((memberIdentity) =>
                        memberIdentities.has(memberIdentity),
                    )
                ) {
                    return;
                }
            }
        }

        // 4. If `members` does not include the user:
        if (!memberIdentities.has(this._services.device.identity.string)) {
            // 4.1 If the group could not be found, discard the message and abort these steps
            if (group === undefined) {
                return;
            }

            // 4.2. (MD) Begin a transaction with scope `GROUP_SYNC`.
            const [state] = await handle.transaction(
                TransactionScope.GROUP_SYNC,
                // 4.2.1 (Precondition): If the group does not exist or the group is marked as left,
                // discard the message and abort these steps.
                () => {
                    const group_ = this._services.model.groups.getByGroupIdAndCreator(
                        groupId,
                        creatorIdentity,
                    );
                    return (
                        group_ !== undefined &&
                        group_.get().view.userState === GroupUserState.MEMBER
                    );
                },
                async () => {
                    // 4.3 (MD) Reflect a `GroupSync.Update` with `group` set to contain the
                    // `user_state` set to `KICKED`.
                    await handle.reflect([
                        {
                            envelope: {
                                groupSync: getD2dGroupSyncUpdate(
                                    {creatorIdentity, groupId},
                                    {view: group.view, update: {userState: GroupUserState.KICKED}},
                                ),
                                protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                            },
                            flags: D2mMessageFlags.none(),
                        },
                    ]);
                },
            );

            // 4.4. (MD) Commit the transaction and await acknowledgement.

            // 4.2.1 (Precondition failed) If the group does not exist or the group is marked as _left_, discard the
            // message and abort these steps.
            if (!transactionCompleted(state)) {
                this._log.warn('Transaction failed because group was already marked as left');
                return;
            }

            // 4.5 If the user is currently participating in a group call of this group, remove the
            // sender from the group call (handle it as if the sender left the call).

            // Nothing to do here, since the group call will react to the update of the
            // `groupUserState` field and leave the call from within.

            // 4.6 Mark the group as _left_.
            await group.controller.kicked.fromRemote(handle, new Date());

            // For backward compatibility, reflect the CSP-message here.
            await this._reflectIncomingGroupSetup(handle);

            // 4.7 Persist the previous member setup so that the group can be cloned.

            // Nothing to do here since persistence of the current group is a no-op.

            return;
        }

        // 5. If `members` includes the user.
        if (memberIdentities.has(device.identity.string)) {
            // 5.1.1 (Precondition) If the sender (creator) contact does not exist, log an error,
            // discard the message and abort these steps.
            const precondition = (): boolean =>
                this._services.model.contacts.getByIdentity(creatorIdentity) !== undefined;

            // 5.1 (MD) Begin a transaction with scope `GROUP_SYNC`
            const [state, message] = await handle.transaction(
                TransactionScope.GROUP_SYNC,
                precondition,
                async () => {
                    // 5.2  Run the _Valid Contacts Lookup Steps_ for `members` and overwrite
                    // `members` with the result.
                    const contactOrInitMap = await validContactsLookupSteps(
                        this._services,
                        memberIdentities,
                        this._log,
                    );

                    // 5.3 For each `contact-or-init` of `members`:
                    for (const [identity, contactOrInit] of contactOrInitMap.entries()) {
                        // 5.3.1 If `contact-or-init` indicates that the _contact is the user_,
                        // remove the entry from `members` and abort these sub-steps.
                        if (contactOrInit === 'me') {
                            contactOrInitMap.delete(identity);
                            continue;
                        }

                        // 5.3.2 If `contact-or-init` indicates that the _contact is invalid_,
                        // remove the entry from `members`, log a warning and abort these sub-steps.
                        if (contactOrInit === 'invalid') {
                            contactOrInitMap.delete(identity);
                            this._log.warn(
                                `Removing invalid member ${identity} from the group member list.`,
                            );
                        }
                    }
                    // 5.4  (MD) Let `pending-reflect-acks` be an empty list.
                    const pendingReflects = [];
                    // 5.5  For each `contact-or-init` of `members`:
                    for (const contactOrInit of contactOrInitMap.values()) {
                        // 5.5.1 If `contact-or-init` is an existing contact, abort these sub-steps.
                        if (contactOrInit instanceof ModelStore) {
                            continue;
                        }

                        // Typeguard. These were removed before.
                        assert(contactOrInit !== 'me' && contactOrInit !== 'invalid');

                        // 5.5.2 (MD) Reflect a `ContactSync.Create` with `contact` set from
                        //    `contact-or-init` and the following additional properties:
                        // - `created_at` set to now,
                        // - `acquaintance_level` set to `GROUP`,
                        // - all policies and categories set to their defaults.
                        pendingReflects.push({
                            envelope: {
                                contactSync: getD2dContactSyncCreate({
                                    ...contactOrInit,
                                    nickname: undefined,
                                    acquaintanceLevel: AcquaintanceLevel.GROUP_OR_DELETED,
                                }),
                                protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                            },
                            flags: D2mMessageFlags.none(),
                        });
                    }

                    // 5.6 (MD) Await all `pending-reflect-acks`.
                    if (pendingReflects.length > 0) {
                        await handle.reflect(pendingReflects);
                    }
                    // 5.7 Let `added-members` be a copy of `members`.
                    let addedMembers = new Set(contactOrInitMap.keys());
                    let removedMembers = new Set<IdentityString>();

                    // 5.8 Let `group` be a snapshot of the current group state or undefined if the
                    // group does not exist.
                    const group_ = model.groups
                        .getByGroupIdAndCreator(groupId, creatorIdentity)
                        ?.get();

                    let groupReflectedAt: Date;
                    // 5.9.  If `group` is not defined:
                    if (group_ === undefined) {
                        // 5.9.2 (MD) Reflect a `GroupSync.Create` with `group` set to contain:
                        // - `group_identity`,
                        // - `created_at`,
                        // - `name` empty,
                        // - `user_state` set to `MEMBER`,
                        // - `profile_picture` empty,
                        // - `member_identities` from `members`,
                        // - all policies and categories set to their defaults.
                        [groupReflectedAt] = await handle.reflect([
                            {
                                envelope: {
                                    groupSync: getD2dGroupSyncCreate(
                                        {creatorIdentity, groupId},
                                        new Date(),
                                        [...contactOrInitMap.keys()],
                                        '',
                                        GroupUserState.MEMBER,
                                    ),
                                    protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                                },
                                flags: D2mMessageFlags.none(),
                            },
                        ]);
                        // 5.10  If `group` is defined:
                    } else {
                        //  5.10.1 Remove all members from `added-members` that are in
                        // `group.members`.
                        addedMembers = differenceWithTransform(
                            addedMembers,
                            group_.view.members,
                            (currentMember) => currentMember.get().view.identity,
                        );

                        // 5.10.2 Let `removed-members` be a copy of `group.members`.

                        // 5.10.3  Remove all members from `removed-members` that are in `members`.
                        removedMembers = difference(
                            new Set(
                                [...group_.view.members].map(
                                    (currentMember) => currentMember.get().view.identity,
                                ),
                            ),
                            new Set(contactOrInitMap.keys()),
                        );

                        // 5.10.4 (MD) Reflect a `GroupSync.Update` with `member_state_changes`
                        // constructed from `added-members` and `removed-members` and `group` set to
                        // contain the following additional properties:
                        // - `user_state` set to `MEMBER`,
                        // - `member_identities` from `members`.
                        [groupReflectedAt] = await handle.reflect([
                            {
                                envelope: {
                                    groupSync: getD2dGroupSyncUpdate(
                                        {creatorIdentity, groupId},
                                        {
                                            view: group_.view,
                                            update: {
                                                userState: GroupMemberState.MEMBER,
                                            },
                                        },
                                        {
                                            addedIdentities: [...addedMembers],
                                            removedIdentities: {
                                                removed: [...removedMembers],
                                                // Because this is a group setup, all removed
                                                // members must have been kicked.
                                                type: GroupMemberState.KICKED,
                                            },
                                            memberIdentities: [...contactOrInitMap.keys()],
                                        },
                                    ),
                                    protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                                },
                                flags: D2mMessageFlags.none(),
                            },
                        ]);
                    }

                    return {
                        addedContacts: [...contactOrInitMap.values()]
                            .filter(
                                (contact): contact is ContactInitFragment =>
                                    !(contact instanceof ModelStore) &&
                                    contact !== 'invalid' &&
                                    contact !== 'me',
                            )
                            .map(
                                (contact): ContactInit => ({
                                    ...contact,
                                    nickname: undefined,
                                    acquaintanceLevel: AcquaintanceLevel.GROUP_OR_DELETED,
                                }),
                            ),
                        addedMembers,
                        groupMembers: [...contactOrInitMap.keys()],
                        removedMembers,
                        groupReflectedAt,
                    };
                },
            );

            // 11. (MD) Commit the transaction and await acknowledgement.

            // 5.1.1 (Precondition failed) If the sender (creator) contact does not exist, log an
            //    error, discard the message and abort these steps.
            if (!transactionCompleted(state)) {
                this._log.warn(
                    'Transaction was aborted by precondition, not persisting changes to the database',
                );
                return;
            }

            // 12. If the user is currently participating in a group call of this group, remove all
            // removed-members participants from the group call (handle them as if they left the
            // call) and unblock all pending group call flows for added-members.

            // Nothing to do here since the above step happens internally in the ongoing group call.

            // 13. Persist newly added contacts from `members`.
            assert(message !== undefined);
            for (const contactInit of message.addedContacts) {
                this._services.model.contacts.add.direct(contactInit);
            }

            const memberModels = message.groupMembers.map((memberIdentity) =>
                unwrap(
                    this._services.model.contacts.getByIdentity(memberIdentity),
                    'Contact must exist at creation of group.',
                ),
            );

            // 14. Persist the newly created group or the member changes to the group. If the group
            //     was previously marked as _left_, remove the _left_ mark.
            if (group === undefined) {
                // If this is a group setup for an unknown group, just create it.
                const creator = this._services.model.contacts.getByIdentity(creatorIdentity);
                // On a group-setup of an unknown identity, a corresponding contact is created in
                // `incoming-message.ts`.
                assert(creator !== undefined);
                await this._addGroup(
                    handle,
                    {
                        groupId,
                        creator,
                        // Name will be updated by group name message
                        name: '',
                        colorIndex: idColorIndex({
                            type: ReceiverType.GROUP,
                            creatorIdentity,
                            groupId,
                        }),
                        userState: GroupUserState.MEMBER,
                        category: ConversationCategory.DEFAULT,
                        visibility: ConversationVisibility.SHOW,
                    },
                    memberModels,
                    message.groupReflectedAt,
                );
            } else {
                // If the group already existed, we persist the new members and our new user state.
                await group.controller.setMembers.fromRemote(
                    handle,
                    memberModels,
                    new Date(),
                    GroupUserState.MEMBER,
                );
            }

            // For backward compatibility, reflect the CSP-message here.
            await this._reflectIncomingGroupSetup(handle);
        }
    }

    /** @inheritdoc */
    private async _addGroup(
        handle: ActiveTaskCodecHandle<'volatile'>,
        init: Omit<GroupInit, 'createdAt'>,
        members: ModelStore<Contact>[],
        reflectedAt: Date,
    ): Promise<void> {
        await this._services.model.groups.add.fromRemote(
            handle,
            {...init, createdAt: reflectedAt},
            members,
        );
    }

    /** @inheritdoc */
    private async _reflectIncomingGroupSetup(
        handle: ActiveTaskCodecHandle<'volatile'>,
    ): Promise<Date> {
        const [reflectedAt] = await handle.reflect([
            {
                envelope: new protobuf.d2d.Envelope({
                    incomingMessage: this._reflectGroupSetup,
                    protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                }),
                flags: D2mMessageFlags.none(),
            },
        ]);
        return reflectedAt;
    }
}
