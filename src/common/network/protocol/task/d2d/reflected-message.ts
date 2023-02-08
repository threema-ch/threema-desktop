import type * as v from '@badrap/valita';

import {
    CspE2eContactControlType,
    CspE2eConversationType,
    CspE2eForwardSecurityType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eGroupStatusUpdateType,
    CspE2eStatusUpdateType,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import type * as protobuf from '~/common/network/protobuf';
import {type IncomingMessage, type OutgoingMessage} from '~/common/network/protobuf/validate/d2d';
import {type CspE2eType, cspE2eTypeNameOf, type ReflectedE2eType} from '~/common/network/protocol';
import {
    placeholderTextForUnhandledMessage,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import * as structbuf from '~/common/network/structbuf';
import {isMessageId} from '~/common/network/types';
import {exhausted} from '~/common/utils/assert';

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
): structbuf.validate.csp.e2e.ValidatedCspE2eTypes | undefined {
    const text = placeholderTextForUnhandledMessage(params.maybeReflectedE2eType);

    if (text === undefined) {
        return undefined;
    }

    if ('body' in params) {
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

    public constructor(
        protected readonly _services: ServicesForTasks,
        protected readonly _unvalidatedMessage: TProtoMsg,
        protected readonly _direction: 'incoming' | 'outgoing',
    ) {
        const messageId = isMessageId(_unvalidatedMessage.messageId)
            ? _unvalidatedMessage.messageId
            : 'unknown';
        this._log = _services.logging.logger(
            `network.protocol.task.in-${this._direction}-message.${messageId}`,
        );
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
            this._log.error(
                `Discarding reflected ${this._direction} message due to validation error: ${error}`,
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
    ): structbuf.validate.csp.e2e.ValidatedCspE2eTypes | undefined {
        try {
            const maybeReflectedE2eType = type as ReflectedE2eType;
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
                case CspE2eConversationType.LOCATION:
                    // TODO(WEBMD-248): Full implementation
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
                case CspE2eGroupConversationType.GROUP_LOCATION: {
                    // TODO(WEBMD-248): Full implementation
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
                    // TODO(WEBMD-590): Handle this
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
                case CspE2eGroupControlType.GROUP_REQUEST_SYNC: {
                    const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(body),
                    );
                    return {
                        type: CspE2eGroupControlType.GROUP_REQUEST_SYNC,
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
                case CspE2eStatusUpdateType.TYPING_INDICATOR:
                    // TODO(WEBMD-589): Implement
                    return undefined;

                // Forward security messages (not currently supported, should not get reflected)
                case CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE:
                    // TODO(WEBMD-887): Implement support for PFS
                    return undefined;

                // Unhandled messages
                case CspE2eConversationType.DEPRECATED_IMAGE: // TODO(WEBMD-586)
                case CspE2eConversationType.DEPRECATED_AUDIO: // TODO(WEBMD-586)
                case CspE2eConversationType.DEPRECATED_VIDEO: // TODO(WEBMD-586)
                case CspE2eConversationType.FILE: // TODO(WEBMD-307)
                case CspE2eConversationType.POLL_SETUP: // TODO(WEBMD-244)
                case CspE2eConversationType.POLL_VOTE: // TODO(WEBMD-244)
                case CspE2eConversationType.CALL_OFFER: // TODO(WEBMD-243)
                case CspE2eConversationType.CALL_ANSWER: // TODO(WEBMD-243)
                case CspE2eConversationType.CALL_ICE_CANDIDATE: // TODO(WEBMD-243)
                case CspE2eConversationType.CALL_HANGUP: // TODO(WEBMD-243)
                case CspE2eConversationType.CALL_RINGING: // TODO(WEBMD-243)
                    return unhandled({maybeReflectedE2eType});
                case CspE2eGroupControlType.GROUP_CALL_START: // TODO(WEBMD-858)
                case CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE: // TODO(WEBMD-586)
                case CspE2eGroupConversationType.GROUP_AUDIO: // TODO(WEBMD-586)
                case CspE2eGroupConversationType.GROUP_VIDEO: // TODO(WEBMD-586)
                case CspE2eGroupConversationType.GROUP_FILE: // TODO(WEBMD-307)
                case CspE2eGroupConversationType.GROUP_POLL_SETUP: // TODO(WEBMD-244)
                case CspE2eGroupConversationType.GROUP_POLL_VOTE: // TODO(WEBMD-244)
                case CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT: // TODO(WEBMD-594)
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
