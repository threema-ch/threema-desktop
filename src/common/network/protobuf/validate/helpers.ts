import * as v from '@badrap/valita';
import Long from 'long';

import {type MessageId, ensureMessageId} from '~/common/network/types';
import {dateToUnixTimestampMs, intoU64, intoUnsignedLong} from '~/common/utils/number';
import {instanceOf} from '~/common/utils/valita-helpers';

/*
 * Helpers
 */
export const NULL_OR_UNDEFINED_SCHEMA = v.union(v.null(), v.undefined()).map(() => undefined);
export const MESSAGE_ID_SCHEMA = instanceOf(Long).map(intoU64).map(ensureMessageId);
export function serializeMessageId(id: MessageId): Long {
    return intoUnsignedLong(id);
}
export function serializeDate(date: Date): Long {
    return intoUnsignedLong(dateToUnixTimestampMs(date));
}
