import {ensureEncryptedDataWithNonceAhead} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {type DeviceGroupBoxes} from '~/common/crypto/device-group-keys';
import {type Logger} from '~/common/logging';
import * as protobuf from '~/common/network/protobuf';
import {D2mPayloadType} from '~/common/network/protocol';
import {
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
    PASSIVE_TASK,
} from '~/common/network/protocol/task';
import {getTaskForIncomingD2dMessage} from '~/common/network/protocol/task/d2d';
import * as structbuf from '~/common/network/structbuf';
import {ensureError} from '~/common/utils/assert';

const REFLECT_ACK_RESERVED_BYTES = new Uint8Array(4);

export class ReflectedTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;
    private readonly _message: structbuf.d2m.payload.Reflected;
    private readonly _reflectedIdHex: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        message: structbuf.d2m.payload.Reflected,
    ) {
        this._reflectedIdHex = message.reflectedId.toString(16);
        this._log = _services.logging.logger(
            `network.protocol.task.in-reflected-message.${this._reflectedIdHex}`,
        );
        this._message = message;
    }

    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        // Validate Reflected Message
        let validatedReflectedMessage;
        try {
            validatedReflectedMessage = structbuf.validate.d2m.payload.Reflected.SCHEMA.parse(
                this._message,
            );
        } catch (error) {
            this._log.error(`Discarding reflected message due to validation error.`);
            return await this._discard(handle);
        }

        // Decrypt envelope
        let envelope;
        try {
            envelope = this._decryptD2dMessage(
                handle.controller.d2d.dgrk,
                validatedReflectedMessage,
            );
        } catch (error) {
            this._log.error(`Discarding reflected message due to decryption error.`);
            return await this._discard(handle);
        }

        // Validate the Protobuf message
        let validatedEnvelope;
        try {
            validatedEnvelope = protobuf.validate.d2d.Envelope.SCHEMA.parse(envelope);
        } catch (error) {
            this._log.error(`Discarding reflected message due to validation error: ${error}`);
            return await this._discard(handle);
        }

        // Process envelope if a task is available to handle it.
        const task = getTaskForIncomingD2dMessage(
            this._services,
            validatedEnvelope,
            validatedReflectedMessage,
        );
        try {
            await task.run(handle);
        } catch (error) {
            this._log.error(`Discarding message because the processing task errored: ${error}`);
            return await this._discard(handle);
        }

        // Send a D2M acknowledgement
        try {
            return await this._acknowledgeMessage(handle);
        } catch (error) {
            this._log.error(`Failed to acknowledge the message: ${error}`);
            throw ensureError(error);
        }
    }

    private async _discard(handle: PassiveTaskCodecHandle): Promise<void> {
        // Send a D2M acknowledgement
        this._log.debug('Acknowledging discarded message');
        try {
            await this._acknowledgeMessage(handle);
        } catch (error) {
            this._log.warn(`Failed to acknowledge discarded message: ${error}`);
            throw ensureError(error);
        }
    }

    /**
     * Decrypt and process d2d message
     *
     * @throws Error if processing failed.
     */
    private _decryptD2dMessage(
        dgrk: DeviceGroupBoxes['dgrk'],
        message: structbuf.validate.d2m.payload.Reflected.Type,
    ): protobuf.d2d.Envelope {
        // Verify Envelope format
        const encryptedEnvelope = ensureEncryptedDataWithNonceAhead(message.envelope);

        // Decrypt Envelope
        const decryptor = dgrk.decryptorWithNonceAhead(CREATE_BUFFER_TOKEN, encryptedEnvelope);
        const plainData = decryptor.decrypt();

        // Decode protobuf Envelop
        return protobuf.d2d.Envelope.decode(plainData);
    }

    private async _acknowledgeMessage(handle: PassiveTaskCodecHandle): Promise<void> {
        await handle.write({
            type: D2mPayloadType.REFLECTED_ACK,
            payload: structbuf.bridge.encoder(structbuf.d2m.payload.ReflectedAck, {
                reserved: REFLECT_ACK_RESERVED_BYTES,
                // Note: The reflectedId is assumed to be valid.
                reflectId: this._message.reflectedId,
            }),
        });
    }
}
