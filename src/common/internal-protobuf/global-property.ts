/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

/** Properties of the last successful mediator connection. */
export interface LastMediatorConnection {
  date?: Long | undefined;
}

export interface ApplicationState {
  /** default: false */
  unrecoverableStateDetected?: boolean | undefined;
}

function createBaseLastMediatorConnection(): LastMediatorConnection {
  return { date: undefined };
}

export const LastMediatorConnection = {
  encode(message: LastMediatorConnection, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.date !== undefined) {
      writer.uint32(8).uint64(message.date);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LastMediatorConnection {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLastMediatorConnection();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.date = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },
};

function createBaseApplicationState(): ApplicationState {
  return { unrecoverableStateDetected: undefined };
}

export const ApplicationState = {
  encode(message: ApplicationState, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.unrecoverableStateDetected !== undefined) {
      writer.uint32(8).bool(message.unrecoverableStateDetected);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ApplicationState {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseApplicationState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.unrecoverableStateDetected = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },
};

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}
