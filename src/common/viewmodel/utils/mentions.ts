import type {DbContactReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import type {AnyMessageModel} from '~/common/model';
import {type IdentityString, isIdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {ServicesForViewModel} from '~/common/viewmodel';

/**
 * Regex to match user mentions.
 */
// eslint-disable-next-line threema/ban-stateful-regex-flags
export const REGEX_MATCH_MENTION = /@\[(?<identity>[A-Z0-9*]{1}[A-Z0-9]{7}|@{8})\]/gu;

/**
 * Identity string that matches everyone.
 */
const EVERYONE_IDENTITY_STRING = '@@@@@@@@';

/**
 * Union of all types of mention.
 */
export type AnyMention = MentionSelf | MentionContact | MentionEveryone;

/**
 * A mention that matches the user themself.
 */
export interface MentionSelf {
    readonly type: 'self';
    readonly identity: IdentityString;
    /** Display name of the user. */
    readonly name: string | undefined;
}

/**
 * A mention that matches a contact.
 */
export interface MentionContact {
    readonly type: 'contact';
    readonly identity: IdentityString;
    readonly lookup: DbContactReceiverLookup;
    /** Display name of the contact. */
    readonly name: string;
}

/**
 * A mention that matches everyone (e.g., all members of a group).
 */
export interface MentionEveryone {
    readonly type: 'everyone';
    readonly identity: typeof EVERYONE_IDENTITY_STRING;
}

/**
 * Extract all raw mentions from the specified {@link messageModel}.
 *
 * @returns Set of parsed identity strings or `@@@@@@@`.
 */
function getMentionedIdentityStrings(messageModel: AnyMessageModel): Set<AnyMention['identity']> {
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

    const mentionedIdentities = new Set<AnyMention['identity']>();
    for (const match of text.matchAll(REGEX_MATCH_MENTION)) {
        const identity = match.groups?.identity;

        if (isIdentityString(identity) || identity === EVERYONE_IDENTITY_STRING) {
            mentionedIdentities.add(identity);
        }
    }

    return mentionedIdentities;
}

/**
 * Extract all mentions present in the specified {@link messageModel}.
 */
export function getMentions(
    services: Pick<ServicesForViewModel, 'model'>,
    messageModel: AnyMessageModel,
): AnyMention[] {
    const {model} = services;

    const mentions: AnyMention[] = [];

    for (const identity of getMentionedIdentityStrings(messageModel)) {
        if (identity === EVERYONE_IDENTITY_STRING) {
            mentions.push({
                type: 'everyone',
                identity: EVERYONE_IDENTITY_STRING,
            });
            continue;
        }

        if (identity === model.user.identity) {
            mentions.push({
                type: 'self',
                identity,
                name: model.user.profileSettings.get().view.nickname,
            });
            continue;
        }

        const contact = model.contacts.getByIdentity(identity);
        if (contact !== undefined) {
            mentions.push({
                type: 'contact',
                identity,
                lookup: {
                    type: ReceiverType.CONTACT,
                    uid: contact.ctx,
                },
                name: contact.get().view.displayName,
            });
        }
    }

    return mentions;
}
