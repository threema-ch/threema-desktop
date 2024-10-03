/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

/** _Read_ receipt policy (when an unread message has been read) */
export const enum ReadReceiptPolicy {
  /** SEND_READ_RECEIPT - Send _read_ receipt when an unread message has been read */
  SEND_READ_RECEIPT = 0,
  /** DONT_SEND_READ_RECEIPT - Don't send _read_ receipts */
  DONT_SEND_READ_RECEIPT = 1,
  UNRECOGNIZED = -1,
}

/** Typing indicator policy (signal _currently typing_) */
export const enum TypingIndicatorPolicy {
  /** SEND_TYPING_INDICATOR - Send _typing_ indicator when a message is being composed */
  SEND_TYPING_INDICATOR = 0,
  /** DONT_SEND_TYPING_INDICATOR - Don't send _typing_ indicators */
  DONT_SEND_TYPING_INDICATOR = 1,
  UNRECOGNIZED = -1,
}

export interface Unit {
}

/** Container for a list of identities */
export interface Identities {
  /** List of identities */
  identities: string[];
}

/** Profile settings */
export interface ProfileSettings {
  /** Nickname */
  nickname?:
    | string
    | undefined;
  /** Profile picture blob */
  profilePictureBlob?:
    | Uint8Array
    | undefined;
  /** Profile picture blobID */
  profilePictureBlobId?:
    | Uint8Array
    | undefined;
  /** The date the profile picture was last uploaded to the server */
  profilePictureLastUploadedAt?:
    | Long
    | undefined;
  /** The symmetric key of the current profile picture */
  profilePictureKey?: Uint8Array | undefined;
  profilePictureShareWith?: ProfileSettings_ProfilePictureShareWith | undefined;
}

export interface ProfileSettings_ProfilePictureShareWith {
  policy?: { $case: "nobody"; nobody: Unit } | { $case: "everyone"; everyone: Unit } | {
    $case: "allowList";
    allowList: Identities;
  } | undefined;
}

/** Privacy settings */
export interface PrivacySettings {
  contactSyncPolicy?: PrivacySettings_ContactSyncPolicy | undefined;
  unknownContactPolicy?:
    | PrivacySettings_UnknownContactPolicy
    | undefined;
  /**
   * _Read_ receipt policy (when an unread message has been read)
   *
   * Required towards a new device. Optional otherwise.
   */
  readReceiptPolicy?:
    | ReadReceiptPolicy
    | undefined;
  /**
   * Typing indicator policy (signal _currently typing_)
   *
   * Required towards a new device. Optional otherwise.
   */
  typingIndicatorPolicy?: TypingIndicatorPolicy | undefined;
  screenshotPolicy?: PrivacySettings_ScreenshotPolicy | undefined;
  keyboardDataCollectionPolicy?:
    | PrivacySettings_KeyboardDataCollectionPolicy
    | undefined;
  /**
   * List of Threema IDs whose messages are blocked
   *
   * Required towards a new device. Optional otherwise.
   *
   * An empty list is valid.
   */
  blockedIdentities:
    | Identities
    | undefined;
  /**
   * Threema IDs to be excluded when syncing the contact list
   *
   * Required towards a new device. Optional otherwise.
   *
   * An empty list is valid.
   */
  excludeFromSyncIdentities: Identities | undefined;
}

/**
 * Contact synchronisation policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum PrivacySettings_ContactSyncPolicy {
  /** NOT_SYNCED - Not synced */
  NOT_SYNCED = 0,
  /** SYNC - Synced */
  SYNC = 1,
  UNRECOGNIZED = -1,
}

/**
 * Unknown contacts policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum PrivacySettings_UnknownContactPolicy {
  /** ALLOW_UNKNOWN - Allowed to contact the user */
  ALLOW_UNKNOWN = 0,
  /** BLOCK_UNKNOWN - Will be blocked by the user */
  BLOCK_UNKNOWN = 1,
  UNRECOGNIZED = -1,
}

/**
 * Screenshot policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum PrivacySettings_ScreenshotPolicy {
  /** ALLOW_SCREENSHOT - Allow taking screenshots */
  ALLOW_SCREENSHOT = 0,
  /** DENY_SCREENSHOT - Deny taking screenshots, if possible */
  DENY_SCREENSHOT = 1,
  UNRECOGNIZED = -1,
}

/**
 * Keyboard data collection policy (e.g. for personalised suggestions)
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum PrivacySettings_KeyboardDataCollectionPolicy {
  /** ALLOW_DATA_COLLECTION - Allow keyboard input data to be collected */
  ALLOW_DATA_COLLECTION = 0,
  /** DENY_DATA_COLLECTION - Deny collecting of keyboard input data */
  DENY_DATA_COLLECTION = 1,
  UNRECOGNIZED = -1,
}

/** Calls settings */
export interface CallsSettings {
  o2oCallPolicy?: CallsSettings_O2oCallPolicy | undefined;
  o2oCallConnectionPolicy?: CallsSettings_O2oCallConnectionPolicy | undefined;
  groupCallPolicy?: CallsSettings_GroupCallPolicy | undefined;
}

/**
 * Threema Call policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum CallsSettings_O2oCallPolicy {
  /** ALLOW_CALL - Allow creating/receiving Threema Calls */
  ALLOW_CALL = 0,
  /** DENY_CALL - Denied from creating/receiving any Threema Calls */
  DENY_CALL = 1,
  UNRECOGNIZED = -1,
}

/**
 * Threema Call connection policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum CallsSettings_O2oCallConnectionPolicy {
  /** ALLOW_DIRECT - Allow direct (peer-to-peer) connections for Threema Calls */
  ALLOW_DIRECT = 0,
  /** REQUIRE_RELAY - Require relayed connections for Threema Calls */
  REQUIRE_RELAY = 1,
  UNRECOGNIZED = -1,
}

/**
 * Threema Group Call policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum CallsSettings_GroupCallPolicy {
  /** ALLOW_GROUP_CALL - Allow creating/receiving Threema Group Calls */
  ALLOW_GROUP_CALL = 0,
  /** DENY_GROUP_CALL - Denied from creating/receiving any Threema Group Calls */
  DENY_GROUP_CALL = 1,
  UNRECOGNIZED = -1,
}

/** Devices Settings */
export interface DevicesSettings {
  /** The name of the local device */
  deviceName?: string | undefined;
}

/** Appearance Settings */
export interface AppearanceSettings {
  timeFormat?: AppearanceSettings_TimeFormat | undefined;
  inactiveContactsPolicy?: AppearanceSettings_HideInactive | undefined;
}

/** Time format (12h vs 24h display) */
export const enum AppearanceSettings_TimeFormat {
  TIME_24H = 0,
  TIME_12H = 1,
  UNRECOGNIZED = -1,
}

/** Whether to show or hide inactive contacts */
export const enum AppearanceSettings_HideInactive {
  SHOW = 0,
  HIDE = 1,
  UNRECOGNIZED = -1,
}

/** Media Settings */
export interface MediaSettings {
  autoDownload?: MediaSettings_AutoDownload | undefined;
}

/**
 * Whether or not to automatically download file and media content for
 * incoming messages.
 */
export interface MediaSettings_AutoDownload {
  policy?: { $case: "off"; off: Unit } | { $case: "on"; on: MediaSettings_AutoDownload_AutoDownloadOn } | undefined;
}

export interface MediaSettings_AutoDownload_AutoDownloadOn {
  on:
    | Unit
    | undefined;
  /** If 0: No limit */
  limitInMb: number;
}

export interface ChatSettings {
  composeBarEnterMode?: ChatSettings_ComposeBarEnterMode | undefined;
}

export const enum ChatSettings_ComposeBarEnterMode {
  SUBMIT = 0,
  LINE_BREAK = 1,
  UNRECOGNIZED = -1,
}

function createBaseUnit(): Unit {
  return {};
}

export const Unit = {
  encode(_: Unit, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Unit {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUnit();
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

function createBaseIdentities(): Identities {
  return { identities: [] };
}

export const Identities = {
  encode(message: Identities, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.identities) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Identities {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIdentities();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.identities.push(reader.string());
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

function createBaseProfileSettings(): ProfileSettings {
  return {
    nickname: undefined,
    profilePictureBlob: undefined,
    profilePictureBlobId: undefined,
    profilePictureLastUploadedAt: undefined,
    profilePictureKey: undefined,
    profilePictureShareWith: undefined,
  };
}

export const ProfileSettings = {
  encode(message: ProfileSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.nickname !== undefined) {
      writer.uint32(10).string(message.nickname);
    }
    if (message.profilePictureBlob !== undefined) {
      writer.uint32(18).bytes(message.profilePictureBlob);
    }
    if (message.profilePictureBlobId !== undefined) {
      writer.uint32(34).bytes(message.profilePictureBlobId);
    }
    if (message.profilePictureLastUploadedAt !== undefined) {
      writer.uint32(40).uint64(message.profilePictureLastUploadedAt);
    }
    if (message.profilePictureKey !== undefined) {
      writer.uint32(50).bytes(message.profilePictureKey);
    }
    if (message.profilePictureShareWith !== undefined) {
      ProfileSettings_ProfilePictureShareWith.encode(message.profilePictureShareWith, writer.uint32(26).fork())
        .ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProfileSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProfileSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.nickname = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.profilePictureBlob = reader.bytes();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.profilePictureBlobId = reader.bytes();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.profilePictureLastUploadedAt = reader.uint64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.profilePictureKey = reader.bytes();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.profilePictureShareWith = ProfileSettings_ProfilePictureShareWith.decode(reader, reader.uint32());
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

function createBaseProfileSettings_ProfilePictureShareWith(): ProfileSettings_ProfilePictureShareWith {
  return { policy: undefined };
}

export const ProfileSettings_ProfilePictureShareWith = {
  encode(message: ProfileSettings_ProfilePictureShareWith, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    switch (message.policy?.$case) {
      case "nobody":
        Unit.encode(message.policy.nobody, writer.uint32(10).fork()).ldelim();
        break;
      case "everyone":
        Unit.encode(message.policy.everyone, writer.uint32(18).fork()).ldelim();
        break;
      case "allowList":
        Identities.encode(message.policy.allowList, writer.uint32(26).fork()).ldelim();
        break;
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProfileSettings_ProfilePictureShareWith {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProfileSettings_ProfilePictureShareWith();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.policy = { $case: "nobody", nobody: Unit.decode(reader, reader.uint32()) };
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.policy = { $case: "everyone", everyone: Unit.decode(reader, reader.uint32()) };
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.policy = { $case: "allowList", allowList: Identities.decode(reader, reader.uint32()) };
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

function createBasePrivacySettings(): PrivacySettings {
  return {
    contactSyncPolicy: undefined,
    unknownContactPolicy: undefined,
    readReceiptPolicy: undefined,
    typingIndicatorPolicy: undefined,
    screenshotPolicy: undefined,
    keyboardDataCollectionPolicy: undefined,
    blockedIdentities: undefined,
    excludeFromSyncIdentities: undefined,
  };
}

export const PrivacySettings = {
  encode(message: PrivacySettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.contactSyncPolicy !== undefined) {
      writer.uint32(8).int32(message.contactSyncPolicy);
    }
    if (message.unknownContactPolicy !== undefined) {
      writer.uint32(16).int32(message.unknownContactPolicy);
    }
    if (message.readReceiptPolicy !== undefined) {
      writer.uint32(24).int32(message.readReceiptPolicy);
    }
    if (message.typingIndicatorPolicy !== undefined) {
      writer.uint32(32).int32(message.typingIndicatorPolicy);
    }
    if (message.screenshotPolicy !== undefined) {
      writer.uint32(40).int32(message.screenshotPolicy);
    }
    if (message.keyboardDataCollectionPolicy !== undefined) {
      writer.uint32(48).int32(message.keyboardDataCollectionPolicy);
    }
    if (message.blockedIdentities !== undefined) {
      Identities.encode(message.blockedIdentities, writer.uint32(58).fork()).ldelim();
    }
    if (message.excludeFromSyncIdentities !== undefined) {
      Identities.encode(message.excludeFromSyncIdentities, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PrivacySettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePrivacySettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.contactSyncPolicy = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.unknownContactPolicy = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.readReceiptPolicy = reader.int32() as any;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.typingIndicatorPolicy = reader.int32() as any;
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.screenshotPolicy = reader.int32() as any;
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.keyboardDataCollectionPolicy = reader.int32() as any;
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.blockedIdentities = Identities.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.excludeFromSyncIdentities = Identities.decode(reader, reader.uint32());
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

function createBaseCallsSettings(): CallsSettings {
  return { o2oCallPolicy: undefined, o2oCallConnectionPolicy: undefined, groupCallPolicy: undefined };
}

export const CallsSettings = {
  encode(message: CallsSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.o2oCallPolicy !== undefined) {
      writer.uint32(8).int32(message.o2oCallPolicy);
    }
    if (message.o2oCallConnectionPolicy !== undefined) {
      writer.uint32(16).int32(message.o2oCallConnectionPolicy);
    }
    if (message.groupCallPolicy !== undefined) {
      writer.uint32(24).int32(message.groupCallPolicy);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CallsSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCallsSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.o2oCallPolicy = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.o2oCallConnectionPolicy = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.groupCallPolicy = reader.int32() as any;
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

function createBaseDevicesSettings(): DevicesSettings {
  return { deviceName: undefined };
}

export const DevicesSettings = {
  encode(message: DevicesSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.deviceName !== undefined) {
      writer.uint32(10).string(message.deviceName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DevicesSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDevicesSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.deviceName = reader.string();
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

function createBaseAppearanceSettings(): AppearanceSettings {
  return { timeFormat: undefined, inactiveContactsPolicy: undefined };
}

export const AppearanceSettings = {
  encode(message: AppearanceSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.timeFormat !== undefined) {
      writer.uint32(8).int32(message.timeFormat);
    }
    if (message.inactiveContactsPolicy !== undefined) {
      writer.uint32(16).int32(message.inactiveContactsPolicy);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AppearanceSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAppearanceSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.timeFormat = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.inactiveContactsPolicy = reader.int32() as any;
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

function createBaseMediaSettings(): MediaSettings {
  return { autoDownload: undefined };
}

export const MediaSettings = {
  encode(message: MediaSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.autoDownload !== undefined) {
      MediaSettings_AutoDownload.encode(message.autoDownload, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MediaSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMediaSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.autoDownload = MediaSettings_AutoDownload.decode(reader, reader.uint32());
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

function createBaseMediaSettings_AutoDownload(): MediaSettings_AutoDownload {
  return { policy: undefined };
}

export const MediaSettings_AutoDownload = {
  encode(message: MediaSettings_AutoDownload, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    switch (message.policy?.$case) {
      case "off":
        Unit.encode(message.policy.off, writer.uint32(10).fork()).ldelim();
        break;
      case "on":
        MediaSettings_AutoDownload_AutoDownloadOn.encode(message.policy.on, writer.uint32(18).fork()).ldelim();
        break;
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MediaSettings_AutoDownload {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMediaSettings_AutoDownload();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.policy = { $case: "off", off: Unit.decode(reader, reader.uint32()) };
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.policy = {
            $case: "on",
            on: MediaSettings_AutoDownload_AutoDownloadOn.decode(reader, reader.uint32()),
          };
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

function createBaseMediaSettings_AutoDownload_AutoDownloadOn(): MediaSettings_AutoDownload_AutoDownloadOn {
  return { on: undefined, limitInMb: 0 };
}

export const MediaSettings_AutoDownload_AutoDownloadOn = {
  encode(message: MediaSettings_AutoDownload_AutoDownloadOn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.on !== undefined) {
      Unit.encode(message.on, writer.uint32(10).fork()).ldelim();
    }
    if (message.limitInMb !== 0) {
      writer.uint32(16).uint32(message.limitInMb);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MediaSettings_AutoDownload_AutoDownloadOn {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMediaSettings_AutoDownload_AutoDownloadOn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.on = Unit.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.limitInMb = reader.uint32();
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

function createBaseChatSettings(): ChatSettings {
  return { composeBarEnterMode: undefined };
}

export const ChatSettings = {
  encode(message: ChatSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.composeBarEnterMode !== undefined) {
      writer.uint32(8).int32(message.composeBarEnterMode);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ChatSettings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseChatSettings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.composeBarEnterMode = reader.int32() as any;
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
