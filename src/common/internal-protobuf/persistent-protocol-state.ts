/* eslint-disable */
import _m0 from "protobufjs/minimal";

/**
 * ## Persistent Protocol State
 *
 * The persistent protocol state which is persisted over restarts.
 */

export interface UserProfileState {
  /** Identity of the receiver */
  receiverIdentity: string;
  /** BlobId of the profile picture */
  blobId?: Uint8Array | undefined;
}

function createBaseUserProfileState(): UserProfileState {
  return { receiverIdentity: "", blobId: undefined };
}

export const UserProfileState = {
  encode(message: UserProfileState, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.receiverIdentity !== "") {
      writer.uint32(10).string(message.receiverIdentity);
    }
    if (message.blobId !== undefined) {
      writer.uint32(18).bytes(message.blobId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserProfileState {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserProfileState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.receiverIdentity = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.blobId = reader.bytes();
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
