import {PollAnswerType} from '~/common/enum';
import type {IdentityString} from '~/common/network/types';
import type {i53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

/**
 * Minimal shape required for {@link sanitizePollChoices}. Matches both
 * `CommonPollMessageView['choices'][number]` and
 * `DbPollMessageFragment['choices'][number]`, so callers can use the helper
 * regardless of which side of the model boundary they are on.
 */
interface SanitizablePollChoice {
    readonly choiceId: i53;
    readonly votes: readonly {
        readonly senderIdentity: IdentityString;
        readonly selected: boolean;
    }[];
}

export interface SanitizePollChoicesResult<TChoice extends SanitizablePollChoice> {
    readonly choices: TChoice[];
    readonly droppedSenders: readonly IdentityString[];
}

/**
 * Sanitize a poll's choices according to its answer type.
 *
 * For {@link PollAnswerType.MULTIPLE_CHOICE} polls the choices are returned
 * untouched.
 *
 * For {@link PollAnswerType.SINGLE_CHOICE} polls, if the sender selects more
 * than one choice, every one of their `selected === true` votes is flipped to
 * `selected === false`.
 *
 * @param choices The poll choices to sanitize.
 * @param answerType The poll's answer type.
 * @returns The (possibly cleaned) choices, plus the set of senders whose
 *   votes were dropped (empty if nothing was changed).
 */
export function sanitizePollChoices<TChoice extends SanitizablePollChoice>(
    choices: readonly TChoice[],
    answerType: PollAnswerType,
): SanitizePollChoicesResult<TChoice> {
    switch (answerType) {
        case PollAnswerType.MULTIPLE_CHOICE:
            return {choices: [...choices], droppedSenders: []};
        case PollAnswerType.SINGLE_CHOICE: {
            // Count how many choices each sender selected across the poll.
            const selectedCountBySender = choices
                .flatMap((choice) => choice.votes)
                .filter((vote) => vote.selected)
                .reduce<Map<IdentityString, number>>((counts, {senderIdentity}) => {
                    counts.set(senderIdentity, (counts.get(senderIdentity) ?? 0) + 1);
                    return counts;
                }, new Map());

            // Senders that selected more than one choice violate the single-choice invariant.
            const bannedSenders = new Set(
                [...selectedCountBySender]
                    .filter(([, count]) => count > 1)
                    .map(([senderIdentity]) => senderIdentity),
            );

            if (bannedSenders.size === 0) {
                return {choices: [...choices], droppedSenders: []};
            }

            const sanitizedChoices = choices.map((choice) => ({
                ...choice,
                votes: choice.votes.map((vote) =>
                    bannedSenders.has(vote.senderIdentity) && vote.selected
                        ? {...vote, selected: false}
                        : vote,
                ),
            })) as TChoice[];

            return {
                choices: sanitizedChoices,
                droppedSenders: [...bannedSenders],
            };
        }
        default:
            return unreachable(answerType);
    }
}
