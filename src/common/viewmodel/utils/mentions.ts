import {type DbContact} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {type AnyMessageModel, type Repositories} from '~/common/model';
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
    | {
          readonly type: 'self';
          readonly identityString: IdentityString;
          readonly name: string;
      }
    | {
          readonly type: 'all';
          readonly identityString: typeof MENTION_ALL;
      }
    | {
          readonly type: 'other';
          readonly identityString: IdentityString;
          readonly name: string;
          readonly lookup: Pick<DbContact, 'type' | 'uid'>;
      };

/**
 * Parse and return mention strings of text
 * @returns Set of parsed identystrings or `@@@@@@@`
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

export function getMentions(messageModel: AnyMessageModel, model: Repositories): Mention[] {
    const mentions: Mention[] = [];

    for (const identityString of getMentionedIdentityStrings(messageModel)) {
        if (identityString === MENTION_ALL) {
            mentions.push({
                type: 'all',
                identityString: MENTION_ALL,
            });
            continue;
        }

        if (identityString === model.user.identity) {
            mentions.push({
                type: 'self',
                identityString,
                name: model.user.displayName.get(),
            });
            continue;
        }

        const otherContact = model.contacts.getByIdentity(identityString);
        if (otherContact !== undefined) {
            mentions.push({
                type: 'other',
                identityString,
                name: otherContact.get().view.displayName,
                lookup: {
                    type: ReceiverType.CONTACT,
                    uid: otherContact.ctx,
                },
            });
        }
    }

    return mentions;
}
