import * as v from '@badrap/valita';

import {
    CallConnectionPolicyUtils,
    CallPolicyUtils,
    ContactSyncPolicyUtils,
    KeyboardDataCollectionPolicyUtils,
    ReadReceiptPolicyUtils,
    ScreenshotPolicyUtils,
    TypingIndicatorPolicyUtils,
    UnknownContactPolicyUtils,
} from '~/common/enum';
import {sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as Identities from '~/common/network/protobuf/validate/common/identities';
import {nullOptional, optionalEnum} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    sync.Settings,
    v
        .object({
            contactSyncPolicy: optionalEnum(ContactSyncPolicyUtils),
            unknownContactPolicy: optionalEnum(UnknownContactPolicyUtils),
            readReceiptPolicy: optionalEnum(ReadReceiptPolicyUtils),
            typingIndicatorPolicy: optionalEnum(TypingIndicatorPolicyUtils),
            screenshotPolicy: optionalEnum(ScreenshotPolicyUtils),
            keyboardDataCollectionPolicy: optionalEnum(KeyboardDataCollectionPolicyUtils),
            blockedIdentities: nullOptional(Identities.SCHEMA),
            excludeFromSyncIdentities: nullOptional(Identities.SCHEMA),
            callPolicy: optionalEnum(CallPolicyUtils),
            callConnectionPolity: optionalEnum(CallConnectionPolicyUtils),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
