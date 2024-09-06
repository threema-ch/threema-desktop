import type {
    CspE2eContactControlType,
    CspE2eConversationType,
    CspE2eForwardSecurityType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eStatusUpdateType,
    ReceiverType,
    CspE2eGroupStatusUpdateType,
    CspE2eGroupMessageUpdateType,
    CspE2eMessageUpdateType,
} from '~/common/enum';
import type {AnyReceiver} from '~/common/model';
import type {CspE2eType, LayerEncoder} from '~/common/network/protocol';
import type {CspMessageFlags} from '~/common/network/protocol/flags';
import type {MessageId} from '~/common/network/types';

/**
 * Message properties required to send a legacy CSP Message.
 */
export interface MessageProperties<TMessageEncoder, MessageType extends CspE2eType> {
    readonly type: MessageType;
    readonly encoder: LayerEncoder<TMessageEncoder>;
    readonly cspMessageFlags: CspMessageFlags;
    readonly messageId: MessageId;
    readonly createdAt: Date;
    /**
     * Whether the profile (nickname and profile picture) may be shared with the recipient of this
     * outgoing message. There are other criteria to whether or not and how the profile picture is
     * shared, which are outlined by the `profile picture distribution steps`.
     */
    readonly allowUserProfileDistribution: boolean;
    readonly overrideReflectedProperty?: boolean;
}

/**
 * Messages that are sent to all group members.
 */
type ValidGroupMessages =
    | CspE2eGroupConversationType
    | CspE2eGroupStatusUpdateType
    | CspE2eGroupMessageUpdateType
    // Note: GROUP_SYNC_REQUEST is excluded, because it is only sent to the creator, not to all members
    | Exclude<CspE2eGroupControlType, CspE2eGroupControlType.GROUP_SYNC_REQUEST>;

/**
 * Messages that are sent to single contacts.
 */
type ValidContactMessages =
    | CspE2eConversationType
    | CspE2eStatusUpdateType
    | CspE2eContactControlType
    | CspE2eMessageUpdateType
    // Note: GROUP_CALL_START is always sent to the whole group, not to a single contact
    | Exclude<CspE2eGroupControlType, CspE2eGroupControlType.GROUP_CALL_START>
    | CspE2eForwardSecurityType;

/**
 * All valid {@link CspE2eType} types that may be sent for a specific receiver.
 *
 * {@link DistributionList}s are treated the same as {@link Contact}s.
 */
export type ValidCspMessageTypeForReceiver<TReceiver extends AnyReceiver> = {
    [ReceiverType.CONTACT]: ValidContactMessages;
    [ReceiverType.GROUP]: ValidGroupMessages;
    [ReceiverType.DISTRIBUTION_LIST]: never; // TODO(DESK-237)
}[TReceiver['type']];
