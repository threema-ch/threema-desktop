import {CspE2eForwardSecurityType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {randomMessageId} from '~/common/network/protocol/utils';
import type {IdentityString, MessageId} from '~/common/network/types';
import {intoUnsignedLong, u64ToHexLe} from '~/common/utils/number';

import {OutgoingCspMessageTask} from './outgoing-csp-message';

/**
 * Process incoming forward security envelopes.
 *
 * For now, messages are always rejected (DESK-887).
 */
export class IncomingForwardSecurityEnvelopeTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _senderIdentity: IdentityString;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _messageId: MessageId,
        private readonly _senderContactOrInit: LocalModelStore<Contact> | ContactInit,
        private readonly _fsEnvelope: protobuf.csp_e2e_fs.Envelope,
    ) {
        const messageIdHex = u64ToHexLe(_messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.in-fs-envelope.${messageIdHex}`,
        );
        if (_senderContactOrInit instanceof LocalModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        this._log.info(
            `Processing incoming forward security envelope of type ${this._fsEnvelope.content} from ${this._senderIdentity}`,
        );

        // Only reject certain content types
        switch (this._fsEnvelope.content) {
            case 'encapsulated':
                await this._rejectFsMessage(handle);
                break;
            default:
                // Ignore
                this._log.info(
                    `Ignoring incoming forward security envelope of type ${this._fsEnvelope.content} from ${this._senderIdentity}`,
                );
        }
    }

    private async _rejectFsMessage(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const {crypto} = this._services;

        // Look up receiver
        const receiver = this._getSenderModelStore();
        if (receiver === undefined) {
            return;
        }

        // Create reject envelope
        const encoder = protobuf.utils.encoder(protobuf.csp_e2e_fs.Envelope, {
            sessionId: this._fsEnvelope.sessionId,
            init: undefined,
            accept: undefined,
            reject: protobuf.utils.creator(protobuf.csp_e2e_fs.Reject, {
                rejectedEncapsulatedMessageId: intoUnsignedLong(this._messageId),
                cause: protobuf.csp_e2e_fs.Reject.Cause.DISABLED_BY_LOCAL,
            }),
            terminate: undefined,
            encapsulated: undefined,
        });

        // Send message
        await new OutgoingCspMessageTask(this._services, receiver.get(), {
            type: CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE,
            encoder,
            cspMessageFlags: CspMessageFlags.none(),
            messageId: randomMessageId(crypto),
            createdAt: new Date(),
            allowUserProfileDistribution: false,
        }).run(handle);
        this._log.info('Rejected incoming forward security message');
    }

    private _getSenderModelStore(): LocalModelStore<Contact> | undefined {
        const {model} = this._services;

        if (this._senderContactOrInit instanceof LocalModelStore) {
            return this._senderContactOrInit;
        }

        const store = model.contacts.getByIdentity(this._senderContactOrInit.identity);
        if (store === undefined) {
            this._log.warn(
                `Did not find contact with identity ${this._senderContactOrInit.identity}`,
            );
        }
        return store;
    }
}
