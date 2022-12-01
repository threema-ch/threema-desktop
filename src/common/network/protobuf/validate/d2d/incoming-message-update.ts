import * as v from '@badrap/valita';
import Long from 'long';

import {d2d} from '~/common/network/protobuf/js';
import {creator, validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA, serializeMessageId} from '~/common/network/protobuf/validate/helpers';
import {unreachable} from '~/common/utils/assert';
import {
    dateToUnixTimestampMs,
    intoU64,
    intoUnsignedLong,
    unixTimestampToDateMs,
} from '~/common/utils/number';
import {instanceOf} from '~/common/utils/valita-helpers';

import * as ConversationId from './conversation-id';

const READ_SCHEMA = validator(
    d2d.IncomingMessageUpdate.Read,
    v.object({
        at: instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
    }),
);

export const SCHEMA = validator(
    d2d.IncomingMessageUpdate,
    v
        .object({
            updates: v.array(
                validator(
                    d2d.IncomingMessageUpdate.Update,
                    v.object({
                        conversation: ConversationId.SCHEMA,
                        messageId: MESSAGE_ID_SCHEMA,
                        update: v.literal('read'),
                        read: READ_SCHEMA,
                    }),
                ),
            ),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;

export function serialize(validatedMessage: Type): d2d.IncomingMessageUpdate {
    const updates = creator(
        d2d.IncomingMessageUpdate.Update,
        validatedMessage.updates.map((update) => {
            const {conversation, messageId} = update;

            const commonProps = {
                conversation: ConversationId.serialize(conversation),
                messageId: serializeMessageId(messageId),
            };

            switch (update.update) {
                case 'read':
                    return {
                        ...commonProps,
                        update: 'read',
                        read: creator(d2d.IncomingMessageUpdate.Read, {
                            at: intoUnsignedLong(dateToUnixTimestampMs(update.read.at)),
                        }),
                    };
                default:
                    return unreachable(update.update);
            }
        }),
    );

    return creator(d2d.IncomingMessageUpdate, {
        updates,
    });
}
