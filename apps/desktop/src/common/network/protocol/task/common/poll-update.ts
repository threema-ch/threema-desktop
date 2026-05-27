import {u64ToHexLe} from '@threema/ts-utils/number/u64-to-hex-le';

import type {DbPollVoteFragment} from '~/common/db';
import {PollAnnounceType, PollAnswerType, PollState, PollMessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {
    IInboundPollMessageModelStore,
    IOutboundPollMessageModelStore,
} from '~/common/model/types/message/poll';
import type {
    PassiveTaskCodecHandle,
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {getConversationById} from '~/common/network/protocol/task/message-processing-helpers';
import type {
    ConversationId,
    DistributionListConversationId,
    IdentityString,
} from '~/common/network/types';
import {hasProperty} from '~/common/utils/object';

export abstract class PollUpdateTask<
    TTaskCodecHandleType extends PassiveTaskCodecHandle | ActiveTaskCodecHandle<'volatile'>,
> implements ComposableTask<TTaskCodecHandleType, void>
{
    public constructor(
        private readonly _log: Logger,
        private readonly _services: ServicesForTasks,
        private readonly _conversationId: Exclude<ConversationId, DistributionListConversationId>,
        private readonly _pollUpdateData: DbPollVoteFragment,
        private readonly _senderIdentity: IdentityString,
    ) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: TTaskCodecHandleType): Promise<void> {
        // Look up conversation
        const conversation = getConversationById(this._services, this._conversationId);
        if (conversation === undefined) {
            this._log.warn(`Conversation not found, aborting`);
            return;
        }

        // Look up message
        const creatorIdentity = hasProperty(this._pollUpdateData, 'creatorIdentity')
            ? this._pollUpdateData.creatorIdentity
            : this._senderIdentity;

        // 1. Look up the poll with the given ID within the conversation.
        const message = conversation
            .get()
            .controller.getMessageByPollId(
                creatorIdentity,
                this._pollUpdateData.pollId,
                PollMessageType.POLL_CREATED,
            );

        if (message === undefined) {
            this._log.warn(
                `Discarding conversation message update for poll ${u64ToHexLe(
                    this._pollUpdateData.pollId,
                )} as the target message was not found or is not a poll`,
            );
            return;
        }

        this._vote(handle, message, this._pollUpdateData, this._senderIdentity);
    }

    private _vote(
        handle: TTaskCodecHandleType,
        message: IInboundPollMessageModelStore | IOutboundPollMessageModelStore,
        pollUpdateData: DbPollVoteFragment,
        senderIdentity: IdentityString,
    ): void {
        this._log.info(`Processing poll vote for message: ${message.ctx}`);

        // Extra: iOS is sending votes to all participants even if announceType is ON_CLOSE. We
        // ignore these messages.
        if (
            message.get().view.announceType !== PollAnnounceType.ON_EVERY_VOTE &&
            this._services.device.identity.string !== senderIdentity &&
            this._services.device.identity.string !== pollUpdateData.creatorIdentity
        ) {
            this._log.warn(
                `Poll announceType is ON_CLOSE and vote is coming from unexpected identity. Ignoring`,
            );
            return;
        }

        // 2. If no associated poll could be found or if the associated poll is closed, discard the
        //    message and abort these steps.
        if (message.get().view.pollState === PollState.CLOSED) {
            this._log.warn(`Associated poll could be found or is already closed. Abort`);
            return;
        }

        // Discard votes that select more than one choice on a single-choice poll.
        if (
            message.get().view.answerType === PollAnswerType.SINGLE_CHOICE &&
            pollUpdateData.choices.filter((choice) => choice.selected).length > 1
        ) {
            this._log.warn(
                `Discarding poll vote for single-choice poll ${u64ToHexLe(
                    pollUpdateData.pollId,
                )}: multiple choices selected`,
            );
            return;
        }

        // 3. Update the poll with the provided choices of the sender.
        this._pollVote(handle, message, pollUpdateData, senderIdentity);
    }

    protected abstract _pollVote(
        handle: TTaskCodecHandleType,
        message: IInboundPollMessageModelStore | IOutboundPollMessageModelStore,
        pollUpdateData: DbPollVoteFragment,
        senderIdentity: IdentityString,
    ): void;
}
