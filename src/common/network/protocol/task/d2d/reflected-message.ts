import type * as v from '@badrap/valita';

import {
    CspE2eContactControlType,
    CspE2eConversationType,
    CspE2eForwardSecurityType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eGroupMessageUpdateType,
    CspE2eGroupStatusUpdateType,
    CspE2eMessageUpdateType,
    CspE2eStatusUpdateType,
    CspE2eWebSessionResumeType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import * as protobuf from '~/common/network/protobuf';
import type {IncomingMessage, OutgoingMessage} from '~/common/network/protobuf/validate/d2d';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {type CspE2eType, cspE2eTypeNameOf, type ReflectedE2eType} from '~/common/network/protocol';
import {
    placeholderTextForUnhandledMessage,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import * as structbuf from '~/common/network/structbuf';
import type {D2mDeviceId} from '~/common/network/types';
import {exhausted} from '~/common/utils/assert';
import {intoU64, u64ToHexLe} from '~/common/utils/number';
import {hasProperty} from '~/common/utils/object';

function unhandled(
    params:
        | {
              maybeReflectedE2eType: CspE2eConversationType;
          }
        | {
              maybeReflectedE2eType:
                  | CspE2eGroupControlType
                  | CspE2eGroupConversationType
                  | CspE2eGroupStatusUpdateType;
              body: Uint8Array;
          },
): structbuf.validate.csp.e2e.ValidatedCspE2eTypesStructbuf | undefined {
    const text = placeholderTextForUnhandledMessage(params.maybeReflectedE2eType);

    if (text === undefined) {
        return undefined;
    }

    if (hasProperty(params, 'body')) {
        return {
            type: CspE2eGroupConversationType.GROUP_TEXT,
            message: {
                text,
            },
            container: structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupMemberContainer.decode(params.body),
            ),
        };
    }

    return {
        type: CspE2eConversationType.TEXT,
        message: {
            text,
        },
        container: undefined,
    };
}

/**
 * Base task for processing reflected messages (either incoming or outgoing).
 */
export abstract class ReflectedMessageTaskBase<
    TProtoMsg extends protobuf.d2d.IncomingMessage | protobuf.d2d.OutgoingMessage,
> {
    protected readonly _log: Logger;
    protected readonly _senderDeviceIdString: string;

    public constructor(
        protected readonly _services: ServicesForTasks,
        protected readonly _unvalidatedMessage: TProtoMsg,
        senderDeviceId: D2mDeviceId,
        protected readonly _direction: 'incoming' | 'outgoing',
    ) {
        let messageIdHex;
        try {
            const messageId = MESSAGE_ID_SCHEMA.parse(_unvalidatedMessage.messageId);
            messageIdHex = u64ToHexLe(messageId);
        } catch {
            messageIdHex = 'unknown';
        }

        this._log = _services.logging.logger(
            `network.protocol.task.in-${this._direction}-message.${messageIdHex}`,
        );
        this._senderDeviceIdString = u64ToHexLe(senderDeviceId);
    }

    /**
     * Validate the protobuf message with the provided schema.
     *
     * If valid, return it together with the message type debug string.
     *
     * If validation fails, an error is logged and `undefined` is returned. The caller should stop
     * processing the message immediately.
     */
    protected _validateProtobuf<
        TSchema extends typeof IncomingMessage.SCHEMA | typeof OutgoingMessage.SCHEMA,
    >(
        unvalidatedMessage: TProtoMsg,
        schema: TSchema,
    ): {validatedMessage: v.Infer<TSchema>; messageTypeDebug: string} | undefined {
        let validatedMessage;
        try {
            validatedMessage = schema.parse(unvalidatedMessage) as v.Infer<TSchema>;
        } catch (error) {
            let messageIdHex;
            try {
                messageIdHex = u64ToHexLe(intoU64(unvalidatedMessage.messageId));
            } catch (innerError) {
                messageIdHex = 'unknown';
            }
            this._log.error(
                `Discarding reflected ${this._direction} message with ID ${messageIdHex} due to validation error: ${error}`,
            );
            return undefined;
        }

        const messageTypeDebug =
            cspE2eTypeNameOf(validatedMessage.type) ??
            `<unknown> (0x${validatedMessage.type.toString(16)})`;

        return {validatedMessage, messageTypeDebug};
    }

    /**
     * Decode and validate the CSP message.
     *
     * If valid, return the validated type.
     *
     * If validation fails, an error is logged and `undefined` is returned. The caller should stop
     * processing the message immediately.
     */
    protected _decodeMessage<T extends CspE2eType>(
        type: T,
        body: Uint8Array,
        messageTypeDebug: string,
    ):
        | structbuf.validate.csp.e2e.ValidatedCspE2eTypesStructbuf
        | protobuf.validate.csp_e2e.ValidatedCspE2eTypesProtobuf
        | undefined {
        try {
            const maybeReflectedE2eType = type satisfies ReflectedE2eType;
            switch (maybeReflectedE2eType) {
                // Contact conversation messages
                case CspE2eConversationType.TEXT:
                    return {
                        type: CspE2eConversationType.TEXT,
                        message: structbuf.validate.csp.e2e.Text.SCHEMA.parse(
                            structbuf.csp.e2e.Text.decode(body),
                        ),
                        container: undefined,
                    };
                case CspE2eConversationType.FILE:
                    return {
                        type: CspE2eConversationType.FILE,
                        message: structbuf.validate.csp.e2e.File.SCHEMA.parse(
                            structbuf.csp.e2e.File.decode(body),
                        ),
                        container: undefined,
                    };
                case CspE2eConversationType.LOCATION:
                    // TODO(DESK-248): Full implementation
                    return {
                        type: CspE2eConversationType.LOCATION,
                        message: structbuf.validate.csp.e2e.Location.SCHEMA.parse(
                            structbuf.csp.e2e.Location.decode(body),
                        ),
                        container: undefined,
                    };

                // Group conversation messages
                case CspE2eGroupConversationType.GROUP_TEXT: {
                    const container = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupConversationType.GROUP_TEXT,
                        message: structbuf.validate.csp.e2e.Text.SCHEMA.parse(
                            structbuf.csp.e2e.Text.decode(container.innerData),
                        ),
                        container,
                    };
                }
                case CspE2eGroupConversationType.GROUP_FILE: {
                    const container = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupConversationType.GROUP_FILE,
                        message: structbuf.validate.csp.e2e.File.SCHEMA.parse(
                            structbuf.csp.e2e.File.decode(container.innerData),
                        ),
                        container,
                    };
                }
                case CspE2eGroupConversationType.GROUP_LOCATION: {
                    // TODO(DESK-248): Full implementation
                    const container = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupConversationType.GROUP_LOCATION,
                        message: structbuf.validate.csp.e2e.Location.SCHEMA.parse(
                            structbuf.csp.e2e.Location.decode(container.innerData),
                        ),
                        container,
                    };
                }

                // Contact control messages
                case CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE:
                case CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE:
                    // This is already covered by contact sync messages, nothing to do here
                    return undefined;
                case CspE2eContactControlType.CONTACT_REQUEST_PROFILE_PICTURE:
                    // TODO(DESK-590): Handle this
                    return undefined;

                // Group control messages
                case CspE2eGroupControlType.GROUP_SETUP: {
                    const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_SETUP,
                        message: structbuf.validate.csp.e2e.GroupSetup.SCHEMA.parse(
                            structbuf.csp.e2e.GroupSetup.decode(container.innerData),
                        ),
                        container,
                    };
                }
                case CspE2eGroupControlType.GROUP_NAME: {
                    const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_NAME,
                        message: structbuf.validate.csp.e2e.GroupName.SCHEMA.parse(
                            structbuf.csp.e2e.GroupName.decode(container.innerData),
                        ),
                        container,
                    };
                }
                case CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE: {
                    const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE,
                        message: structbuf.validate.csp.e2e.SetProfilePicture.SCHEMA.parse(
                            structbuf.csp.e2e.SetProfilePicture.decode(container.innerData),
                        ),
                        container,
                    };
                }
                case CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE: {
                    const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE,
                        message: undefined,
                        container,
                    };
                }
                case CspE2eGroupControlType.GROUP_LEAVE: {
                    const container = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_LEAVE,
                        message: undefined,
                        container,
                    };
                }
                case CspE2eGroupControlType.GROUP_SYNC_REQUEST: {
                    const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_SYNC_REQUEST,
                        message: undefined,
                        container,
                    };
                }

                // Status messages
                case CspE2eStatusUpdateType.DELIVERY_RECEIPT:
                    return {
                        type: CspE2eStatusUpdateType.DELIVERY_RECEIPT,
                        message: structbuf.validate.csp.e2e.DeliveryReceipt.SCHEMA.parse(
                            structbuf.csp.e2e.DeliveryReceipt.decode(body),
                        ),
                        container: undefined,
                    };
                case CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT: {
                    const container = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT,
                        message: {
                            groupId: container.groupId,
                            creatorIdentity: container.creatorIdentity,
                            innerData: container.innerData,
                        },
                        container: undefined,
                    };
                }
                // Message Update types
                case CspE2eMessageUpdateType.EDIT_MESSAGE: {
                    const message = protobuf.validate.csp_e2e.EditMessage.SCHEMA.parse(
                        protobuf.csp_e2e.EditMessage.decode(body),
                    );
                    return {
                        type: CspE2eMessageUpdateType.EDIT_MESSAGE,
                        message: {
                            messageId: message.messageId,
                            text: message.text,
                        },
                    };
                }
                case CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE: {
                    const container = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE,
                        message: container,
                    };
                }

                case CspE2eMessageUpdateType.DELETE_MESSAGE: // TODO(DESK-1389)
                case CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE: // TODO(DESK-1389)
                    this._log.warn(
                        `Discarding unsupported ${this._direction} ${messageTypeDebug} message`,
                    );
                    return undefined;

                case CspE2eStatusUpdateType.TYPING_INDICATOR:
                    // TODO(DESK-589): Implement
                    return undefined;

                // Forward security messages (not currently supported, should not get reflected)
                case CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE:
                    // TODO(DESK-887): Implement support for PFS
                    return undefined;

                // Web session resume messages
                case CspE2eWebSessionResumeType.WEB_SESSION_RESUME:
                    this._log.warn('Received an unexpected reflected web-session-resume message');
                    return undefined;

                // Unhandled messages
                case CspE2eConversationType.DEPRECATED_IMAGE: // TODO(DESK-586)
                case CspE2eConversationType.DEPRECATED_AUDIO: // TODO(DESK-586)
                case CspE2eConversationType.DEPRECATED_VIDEO: // TODO(DESK-586)
                case CspE2eConversationType.POLL_SETUP: // TODO(DESK-244)
                case CspE2eConversationType.POLL_VOTE: // TODO(DESK-244)
                case CspE2eConversationType.CALL_OFFER: // TODO(DESK-243)
                case CspE2eConversationType.CALL_ANSWER: // TODO(DESK-243)
                case CspE2eConversationType.CALL_ICE_CANDIDATE: // TODO(DESK-243)
                case CspE2eConversationType.CALL_HANGUP: // TODO(DESK-243)
                case CspE2eConversationType.CALL_RINGING: // TODO(DESK-243)
                    return unhandled({maybeReflectedE2eType});
                case CspE2eGroupControlType.GROUP_CALL_START: // TODO(DESK-858)
                case CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE: // TODO(DESK-586)
                case CspE2eGroupConversationType.GROUP_AUDIO: // TODO(DESK-586)
                case CspE2eGroupConversationType.GROUP_VIDEO: // TODO(DESK-586)
                case CspE2eGroupConversationType.GROUP_POLL_SETUP: // TODO(DESK-244)
                case CspE2eGroupConversationType.GROUP_POLL_VOTE: // TODO(DESK-244)
                    return unhandled({maybeReflectedE2eType, body});

                default:
                    this._log.warn(
                        `Discarding unsupported ${this._direction} ${messageTypeDebug} message`,
                    );
                    return exhausted(maybeReflectedE2eType, undefined);
            }
        } catch (error) {
            this._log.info(
                `Discarding ${this._direction} ${messageTypeDebug} message with invalid content: ${error}`,
            );
            return undefined;
        }
    }
}
