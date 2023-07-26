import * as v from '@badrap/valita';

import {ensureNonceHash} from '~/common/crypto';
import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as MessageType from '~/common/network/protobuf/validate/d2d/message-type';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureIdentityString} from '~/common/network/types';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    d2d.IncomingMessage,
    v
        .object({
            senderIdentity: v.string().map(ensureIdentityString),
            messageId: MESSAGE_ID_SCHEMA,
            createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            type: MessageType.SCHEMA,
            body: instanceOf(Uint8Array),
            nonce: instanceOf(Uint8Array).map(ensureNonceHash),
        })
        .rest(v.unknown()),
);
export type Type = v.Infer<typeof SCHEMA>;
