import type {DbContact} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import type {AnyMessageModel, Repositories} from '~/common/model';
import {type IdentityString, isIdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';

/**
 * Regex to match user mentions
 */
// eslint-disable-next-line threema/ban-stateful-regex-flags
export const REGEX_MATCH_MENTION = /@\[(?<identity>[A-Z0-9*]{1}[A-Z0-9]{7}|@{8})\]/gu;

/**
 * Mention value to match mention every user
 */
export const MENTION_ALL = '@@@@@@@@';

export type Mention =
    // Own ID is mentioned
    | {
          readonly type: 'self';
          readonly identity: IdentityString;
          readonly nickname: string | undefined;
      }
    // Everybody is mentioned (@all)
    | {
          readonly type: 'all';
          readonly identity: typeof MENTION_ALL;
      }
    // A contact is mentioned
    | {
          readonly type: 'other';
          readonly identity: IdentityString;
          readonly displayName: string;
          readonly lookup: Pick<DbContact, 'type' | 'uid'>;
      };

/**
 * Extract all raw mentions from the specified {@link messageModel}.
 *
 * @returns Set of parsed identity strings or `@@@@@@@`
 */
function getMentionedIdentityStrings(
    messageModel: AnyMessageModel,
): Set<IdentityString | typeof MENTION_ALL> {
    let text: string;

    switch (messageModel.type) {
        case 'text': {
            text = messageModel.view.text;
            break;
        }
        case 'file':
        case 'image':
        case 'video':
        case 'audio':
            text = messageModel.view.caption ?? '';
            break;
        default:
            unreachable(messageModel);
    }

    const mentionedIdentities = new Set<IdentityString | typeof MENTION_ALL>();

    for (const match of text.matchAll(REGEX_MATCH_MENTION)) {
        const identity = match.groups?.identity;
        if (isIdentityString(identity) || identity === MENTION_ALL) {
            mentionedIdentities.add(identity);
        }
    }

    return mentionedIdentities;
}

/**
 * Extract all mentions present in the specified {@link messageModel}.
 */
export function getMentions(messageModel: AnyMessageModel, repositories: Repositories): Mention[] {
    const mentions: Mention[] = [];

    for (const identity of getMentionedIdentityStrings(messageModel)) {
        if (identity === MENTION_ALL) {
            mentions.push({
                type: 'all',
                identity: MENTION_ALL,
            });
            continue;
        }

        if (identity === repositories.user.identity) {
            mentions.push({
                type: 'self',
                identity,
                nickname: repositories.user.profileSettings.get().view.nickname,
            });
            continue;
        }

        const otherContact = repositories.contacts.getByIdentity(identity);
        if (otherContact !== undefined) {
            mentions.push({
                type: 'other',
                identity,
                displayName: otherContact.get().view.displayName,
                lookup: {
                    type: ReceiverType.CONTACT,
                    uid: otherContact.ctx,
                },
            });
        }
    }

    return mentions;
}
