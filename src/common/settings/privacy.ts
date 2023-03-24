import * as v from '@badrap/valita';

import {
    ContactSyncPolicyUtils,
    KeyboardDataCollectionPolicyUtils,
    ReadReceiptPolicyUtils,
    ScreenshotPolicyUtils,
    TypingIndicatorPolicyUtils,
    UnknownContactPolicyUtils,
} from '~/common/enum';
import * as validate from '~/common/network/protobuf/validate';
import * as proto from '~/common/node/settings/settings';
import {type SettingsCategoryCodec} from '~/common/settings';
import {nullOptional, optionalEnum} from '~/common/utils/valita-helpers';

const PRIVACY_SETTINGS_SCHEMA = v
    .object({
        contactSyncPolicy: optionalEnum(ContactSyncPolicyUtils),
        unknownContactPolicy: optionalEnum(UnknownContactPolicyUtils),
        readReceiptPolicy: optionalEnum(ReadReceiptPolicyUtils),
        typingIndicatorPolicy: optionalEnum(TypingIndicatorPolicyUtils),
        screenshotPolicy: optionalEnum(ScreenshotPolicyUtils),
        keyboardDataCollectionPolicy: optionalEnum(KeyboardDataCollectionPolicyUtils),
        blockedIdentities: nullOptional(validate.common.Identities.SCHEMA),
        excludeFromSyncIdentities: nullOptional(validate.common.Identities.SCHEMA),
    })
    .rest(v.unknown());

/**
 * Validated privacy settings.
 */
export type PrivacySettings = v.Infer<typeof PRIVACY_SETTINGS_SCHEMA>;

export const PRIVACY_SETTINGS_CODEC: SettingsCategoryCodec<'privacy'> = {
    encode: (settings) =>
        proto.PrivacySettings.encode({
            contactSyncPolicy: settings.contactSyncPolicy,
            unknownContactPolicy: settings.unknownContactPolicy,
            readReceiptPolicy: settings.readReceiptPolicy,
            typingIndicatorPolicy: settings.typingIndicatorPolicy,
            screenshotPolicy: settings.screenshotPolicy,
            keyboardDataCollectionPolicy: settings.keyboardDataCollectionPolicy,
            blockedIdentities: settings.blockedIdentities,
            excludeFromSyncIdentities: settings.excludeFromSyncIdentities,
        }).finish(),
    decode: (encoded) => PRIVACY_SETTINGS_SCHEMA.parse(proto.PrivacySettings.decode(encoded)),
} as const;
