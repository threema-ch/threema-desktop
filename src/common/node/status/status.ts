/* eslint-disable */
import _m0 from 'protobufjs/minimal';

export interface GroupMemberChange {
    /** Added Identities */
    added: string[];
    /** Removed Identities */
    removed: string[];
}

export interface GroupNameChange {
    /** Old group name */
    oldName: string;
    /** New group name */
    newName: string;
}

function createBaseGroupMemberChange(): GroupMemberChange {
    return {added: [], removed: []};
}

export const GroupMemberChange = {
    encode(message: GroupMemberChange, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        for (const v of message.added) {
            writer.uint32(10).string(v!);
        }
        for (const v of message.removed) {
            writer.uint32(18).string(v!);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupMemberChange {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupMemberChange();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.added.push(reader.string());
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.removed.push(reader.string());
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

function createBaseGroupNameChange(): GroupNameChange {
    return {oldName: '', newName: ''};
}

export const GroupNameChange = {
    encode(message: GroupNameChange, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.oldName !== '') {
            writer.uint32(10).string(message.oldName);
        }
        if (message.newName !== '') {
            writer.uint32(18).string(message.newName);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupNameChange {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupNameChange();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.oldName = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.newName = reader.string();
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
