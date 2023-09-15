import * as sha256 from 'fast-sha256';

import {ReceiverType} from '~/common/enum';
import {type ConversationId} from '~/common/network/types';
import {type u8, type u53} from '~/common/types';
import {unreachable, unwrap} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {u64ToBytesLe} from '~/common/utils/number';

const COLOR_GROUPS = [
    'deep-orange',
    'orange',
    'amber',
    'yellow',
    'olive',
    'light-green',
    'green',
    'teal',
    'cyan',
    'light-blue',
    'blue',
    'indigo',
    'deep-purple',
    'purple',
    'pink',
    'red',
] as const;

export type IdColor = (typeof COLOR_GROUPS)[u53];

/**
 * Return the index (in the range 0-255) of the color to be used for this receiver.
 */
export function idColorIndex(conversationId: ConversationId): u8 {
    const hashedBytes = sha256.hash(getBytesToHash(conversationId));
    return unwrap(hashedBytes[0], 'Empty SHA256 hash');
}

/**
 * Return the bytes that should be hashed in order to derive an ID color.
 */
function getBytesToHash(conversationId: ConversationId): Uint8Array {
    switch (conversationId.type) {
        case ReceiverType.CONTACT:
            return UTF8.encode(conversationId.identity);
        case ReceiverType.GROUP: {
            const bytes = new Uint8Array(16);
            const rest = UTF8.encodeFullyInto(conversationId.creatorIdentity, bytes).rest;
            rest.set(u64ToBytesLe(conversationId.groupId));
            return bytes;
        }
        case ReceiverType.DISTRIBUTION_LIST:
            return u64ToBytesLe(conversationId.distributionListId);
        default:
            return unreachable(conversationId);
    }
}

/**
 * Convert a color index (0-255) to an {@link IdColor} color string.
 */
export function idColorIndexToString(index: u8): IdColor {
    return unwrap(COLOR_GROUPS[Math.floor(index / 16)]);
}
