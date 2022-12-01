import * as v from '@badrap/valita';
import Long from 'long';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {intoU64, unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, nullOptional, optionalInstanceOf} from '~/common/utils/valita-helpers';

import * as ConversationId from './conversation-id';
import * as MessageType from './message-type';

/** Validates {@link d2d.OutgoingMessage} */
export const SCHEMA = validator(
    d2d.OutgoingMessage,
    v
        .object({
            conversation: ConversationId.SCHEMA,
            messageId: MESSAGE_ID_SCHEMA,
            threadMessageId: nullOptional(optionalInstanceOf(Long)).map((value) =>
                value === undefined ? undefined : intoU64(value),
            ),
            body: instanceOf(Uint8Array),
            createdAt: instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
            type: MessageType.SCHEMA,
        })
        .rest(v.unknown()),
);
export type Type = v.Infer<typeof SCHEMA>;
