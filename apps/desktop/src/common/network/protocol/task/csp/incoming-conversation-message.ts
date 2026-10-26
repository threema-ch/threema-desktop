import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {MessageDirection, MessageType} from '~/common/enum';
import type {Conversation, DirectedMessageFor} from '~/common/model';
import type {
    AnyNonDeletedMessageModelStore,
    AnyPollMessageModelStore,
} from '~/common/model/types/message';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {
    ActiveTaskCodecHandle,
    InternalActiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {BaseConversationMessageTask} from '~/common/network/protocol/task/common/conversation-message';
import {assert, assertUnreachable} from '~/common/utils/assert';

export class IncomingConversationMessageTask extends BaseConversationMessageTask<
    ActiveTaskCodecHandle<'volatile'>
> {
    public constructor(
        services: ServicesForTasks,
        conversation: ModelStore<Conversation>,
        directedMessageInit: DirectedMessageFor<
            MessageDirection.INBOUND,
            Exclude<MessageType, 'deleted'>,
            'init'
        >,
    ) {
        const messageIdHex = u64ToHexLe(directedMessageInit.id);

        const log = services.logging.logger(
            `network.protocol.task.incoming-conversation-message.${messageIdHex}`,
        );
        super(services, conversation, directedMessageInit, log);
    }

    protected async _closePoll(
        handle: ActiveTaskCodecHandle<'volatile'>,
        poll: AnyPollMessageModelStore,
    ): Promise<void> {
        assert(
            poll.ctx === MessageDirection.INBOUND,
            'Poll corresponding to incoming conversation message must be inbound.',
        );
        assert(
            this._directedMessageInit.type === MessageType.POLL &&
                this._directedMessageInit.direction === MessageDirection.INBOUND,
            'Only inbound polls can be closed by an inbound message',
        );
        await poll
            .get()
            .controller.close.fromRemote(handle, this._directedMessageInit)
            .catch(assertUnreachable);
    }

    protected override async _addMessage(
        handle: InternalActiveTaskCodecHandle,
    ): Promise<AnyNonDeletedMessageModelStore> {
        assert(
            this._directedMessageInit.direction === MessageDirection.INBOUND,
            'Only inbound polls can be closed by an inbound message',
        );
        return await this._conversation
            .get()
            .controller.addMessage.fromRemote(handle, this._directedMessageInit);
    }
}
