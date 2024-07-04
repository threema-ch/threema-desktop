/* eslint-disable */
import _m0 from "protobufjs/minimal";

export interface ChatRestored {
}

export interface GroupMemberChanged {
  /** IDs that were added to the group (including the user). */
  added: string[];
  /** IDs that were removed from the group (including the user). */
  removed: string[];
}

export interface GroupNameChanged {
  /** The old name of the group. */
  oldName: string;
  /** The new name of the group. */
  newName: string;
}

export interface GroupCallStarted {
  /**
   * Group Call ID identifying the group call, as defined by the Group Call
   * protocol.
   */
  callId: Uint8Array;
  /**
   * Group member (including the creator and the user) who started the group
   * call.
   */
  startedBy: string;
}

export interface GroupCallEnded {
  /**
   * Group Call ID identifying the group call, as defined by the Group Call
   * protocol.
   */
  callId: Uint8Array;
  /**
   * Group member (including the creator and the user) who started the group
   * call.
   */
  startedBy: string;
}

function createBaseChatRestored(): ChatRestored {
  return {};
}

export const ChatRestored = {
  encode(_: ChatRestored, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ChatRestored {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseChatRestored();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },
};

function createBaseGroupMemberChanged(): GroupMemberChanged {
  return { added: [], removed: [] };
}

export const GroupMemberChanged = {
  encode(message: GroupMemberChanged, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.added) {
      writer.uint32(10).string(v!);
    }
    for (const v of message.removed) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GroupMemberChanged {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGroupMemberChanged();
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

function createBaseGroupNameChanged(): GroupNameChanged {
  return { oldName: "", newName: "" };
}

export const GroupNameChanged = {
  encode(message: GroupNameChanged, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.oldName !== "") {
      writer.uint32(10).string(message.oldName);
    }
    if (message.newName !== "") {
      writer.uint32(18).string(message.newName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GroupNameChanged {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGroupNameChanged();
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

function createBaseGroupCallStarted(): GroupCallStarted {
  return { callId: new Uint8Array(0), startedBy: "" };
}

export const GroupCallStarted = {
  encode(message: GroupCallStarted, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.callId.length !== 0) {
      writer.uint32(10).bytes(message.callId);
    }
    if (message.startedBy !== "") {
      writer.uint32(18).string(message.startedBy);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GroupCallStarted {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGroupCallStarted();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.callId = reader.bytes();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.startedBy = reader.string();
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

function createBaseGroupCallEnded(): GroupCallEnded {
  return { callId: new Uint8Array(0), startedBy: "" };
}

export const GroupCallEnded = {
  encode(message: GroupCallEnded, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.callId.length !== 0) {
      writer.uint32(10).bytes(message.callId);
    }
    if (message.startedBy !== "") {
      writer.uint32(18).string(message.startedBy);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GroupCallEnded {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGroupCallEnded();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.callId = reader.bytes();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.startedBy = reader.string();
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
