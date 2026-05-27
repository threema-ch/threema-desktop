import {expect} from 'chai';

import type {DbPollVoteFragment} from '~/common/db';
import {PollAnswerType} from '~/common/enum';
import {ReflectedPollUpdateTask} from '~/common/network/protocol/task/d2d/reflected-poll-update';
import {ensureIdentityString} from '~/common/network/types';
import {TestHandle} from '~/test/mocha/common/backend-mocks';
import {
    addTestPoll,
    createPollTestContext,
    getVoteStatsForSender,
    type PollTestContext,
} from '~/test/mocha/common/network/protocol/task/poll-test-helpers';

/**
 * Test reflected (D2D) poll-vote task.
 *
 * Shares the `PollUpdateTask._vote` logic with `IncomingPollUpdateTask`, so the
 * single-choice rejection is exercised here through the passive-handle path.
 */
export function run(): void {
    describe('ReflectedPollUpdateTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        let ctx: PollTestContext;

        this.beforeEach(function () {
            ctx = createPollTestContext(me);
        });

        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                ctx.services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        async function runVote(
            answerType: PollAnswerType,
            choices: DbPollVoteFragment['choices'],
        ): Promise<{readonly total: number; readonly selected: number}> {
            const senderIdentity = ctx.user1.identity.string;
            const {pollId, creatorIdentity} = addTestPoll(ctx, {
                creatorIdentity: senderIdentity,
                answerType,
                choiceIds: [1, 2],
            });

            const fragment: DbPollVoteFragment = {pollId, creatorIdentity, choices};
            const task = new ReflectedPollUpdateTask(
                ctx.services,
                ctx.conversationId,
                fragment,
                senderIdentity,
            );
            const handle = new TestHandle(ctx.services, []);
            await task.run(handle);
            handle.finish();

            return getVoteStatsForSender(ctx.conversation, creatorIdentity, pollId, senderIdentity);
        }

        it('discards a vote selecting multiple choices on a single-choice poll', async function () {
            const stats = await runVote(PollAnswerType.SINGLE_CHOICE, [
                {choiceId: 1, selected: true},
                {choiceId: 2, selected: true},
            ]);
            expect(stats).to.deep.equal({total: 0, selected: 0});
        });

        it('accepts a vote selecting a single choice on a single-choice poll', async function () {
            const stats = await runVote(PollAnswerType.SINGLE_CHOICE, [
                {choiceId: 1, selected: true},
                {choiceId: 2, selected: false},
            ]);
            expect(stats).to.deep.equal({total: 2, selected: 1});
        });

        it('accepts a vote selecting multiple choices on a multiple-choice poll', async function () {
            const stats = await runVote(PollAnswerType.MULTIPLE_CHOICE, [
                {choiceId: 1, selected: true},
                {choiceId: 2, selected: true},
            ]);
            expect(stats).to.deep.equal({total: 2, selected: 2});
        });
    });
}
