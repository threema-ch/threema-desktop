/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal';

/** Properties of the last successful mediator connection. */
export interface LastMediatorConnection {
    date?: Long | undefined;
}

function createBaseLastMediatorConnection(): LastMediatorConnection {
    return {date: undefined};
}

export const LastMediatorConnection = {
    encode(message: LastMediatorConnection, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.date !== undefined) {
            writer.uint32(8).uint64(message.date);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): LastMediatorConnection {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseLastMediatorConnection();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.date = reader.uint64() as Long;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

if (_m0.util.Long !== Long) {
    _m0.util.Long = Long as any;
    _m0.configure();
}
