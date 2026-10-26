import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
import {UTF8} from '@threema/ts-utils/codec/utf8';
import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';
import type {u53} from '@threema/ts-utils/integer/u53';

import {CspE2eGroupControlType, GroupUserState, type ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact} from '~/common/model';
import {getIdentityString, type ContactModelStore} from '~/common/model/contact';
import type {GroupModelStore} from '~/common/model/group';
import * as protobuf from '~/common/network/protobuf';
import type {LayerEncoder, MessageTypeEncoders} from '~/common/network/protocol';
import {encryptAndUploadBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    OutgoingCspMessagesTask,
    type CspMessage,
    type DynamicMessage,
    type IndividualMessageProperties,
} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import type {
    D2dRemoveProfilePicture,
    D2dSetProfilePicture,
} from '~/common/network/protocol/task/d2d';
import * as structbuf from '~/common/network/structbuf';
import type {IdentityString, MessageId} from '~/common/network/types';
import {difference} from '~/common/utils/set';

export type CspProfilePictureUpdate =
    | D2dRemoveProfilePicture
    | (D2dSetProfilePicture & {
          readonly profilePictureSize: u53;
          readonly profilePictureBytes: ReadonlyUint8Array;
      });

/**
 * Create a group setup encoder that is only applied for a specific set of group members.
 *
 * Note: We use `identity` here instead of the contact directly to make sure that no races with
 * model lifetime cycles occur.
 */
function groupSetupSpecifics(
    emptyMemberSetEncoder: LayerEncoder<MessageTypeEncoders[CspE2eGroupControlType.GROUP_SETUP]>,
    memberSetEncoder: LayerEncoder<MessageTypeEncoders[CspE2eGroupControlType.GROUP_SETUP]>,
    emptyMemberReceiverSet: ReadonlySet<IdentityString>,
    messageProperties: IndividualMessageProperties<
        ReceiverType.GROUP,
        CspE2eGroupControlType.GROUP_SETUP
    >,
): DynamicMessage<ReceiverType.GROUP> {
    return (contact: Contact) => {
        if (emptyMemberReceiverSet.has(contact.view.identity)) {
            return {encoder: emptyMemberSetEncoder, messageProperties};
        }
        return {encoder: memberSetEncoder, messageProperties};
    };
}

export class ActiveGroupUpdateTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _group: GroupModelStore,
        private readonly _messageIds: readonly [MessageId, MessageId, MessageId, MessageId],
        private readonly _changes: {
            readonly addMembers: ReadonlySet<ContactModelStore>;
            readonly removeMembers: ReadonlySet<ContactModelStore>;
            readonly profilePicture?: CspProfilePictureUpdate;
        },
    ) {
        const groupIdHex = u64ToHexLe(this._group.ctx);
        this._log = this._services.logging.logger(
            `network.protocol.task.active-group-update.${groupIdHex}`,
        );
    }
    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // 1. If the user is not the creator of the group or the group is marked as left, log an
        //    error and abort these steps.
        if (
            this._group.get().view.creator !== 'me' ||
            this._group.get().view.userState !== GroupUserState.MEMBER
        ) {
            this._log.error('The user is not the creator or has left the group. Aborting');
            return;
        }

        const {groupId, members} = this._group.get().view;
        const addMembers = new Set([...this._changes.addMembers]);

        // 5. Remove all members from changes.add-members that are not in group.members.
        for (const addMember of addMembers) {
            if (!members.has(addMember)) {
                addMembers.delete(addMember);
            }
        }
        // 6. Remove all members from changes.remove-members that are in group.members.
        const removeMembers = difference(this._changes.removeMembers, members);

        const emptyMemberSetEncoder = structbuf.bridge.encoder(
            structbuf.csp.e2e.GroupCreatorContainer,
            {
                groupId,
                innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupSetup, {
                    members: [],
                }),
            },
        );

        const memberSetEncoder = structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
            groupId,
            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupSetup, {
                members: [...this._group.get().view.members].map((member) =>
                    UTF8.encode(member.get().view.identity),
                ),
            }),
        });

        // 7. Let messages be an empty list.
        const messages: CspMessage[] = [];

        // We can combine step 8 and 9.1 into a single message. All `extra` will get an
        // empty group setup here (they are not anymore members of the group) and all others will
        // get the standard group setup with the new member list.
        const groupSetupIndividualProperties: IndividualMessageProperties<
            ReceiverType.GROUP,
            CspE2eGroupControlType.GROUP_SETUP
        > = {
            cspMessageFlags: CspMessageFlags.none(),
            type: CspE2eGroupControlType.GROUP_SETUP,
        };
        messages.push({
            sharedMessageProperties: {
                allowUserProfileDistribution: true,
                createdAt: new Date(),
                messageId: this._messageIds[0],
                overrideReflectedProperty: false,
            },
            receiver: {
                main: this._group.get(),
                extra: new Set([...removeMembers].map((contact) => contact.get())),
            },
            specifics: {
                default: {
                    encoder: memberSetEncoder,
                    messageProperties: groupSetupIndividualProperties,
                },
                dynamic: groupSetupSpecifics(
                    emptyMemberSetEncoder,
                    memberSetEncoder,
                    new Set([...removeMembers].map((contact) => contact.get().view.identity)),
                    groupSetupIndividualProperties,
                ),
            },
        });

        // TODO(DESK-1852): Only do the following CSP messages if the group has members.

        // 9.2 Add a message entry to messages to announce the group's name to the members.
        messages.push({
            sharedMessageProperties: {
                allowUserProfileDistribution: true,
                createdAt: new Date(),
                messageId: this._messageIds[1],
                overrideReflectedProperty: false,
            },
            receiver: {
                main: this._group.get(),
            },
            specifics: {
                default: {
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
                        groupId,
                        innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupName, {
                            name: UTF8.encode(this._group.get().view.name),
                        }),
                    }),
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_NAME,
                        cspMessageFlags: CspMessageFlags.none(),
                    },
                },
            },
        });

        const profilePictureBlob = this._group.get().controller.profilePicture.get().view.picture;
        // 9.3.1 Let profile-picture-blob be changes.profile-picture.blob.
        let profilePictureToBeSent = this._changes.profilePicture;
        if (profilePictureBlob !== undefined) {
            // 9.3.2 If group.profile-picture does not equal changes.profile-picture, upload
            // group.profile-picture to the blob server with the persist flag and set
            // profile-picture-blob to the result.
            if (
                this._changes.profilePicture?.type !== 'set' ||
                !byteEquals(profilePictureBlob, this._changes.profilePicture.profilePictureBytes)
            ) {
                const blobInfo = await encryptAndUploadBlob(
                    this._services,
                    profilePictureBlob,
                    BLOB_FILE_NONCE,
                    'public-persistent',
                );

                profilePictureToBeSent = {
                    type: 'set',
                    blob: {
                        blobId: blobInfo.id,
                        key: blobInfo.key,
                        nonce: blobInfo.nonce,
                        uploadedAt: new Date(),
                    },
                    profilePictureSize: profilePictureBlob.byteLength,
                    profilePictureBytes: profilePictureBlob,
                };
            }
        }

        // 9.4 Add a message entry to messages to announce the group's profile picture to the
        // members.
        messages.push({
            sharedMessageProperties: {
                messageId: this._messageIds[2],
                createdAt: new Date(),
                allowUserProfileDistribution: false,
            },
            receiver: {
                main: this._group.get(),
            },
            specifics:
                profilePictureToBeSent === undefined || profilePictureToBeSent.type === 'removed'
                    ? {
                          default: {
                              encoder: structbuf.bridge.encoder(
                                  structbuf.csp.e2e.GroupCreatorContainer,
                                  {
                                      groupId,
                                      innerData: structbuf.bridge.encoder(
                                          structbuf.csp.e2e.DeleteProfilePicture,
                                          {},
                                      ),
                                  },
                              ),
                              messageProperties: {
                                  cspMessageFlags: CspMessageFlags.none(),
                                  type: CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE,
                              },
                          },
                      }
                    : {
                          default: {
                              encoder: structbuf.bridge.encoder(
                                  structbuf.csp.e2e.GroupCreatorContainer,
                                  {
                                      groupId,
                                      innerData: structbuf.bridge.encoder(
                                          structbuf.csp.e2e.SetProfilePicture,
                                          {
                                              key: profilePictureToBeSent.blob.key.unwrap(),
                                              pictureBlobId: profilePictureToBeSent.blob
                                                  .blobId as unknown as Uint8Array,
                                              pictureSize:
                                                  profilePictureToBeSent.profilePictureSize,
                                          },
                                      ),
                                  },
                              ),
                              messageProperties: {
                                  cspMessageFlags: CspMessageFlags.none(),
                                  type: CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE,
                              },
                          },
                      },
        });

        // 9.5 Let chosen-call be the result of the most recent invocation of the Group Call Refresh Steps for the group.
        const chosenCall = this._group.get().controller.call.get();

        // 9.6 If chosen-call is defined, add a message entry to messages to announce the
        // ongoing group call.
        if (chosenCall !== undefined) {
            messages.push({
                sharedMessageProperties: {
                    messageId: this._messageIds[3],
                    createdAt: chosenCall.base.startedAt,
                    allowUserProfileDistribution: true,
                },
                specifics: {
                    default: {
                        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                            groupId,
                            creatorIdentity: UTF8.encode(
                                getIdentityString(
                                    this._services.device,
                                    this._group.get().view.creator,
                                ),
                            ),
                            innerData: protobuf.utils.encoder(protobuf.csp_e2e.GroupCallStart, {
                                protocolVersion: chosenCall.base.protocolVersion,
                                gck: chosenCall.base.gck.unwrap(),
                                sfuBaseUrl: chosenCall.base.sfuBaseUrl.raw,
                            }),
                        }),
                        messageProperties: {
                            type: CspE2eGroupControlType.GROUP_CALL_START,
                            cspMessageFlags: CspMessageFlags.fromPartial({
                                sendPushNotification: true,
                            }),
                        },
                    },
                },
                receiver: {main: this._group.get()},
            });
        }

        // 10. Run the Bundled Messages Send Steps with messages.
        await new OutgoingCspMessagesTask(this._services, messages).run(handle);
    }
}
