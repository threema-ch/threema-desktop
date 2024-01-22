import * as v from '@badrap/valita';

import {
    ContactSyncPolicyUtils,
    GroupCallPolicyUtils,
    KeyboardDataCollectionPolicyUtils,
    O2oCallConnectionPolicyUtils,
    O2oCallPolicyUtils,
    O2oCallVideoPolicyUtils,
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
            o2oCallPolicy: optionalEnum(O2oCallPolicyUtils),
            o2oCallConnectionPolicy: optionalEnum(O2oCallConnectionPolicyUtils),
            o2oCallVideoPolicy: optionalEnum(O2oCallVideoPolicyUtils),
            groupCallPolicy: optionalEnum(GroupCallPolicyUtils),
            screenshotPolicy: optionalEnum(ScreenshotPolicyUtils),
            keyboardDataCollectionPolicy: optionalEnum(KeyboardDataCollectionPolicyUtils),
            blockedIdentities: nullOptional(Identities.SCHEMA),
            excludeFromSyncIdentities: nullOptional(Identities.SCHEMA),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
