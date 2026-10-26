import {u64ToUnsignedLong} from '@threema/ts-utils/conversion/u64-to-unsigned-long';
import {unsignedLongToU64} from '@threema/ts-utils/conversion/unsigned-long-to-u64';

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
import {assert, unreachable} from '~/common/utils/assert';

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
                deviceId: u64ToUnsignedLong(this._deviceId),
            }),
        });

        // Wait for drop acknowledgement
        await handle.read(({type, payload}) => {
            if (type === D2mPayloadType.PROXY) {
                return MessageFilterInstruction.BACKLOG;
            }
            switch (type) {
                case D2mPayloadType.TRANSACTION_ENDED:
                    return MessageFilterInstruction.BACKLOG;
                case D2mPayloadType.DEVICES_INFO:
                case D2mPayloadType.BEGIN_TRANSACTION_ACK:
                case D2mPayloadType.COMMIT_TRANSACTION_ACK:
                case D2mPayloadType.TRANSACTION_REJECTED:
                case D2mPayloadType.REFLECT_ACK:
                    return MessageFilterInstruction.REJECT;
                case D2mPayloadType.DROP_DEVICE_ACK: {
                    assert(
                        payload instanceof protobuf.d2m.DropDeviceAck,
                        'Expected a D2M DropDeviceAck',
                    );

                    // Check if the device ID matches
                    const deviceId = unsignedLongToU64(payload.deviceId) as D2mDeviceId;
                    if (deviceId !== this._deviceId) {
                        return MessageFilterInstruction.BACKLOG;
                    }
                    return MessageFilterInstruction.ACCEPT;
                }
                default:
                    return unreachable(type);
            }
        });
    }
}
