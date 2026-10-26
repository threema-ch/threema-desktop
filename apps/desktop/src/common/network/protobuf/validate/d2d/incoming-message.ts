import * as v from '@badrap/valita';
import {d2d} from '@threema/protocol/protobuf';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {ensureNonce} from '~/common/crypto';
import {validator} from '~/common/network/protobuf/utils';
import * as MessageType from '~/common/network/protobuf/validate/d2d/message-type';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureIdentityString} from '~/common/network/types';
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
            nonce: instanceOf(Uint8Array).map(ensureNonce),
        })
        .rest(v.unknown()),
);
export type Type = v.Infer<typeof SCHEMA>;
