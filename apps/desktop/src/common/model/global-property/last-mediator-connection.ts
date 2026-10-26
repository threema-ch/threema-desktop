import * as v from '@badrap/valita';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {dateToUnixTimestampMs} from '@threema/ts-utils/number/date-to-unix-timestamp-ms';
import {unsignedLongToU64} from '@threema/ts-utils/number/into-u64';
import {u64ToUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import {unixTimestampToDateMs} from '@threema/ts-utils/number/unix-timestamp-to-date-ms';
import Long from 'long';

import type {GlobalPropertyKey} from '~/common/enum';
import * as proto from '~/common/internal-protobuf/global-property';
import type {GlobalPropertyValues} from '~/common/model/types/settings';

/**
 * Validation schema for the Profile Settings parameters.
 *
 * @throws {ValitaError} In case validation fails.
 */
const LAST_MEDIATOR_CONNECTION_SCHEMA = v.object({
    /**
     * The last successfull mediator connection date.
     */
    date: v
        .unknown()
        .assert(Long.isLong)
        .map(unsignedLongToU64)
        .map(unixTimestampToDateMs)
        .optional(),
});

function serialize(
    validatedMessage: GlobalPropertyValues[GlobalPropertyKey.LAST_MEDIATOR_CONNECTION],
): Uint8Array {
    let date;
    if (validatedMessage.date === undefined) {
        date = undefined;
    } else {
        date = u64ToUnsignedLong(dateToUnixTimestampMs(validatedMessage.date));
    }

    return proto.LastMediatorConnection.encode({date}).finish();
}

/**
 * Decode and validate LAST_MEDIATOR_CONNECTION property
 *
 * @param serializedValue Serialized Protobuf Value
 * @throws Error if serialized value is not valid
 * @returns Deserialized property
 */
function deserialize(
    serializedValue: ReadonlyUint8Array,
): GlobalPropertyValues[GlobalPropertyKey.LAST_MEDIATOR_CONNECTION] {
    const decoded = proto.LastMediatorConnection.decode(serializedValue as Uint8Array);
    return LAST_MEDIATOR_CONNECTION_SCHEMA.parse(decoded);
}

export const LAST_MEDIATOR_CONNECTION_CODEC = {
    serialize,
    deserialize,
};
