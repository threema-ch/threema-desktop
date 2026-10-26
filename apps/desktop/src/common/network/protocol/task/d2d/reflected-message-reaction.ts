import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import type {AnyNonDeletedMessageModelStore} from '~/common/model/types/message';
import type * as protobuf from '~/common/network/protobuf';
import type {PassiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {MessageReactionTask} from '~/common/network/protocol/task/common/message-reaction';
import type {
    ConversationId,
    DistributionListConversationId,
    EmojiReaction,
    IdentityString,
    MessageId,
} from '~/common/network/types';

export class ReflectedMessageReactionTask extends MessageReactionTask<PassiveTaskCodecHandle> {
    public constructor(
        services: ServicesForTasks,
        messageId: MessageId,
        conversationId: Exclude<ConversationId, DistributionListConversationId>,
        reactionMessage: protobuf.validate.csp_e2e.Reaction.Type,
        createdAt: Date,
        senderIdentity: IdentityString,
    ) {
        const messageIdHex = u64ToHexLe(messageId);

        const log = services.logging.logger(
            `network.protocol.task.reflected-message-reaction.${messageIdHex}`,
        );

        super(services, conversationId, reactionMessage, createdAt, senderIdentity, log);
    }

    protected override _apply(
        handle: PassiveTaskCodecHandle,
        messageModelStore: AnyNonDeletedMessageModelStore,
        emojiReaction: EmojiReaction,
    ): void {
        messageModelStore
            .get()
            .controller.addReaction.fromSync(
                handle,
                emojiReaction,
                this._createdAt,
                this._senderIdentity,
            );
    }

    protected override _withdraw(
        handle: PassiveTaskCodecHandle,
        messageModelStore: AnyNonDeletedMessageModelStore,
        emojiReaction: EmojiReaction,
    ): void {
        messageModelStore
            .get()
            .controller.withdrawReaction.fromSync(handle, emojiReaction, this._senderIdentity);
    }
}
