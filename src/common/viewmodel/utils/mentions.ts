import {ReceiverType} from '~/common/enum';
import type {AnyNonDeletedMessageModel} from '~/common/model/types/message';
import {isIdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getRemovedContactData} from '~/common/viewmodel/utils/contact';
import type {
    SenderDataContact,
    SenderDataRemovedContact,
    SenderDataSelf,
} from '~/common/viewmodel/utils/sender';

/**
 * Regex to match user mentions.
 */
// eslint-disable-next-line threema/ban-stateful-regex-flags
export const REGEX_MATCH_MENTION = /@\[(?<identity>[A-Z0-9*]{1}[A-Z0-9]{7}|@{8})\]/gu;

/**
 * Identity string that matches everyone.
 */
export const EVERYONE_IDENTITY_STRING = '@@@@@@@@';

/**
 * A mention that matches the user themself.
 */
export type MentionSelf = Pick<SenderDataSelf, 'type' | 'identity' | 'nickname'>;

/**
 * A mention that matches a contact.
 */
export type MentionContact = Pick<SenderDataContact, 'type' | 'identity' | 'lookup' | 'name'>;

/**
 * A mention that matches a contact that has been removed from the contact list of the user.
 */
export type MentionContactRemoved = Pick<SenderDataRemovedContact, 'type' | 'identity'>;

/**
 * A mention that matches everyone (e.g., all members of a group).
 */
export interface MentionEveryone {
    readonly type: 'everyone';
    readonly identity: typeof EVERYONE_IDENTITY_STRING;
}

/**
 * Union of all types of mention.
 */
export type AnyMention = MentionSelf | MentionContact | MentionContactRemoved | MentionEveryone;

/**
 * Extract all raw mentions from the specified {@link messageModel}.
 *
 * @returns Set of parsed identity strings or `@@@@@@@`.
 */
function getMentionedIdentityStrings(
    messageModel: AnyNonDeletedMessageModel,
): Set<AnyMention['identity']> {
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
    messageModel: AnyNonDeletedMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
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
            const {user} = services.model;
            mentions.push({
                type: 'self',
                identity,
                nickname: getAndSubscribe(user.profileSettings).view.nickname,
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
                name: getAndSubscribe(contact).view.displayName,
            });
        } else {
            mentions.push(getRemovedContactData(identity));
        }
    }

    return mentions;
}
