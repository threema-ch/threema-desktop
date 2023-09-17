import {MessageFilterInstruction} from '~/common/enum';
import * as protobuf from '~/common/network/protobuf';
import {D2mPayloadType} from '~/common/network/protocol';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
} from '~/common/network/protocol/task';
import type {D2mDeviceId} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {intoU64, intoUnsignedLong} from '~/common/utils/number';

export class DropDeviceTask implements ActiveTask<void, 'volatile'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;
    private readonly _deviceId: D2mDeviceId;

    public constructor(deviceId: D2mDeviceId) {
        this._deviceId = deviceId;
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // Send drop
        await handle.write({
            type: D2mPayloadType.DROP_DEVICE,
            payload: protobuf.utils.encoder(protobuf.d2m.DropDevice, {
                deviceId: intoUnsignedLong(this._deviceId),
            }),
        });

        // Wait for drop acknowledgement
        await handle.read(({type, payload}) => {
            // Check if the message type matches
            if (type !== D2mPayloadType.DROP_DEVICE_ACK) {
                return MessageFilterInstruction.BYPASS_OR_BACKLOG;
            }
            assert(payload instanceof protobuf.d2m.DropDeviceAck, 'Expected a D2M DropDeviceAck');

            // Check if the device ID matches
            const deviceId = intoU64(payload.deviceId) as D2mDeviceId;
            if (deviceId !== this._deviceId) {
                return MessageFilterInstruction.BYPASS_OR_BACKLOG;
            }
            return MessageFilterInstruction.ACCEPT;
        });
    }
}
