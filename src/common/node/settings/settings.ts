/* eslint-disable */
import _m0 from 'protobufjs/minimal';

/** Settings on the user profile. */
export interface ProfileSettings {
    publicNickname: string;
}

function createBaseProfileSettings(): ProfileSettings {
    return {publicNickname: ''};
}

export const ProfileSettings = {
    encode(message: ProfileSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.publicNickname !== '') {
            writer.uint32(10).string(message.publicNickname);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ProfileSettings {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseProfileSettings();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.publicNickname = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};
