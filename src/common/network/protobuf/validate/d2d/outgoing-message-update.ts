import * as v from '@badrap/valita';

import {d2d} from '~/common/network/protobuf/js';
import {creator, validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA, serializeMessageId} from '~/common/network/protobuf/validate/helpers';
import {unreachable} from '~/common/utils/assert';

import * as ConversationId from './conversation-id';

const SENT_SCHEMA = validator(d2d.OutgoingMessageUpdate.Sent, v.object({}));

export const SCHEMA = validator(
    d2d.OutgoingMessageUpdate,
    v
        .object({
            updates: v.array(
                validator(
                    d2d.OutgoingMessageUpdate.Update,
                    v.object({
                        conversation: ConversationId.SCHEMA,
                        messageId: MESSAGE_ID_SCHEMA,
                        update: v.literal('sent'),
                        sent: SENT_SCHEMA,
                    }),
                ),
            ),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;

export function serialize(validatedMessage: Type): d2d.OutgoingMessageUpdate {
    const updates = creator(
        d2d.OutgoingMessageUpdate.Update,
        validatedMessage.updates.map((update) => {
            const {conversation, messageId} = update;

            const commonProps = {
                conversation: ConversationId.serialize(conversation),
                messageId: serializeMessageId(messageId),
            };

            switch (update.update) {
                case 'sent':
                    return {
                        ...commonProps,
                        update: 'sent',
                        sent: creator(d2d.OutgoingMessageUpdate.Sent, {}),
                    };
                default:
                    return unreachable(update.update);
            }
        }),
    );

    return creator(d2d.OutgoingMessageUpdate, {
        updates,
    });
}
