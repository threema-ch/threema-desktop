import type {DbContactUid} from '~/common/db';
import {
    MessageDirection,
    PollAnnounceType,
    type PollAnswerType,
    PollChoicesType,
    PollDisplayMode,
    PollMessageType,
    PollState,
    ReceiverType,
} from '~/common/enum';
import type {Conversation} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import {
    type ContactConversationId,
    ensureIdentityString,
    ensurePollId,
    type IdentityString,
    type Nickname,
    type PollId,
} from '~/common/network/types';
import type {i53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';

/**
 * Shared fixture state for poll-vote task tests.
 */
export interface PollTestContext {
    readonly services: TestServices;
    readonly user1: TestUser;
    readonly conversation: ModelStore<Conversation>;
    readonly conversationId: ContactConversationId;
    readonly senderUid: DbContactUid;
}

/**
 * Create services and a 1:1 conversation with a single contact (`USER0001`).
 */
export function createPollTestContext(me: IdentityString): PollTestContext {
    const services = makeTestServices(me);

    const user1: TestUser = {
        identity: new Identity(ensureIdentityString('USER0001')),
        nickname: 'user1' as Nickname,
        ck: createClientKey(),
    };

    const contact = addTestUserAsContact(services.model, user1);
    const senderUid = contact.ctx;

    const conversation = services.model.conversations.getForReceiver({
        type: ReceiverType.CONTACT,
        uid: senderUid,
    });
    assert(conversation !== undefined, 'Conversation for user1 not found');

    return {
        services,
        user1,
        conversation,
        conversationId: {type: ReceiverType.CONTACT, identity: user1.identity.string},
        senderUid,
    };
}

/**
 * Seed an (inbound) poll into the given 1:1 conversation and return the lookup
 * data needed to cast a vote against it.
 *
 * The poll is created with `announceType: ON_EVERY_VOTE` so that the
 * announce-type guard in `PollUpdateTask` is skipped and tests exercise the
 * single-choice validation rather than that guard.
 */
export function addTestPoll(
    context: PollTestContext,
    options: {
        readonly creatorIdentity: IdentityString;
        readonly answerType: PollAnswerType;
        readonly choiceIds: readonly i53[];
    },
): {readonly pollId: PollId; readonly creatorIdentity: IdentityString} {
    const pollId = ensurePollId(1n);

    context.conversation.get().controller.addMessage.direct({
        direction: MessageDirection.INBOUND,
        type: 'poll',
        id: randomMessageId(context.services.crypto),
        sender: context.senderUid,
        createdAt: new Date(),
        receivedAt: new Date(),
        raw: new Uint8Array(0),
        pollId,
        pollCreatorIdentity: options.creatorIdentity,
        description: 'Test poll',
        pollState: PollState.OPEN,
        answerType: options.answerType,
        announceType: PollAnnounceType.ON_EVERY_VOTE,
        displayMode: PollDisplayMode.LIST,
        choicesType: PollChoicesType.TEXT,
        participants: [],
        choices: options.choiceIds.map((choiceId, index) => ({
            choiceId,
            description: `Choice ${choiceId}`,
            sortKey: index,
            participantVotes: [],
        })),
    });

    return {pollId, creatorIdentity: options.creatorIdentity};
}

/**
 * Return the recorded vote stats for the given sender in the poll:
 * - `total`: the number of vote rows recorded for the sender (across all
 *   choices). `0` means the vote was discarded before being written.
 * - `selected`: how many of those votes have `selected === true`.
 *
 * This lets tests distinguish a discarded vote (`total === 0`) from an
 * accepted vote with no selection (`total > 0`, `selected === 0`).
 */
export function getVoteStatsForSender(
    conversation: ModelStore<Conversation>,
    creatorIdentity: IdentityString,
    pollId: PollId,
    senderIdentity: IdentityString,
): {readonly total: i53; readonly selected: i53} {
    const poll = conversation
        .get()
        .controller.getMessageByPollId(creatorIdentity, pollId, PollMessageType.POLL_CREATED);
    assert(poll !== undefined, 'Seeded poll not found');

    const senderVotes = poll
        .get()
        .view.choices.flatMap((choice) => choice.votes)
        .filter((vote) => vote.senderIdentity === senderIdentity);

    return {
        total: senderVotes.length,
        selected: senderVotes.filter((vote) => vote.selected).length,
    };
}
