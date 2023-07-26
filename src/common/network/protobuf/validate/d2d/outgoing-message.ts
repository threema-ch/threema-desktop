import * as v from '@badrap/valita';

import {ensureNonceHash} from '~/common/crypto';
import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, nullOptional, unsignedLongAsU64} from '~/common/utils/valita-helpers';

import * as ConversationId from './conversation-id';
import * as MessageType from './message-type';

/** Validates {@link d2d.OutgoingMessage} */
export const SCHEMA = validator(
    d2d.OutgoingMessage,
    v
        .object({
            conversation: ConversationId.SCHEMA,
            messageId: MESSAGE_ID_SCHEMA,
            threadMessageId: nullOptional(unsignedLongAsU64()),
            body: instanceOf(Uint8Array),
            createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            type: MessageType.SCHEMA,
            nonces: v.array(instanceOf(Uint8Array).map(ensureNonceHash)),
        })
        .rest(v.unknown()),
);
export type Type = v.Infer<typeof SCHEMA>;
