/* eslint-disable */
import _m0 from 'protobufjs/minimal';

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

export interface Unit {}

/** Container for a list of identities */
export interface Identities {
    /** List of identities */
    identities: string[];
}

/** Profile settings */
export interface ProfileSettings {
    /** Nickname */
    nickname?: string | undefined;
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
          }
        | undefined;
}

/** Privacy settings */
export interface PrivacySettings {
    contactSyncPolicy?: PrivacySettings_ContactSyncPolicy | undefined;
    unknownContactPolicy?: PrivacySettings_UnknownContactPolicy | undefined;
    /**
     * _Read_ receipt policy (when an unread message has been read)
     *
     * Required towards a new device. Optional otherwise.
     */
    readReceiptPolicy?: ReadReceiptPolicy | undefined;
    /**
     * Typing indicator policy (signal _currently typing_)
     *
     * Required towards a new device. Optional otherwise.
     */
    typingIndicatorPolicy?: TypingIndicatorPolicy | undefined;
    screenshotPolicy?: PrivacySettings_ScreenshotPolicy | undefined;
    keyboardDataCollectionPolicy?: PrivacySettings_KeyboardDataCollectionPolicy | undefined;
    /**
     * List of Threema IDs whose messages are blocked
     *
     * Required towards a new device. Optional otherwise.
     *
     * An empty list is valid.
     */
    blockedIdentities: Identities | undefined;
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
    callPolicy?: CallsSettings_CallPolicy | undefined;
    callConnectionPolicy?: CallsSettings_CallConnectionPolicy | undefined;
}

/**
 * Threema Call policy
 *
 * Required towards a new device. Optional otherwise.
 */
export const enum CallsSettings_CallPolicy {
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
export const enum CallsSettings_CallConnectionPolicy {
    /** ALLOW_DIRECT - Allow direct (peer-to-peer) connections for Threema Calls */
    ALLOW_DIRECT = 0,
    /** REQUIRE_RELAY - Require relayed connections for Threema Calls */
    REQUIRE_RELAY = 1,
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
    return {nickname: undefined, profilePicture: undefined, profilePictureShareWith: undefined};
}

export const ProfileSettings = {
    encode(message: ProfileSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.nickname !== undefined) {
            writer.uint32(10).string(message.nickname);
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

                    message.profilePicture = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.profilePictureShareWith =
                        ProfileSettings_ProfilePictureShareWith.decode(reader, reader.uint32());
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
    return {policy: undefined};
}

export const ProfileSettings_ProfilePictureShareWith = {
    encode(
        message: ProfileSettings_ProfilePictureShareWith,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        switch (message.policy?.$case) {
            case 'nobody':
                Unit.encode(message.policy.nobody, writer.uint32(10).fork()).ldelim();
                break;
            case 'everyone':
                Unit.encode(message.policy.everyone, writer.uint32(18).fork()).ldelim();
                break;
            case 'allowList':
                Identities.encode(message.policy.allowList, writer.uint32(26).fork()).ldelim();
                break;
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): ProfileSettings_ProfilePictureShareWith {
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

                    message.policy = {
                        $case: 'nobody',
                        nobody: Unit.decode(reader, reader.uint32()),
                    };
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.policy = {
                        $case: 'everyone',
                        everyone: Unit.decode(reader, reader.uint32()),
                    };
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.policy = {
                        $case: 'allowList',
                        allowList: Identities.decode(reader, reader.uint32()),
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
    return {callPolicy: undefined, callConnectionPolicy: undefined};
}

export const CallsSettings = {
    encode(message: CallsSettings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.callPolicy !== undefined) {
            writer.uint32(8).int32(message.callPolicy);
        }
        if (message.callConnectionPolicy !== undefined) {
            writer.uint32(16).int32(message.callConnectionPolicy);
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

                    message.callPolicy = reader.int32() as any;
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.callConnectionPolicy = reader.int32() as any;
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
