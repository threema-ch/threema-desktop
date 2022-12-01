import * as v from '@badrap/valita';
import Long from 'long';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as MessageType from '~/common/network/protobuf/validate/d2d/message-type';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureIdentityString} from '~/common/network/types';
import {intoU64, unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    d2d.IncomingMessage,
    v
        .object({
            senderIdentity: v.string().map(ensureIdentityString),
            messageId: MESSAGE_ID_SCHEMA,
            createdAt: instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
            type: MessageType.SCHEMA,
            body: instanceOf(Uint8Array),
        })
        .rest(v.unknown()),
);
export type Type = v.Infer<typeof SCHEMA>;
