import {CspMessageFlag, MessageType, D2mMessageFlag} from '~/common/enum';
import type {u8} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

/**
 * Message flags as defined in the chat server protocol (CSP).
 */
export interface CspMessageFlagsInterface {
    /**
     * Send push notification.
     *
     * Only use this for messages that require a notification. For example, do not set this for
     * delivery receipts.
     */
    sendPushNotification: boolean;
    /**
     * Don't queue.
     *
     * Use this for messages that can be discarded in case the receiver is not connected to the chat
     * server, e.g. the _typing_ indicator.
     */
    dontQueue: boolean;
    /**
     * Don't acknowledge.
     *
     * Use this for messages where reliable delivery and acknowledgement is not essential, e.g. the
     * _typing_ indicator.
     */
    dontAck: boolean;
    /**
     * Group message marker.
     *
     * Use this for all group messages. In iOS clients, this will be used for notifications to
     * reflect that a group message has been received in case no connection to the server could be
     * established.
     */
    groupMessage: boolean;
    /**
     * Immediate delivery required.
     *
     * Only use for messages that require the use of the high-priority push token of the receiver.
     * Messages with this flag will only be queued for 60 seconds.
     */
    immediateDeliveryRequired: boolean;
    /**
     * Don't send delivery receipts.
     *
     * This may not be sent by the apps but can be used by Threema Gateway IDs which do not
     * necessarily want a delivery receipt for a message.
     */
    dontSendDeliveryReceipts: boolean;
}

/**
 * CSP message flags.
 */
export class CspMessageFlags implements CspMessageFlagsInterface {
    /** @inheritdoc */
    public sendPushNotification;
    /** @inheritdoc */
    public dontQueue;
    /** @inheritdoc */
    public dontAck;
    /** @inheritdoc */
    public groupMessage;
    /** @inheritdoc */
    public immediateDeliveryRequired;
    /** @inheritdoc */
    public dontSendDeliveryReceipts;

    public constructor(init: CspMessageFlagsInterface) {
        this.sendPushNotification = init.sendPushNotification;
        this.dontQueue = init.dontQueue;
        this.dontAck = init.dontAck;
        this.groupMessage = init.groupMessage;
        this.immediateDeliveryRequired = init.immediateDeliveryRequired;
        this.dontSendDeliveryReceipts = init.dontSendDeliveryReceipts;
    }

    /**
     * Create an CspMessageFlags instance with no flags set.
     */
    public static none(): CspMessageFlags {
        return new CspMessageFlags({
            sendPushNotification: false,
            dontQueue: false,
            dontAck: false,
            groupMessage: false,
            immediateDeliveryRequired: false,
            dontSendDeliveryReceipts: false,
        });
    }

    /**
     * Create an instance from a partial {@link CspMessageFlagsInterface}
     */
    public static fromPartial(init: Partial<CspMessageFlagsInterface>): CspMessageFlags {
        return new CspMessageFlags({
            /* eslint-disable no-bitwise */
            sendPushNotification: init.sendPushNotification ?? false,
            dontQueue: init.dontQueue ?? false,
            dontAck: init.dontAck ?? false,
            groupMessage: init.groupMessage ?? false,
            immediateDeliveryRequired: init.immediateDeliveryRequired ?? false,
            dontSendDeliveryReceipts: init.dontSendDeliveryReceipts ?? false,
            /* eslint-enable no-bitwise */
        });
    }

    /**
     * Create an instance from a 1-byte CSP bitmask.
     */
    public static fromBitmask(flags: u8): CspMessageFlags {
        return new CspMessageFlags({
            /* eslint-disable no-bitwise */
            sendPushNotification: (flags & CspMessageFlag.SEND_PUSH_NOTIFICATION) > 0,
            dontQueue: (flags & CspMessageFlag.DONT_QUEUE) > 0,
            dontAck: (flags & CspMessageFlag.DONT_ACK) > 0,
            groupMessage: (flags & CspMessageFlag.GROUP_MESSAGE) > 0,
            immediateDeliveryRequired: (flags & CspMessageFlag.IMMEDIATE_DELIVERY_REQUIRED) > 0,
            dontSendDeliveryReceipts: (flags & CspMessageFlag.DONT_SEND_DELIVERY_RECEIPTS) > 0,
            /* eslint-enable no-bitwise */
        });
    }

    /**
     * Return the appropriate flags for the specified message type.
     */
    public static forMessageType(messageType: MessageType): CspMessageFlags {
        switch (messageType) {
            case MessageType.TEXT:
            case MessageType.FILE:
            case MessageType.IMAGE:
            case MessageType.VIDEO:
            case MessageType.AUDIO:
            case MessageType.DELETED:
                return CspMessageFlags.fromPartial({sendPushNotification: true});
            default:
                return unreachable(messageType);
        }
    }

    /**
     * Create a 1-byte CSP bitmask from the flags.
     */
    public toBitmask(): u8 {
        return (
            // eslint-disable-next-line no-bitwise
            (this.sendPushNotification ? CspMessageFlag.SEND_PUSH_NOTIFICATION : 0) |
            (this.dontQueue ? CspMessageFlag.DONT_QUEUE : 0) |
            (this.dontAck ? CspMessageFlag.DONT_ACK : 0) |
            (this.groupMessage ? CspMessageFlag.GROUP_MESSAGE : 0) |
            (this.immediateDeliveryRequired ? CspMessageFlag.IMMEDIATE_DELIVERY_REQUIRED : 0) |
            (this.dontSendDeliveryReceipts ? CspMessageFlag.DONT_SEND_DELIVERY_RECEIPTS : 0)
        );
    }
}

/**
 * Message flags defined by the device-to-mediator (D2M) protocol.
 */
export interface D2mMessageFlagsInterface {
    /**
     * Mark message as ephemeral and prevent sending an acknowledgement.
     *
     * Use this flag if the server should only forward this message to devices that are currently
     * connected and an acknowledgement must not be sent.
     */
    ephemeral: boolean;
}

/**
 * D2M message flags.
 */
export class D2mMessageFlags implements D2mMessageFlagsInterface {
    /** @inheritdoc */
    public ephemeral;

    public constructor(init: D2mMessageFlagsInterface) {
        this.ephemeral = init.ephemeral;
    }

    /**
     * Create a {@link D2mMessageFlags} instance with no flags set.
     */
    public static none(): D2mMessageFlags {
        return new D2mMessageFlags({
            ephemeral: false,
        });
    }

    /**
     * Create an instance from a partial {@link D2mMessageFlagsInterface}
     */
    public static fromPartial(init: Partial<D2mMessageFlagsInterface>): D2mMessageFlags {
        return new D2mMessageFlags({
            /* eslint-disable no-bitwise */
            ephemeral: init.ephemeral ?? false,
            /* eslint-enable no-bitwise */
        });
    }

    /**
     * Create a 1-byte D2m bitmask from the flags.
     */
    public toBitmask(): u8 {
        return (
            // eslint-disable-next-line no-bitwise
            this.ephemeral ? D2mMessageFlag.EPHEMERAL : 0
        );
    }
}
