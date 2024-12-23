import * as v from '@badrap/valita';
import type Long from 'long';

import {ensureIdentityString, ensureMessageId, type MessageId} from '~/common/network/types';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';
import {unsignedLongAsU64} from '~/common/utils/valita-helpers';

/*
 * Helpers
 */
export const NULL_OR_UNDEFINED_SCHEMA = v.union(v.null(), v.undefined()).map(() => undefined);
export const MESSAGE_ID_SCHEMA = unsignedLongAsU64().map(ensureMessageId);
export const IDENTITY_STRING_LIST_SCHEMA = v.array(v.string().map(ensureIdentityString));
export function serializeMessageId(id: MessageId): Long {
    return intoUnsignedLong(id);
}
export function serializeDate(date: Date): Long {
    return intoUnsignedLong(dateToUnixTimestampMs(date));
}
