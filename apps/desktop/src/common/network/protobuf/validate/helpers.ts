import * as v from '@badrap/valita';
import {dateToUnixTimestampMs} from '@threema/ts-utils/number/date-to-unix-timestamp-ms';
import {intoUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import type Long from 'long';

import {ensureIdentityString, ensureMessageId, type MessageId} from '~/common/network/types';
import {unsignedLongAsU64} from '~/common/utils/valita-helpers';

/*
 * Helpers
 */
// Note: The schema lives in `@threema/protocol` next to the generated bindings it matches. It is
// re-exported here to keep the existing import sites working.
//
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports.
export {NULL_OR_UNDEFINED_SCHEMA} from '@threema/protocol/protobuf/utils';
export const MESSAGE_ID_SCHEMA = unsignedLongAsU64().map(ensureMessageId);
export const IDENTITY_STRING_LIST_SCHEMA = v.array(v.string().map(ensureIdentityString));
export function serializeMessageId(id: MessageId): Long {
    return intoUnsignedLong(id);
}
export function serializeDate(date: Date): Long {
    return intoUnsignedLong(dateToUnixTimestampMs(date));
}
