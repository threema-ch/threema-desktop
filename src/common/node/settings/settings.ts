/* eslint-disable */
import _m0 from 'protobufjs/minimal';

export interface Unit {}

/** Container for a list of identities. */
export interface Identities {
    /** List of identities */
    identities: string[];
}

/** Settings on the user profile. */
export interface ProfileSettings {
    /** Nickname */
    publicNickname: string;
    /** Profile picture */
    profilePicture?: Uint8Array | undefined;
    profilePictureShareWith?: ProfileSettings_ProfilePictureShareWith | undefined;
}

export interface ProfileSettings_ProfilePictureShareWith {
    policy?:
        | {$case: 'nobody'; nobody: Unit}
        | {$case: 'everyone'; everyone: Unit}
        | {
              $case: 'allowList';
              allowList: Identities;
          };
}

function createBaseUnit(): Unit {
    return {};
}

export const Unit = {
    encode(_: Unit, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Unit {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUnit();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseIdentities(): Identities {
    return {identities: []};
}

export const Identities = {
    encode(message: Identities, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        for (const v of message.identities) {
            writer.uint32(10).string(v!);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Identities {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseIdentities();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.identities.push(reader.string());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseProfileSettings(): ProfileSettings {
    return {publicNickname: '', profilePicture: undefined, profilePictureShareWith: undefined};
}

export const ProfileSettings = {
    encode(message: ProfileSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.publicNickname !== '') {
            writer.uint32(10).string(message.publicNickname);
        }
        if (message.profilePicture !== undefined) {
            writer.uint32(18).bytes(message.profilePicture);
        }
        if (message.profilePictureShareWith !== undefined) {
            ProfileSettings_ProfilePictureShareWith.encode(
                message.profilePictureShareWith,
                writer.uint32(26).fork(),
            ).ldelim();
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
                case 2:
                    message.profilePicture = reader.bytes();
                    break;
                case 3:
                    message.profilePictureShareWith =
                        ProfileSettings_ProfilePictureShareWith.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseProfileSettings_ProfilePictureShareWith(): ProfileSettings_ProfilePictureShareWith {
    return {policy: undefined};
}

export const ProfileSettings_ProfilePictureShareWith = {
    encode(
        message: ProfileSettings_ProfilePictureShareWith,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.policy?.$case === 'nobody') {
            Unit.encode(message.policy.nobody, writer.uint32(10).fork()).ldelim();
        }
        if (message.policy?.$case === 'everyone') {
            Unit.encode(message.policy.everyone, writer.uint32(18).fork()).ldelim();
        }
        if (message.policy?.$case === 'allowList') {
            Identities.encode(message.policy.allowList, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): ProfileSettings_ProfilePictureShareWith {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseProfileSettings_ProfilePictureShareWith();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.policy = {
                        $case: 'nobody',
                        nobody: Unit.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.policy = {
                        $case: 'everyone',
                        everyone: Unit.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.policy = {
                        $case: 'allowList',
                        allowList: Identities.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};
