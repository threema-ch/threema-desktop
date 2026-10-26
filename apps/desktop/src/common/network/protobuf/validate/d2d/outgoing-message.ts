import * as v from '@badrap/valita';
import {d2d} from '@threema/protocol/protobuf';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {ensureNonce} from '~/common/crypto';
import {validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
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
            nonces: v.array(instanceOf(Uint8Array).map(ensureNonce)),
        })
        .rest(v.unknown()),
);
export type Type = v.Infer<typeof SCHEMA>;
