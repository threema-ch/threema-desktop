import * as v from '@badrap/valita';
import Long from 'long';

import type {GlobalPropertyKey} from '~/common/enum';
import * as proto from '~/common/internal-protobuf/global-property';
import type {GlobalPropertyValues} from '~/common/model/types/settings';
import type {ReadonlyUint8Array} from '~/common/types';
import {
    dateToUnixTimestampMs,
    intoU64,
    intoUnsignedLong,
    unixTimestampToDateMs,
} from '~/common/utils/number';

/**
 * Validation schema for the Profile Settings parameters.
 *
 * @throws {ValitaError} In case validation fails.
 */
const LAST_MEDIATOR_CONNECTION_SCHEMA = v.object({
    /**
     * The last successfull mediator connection date.
     */
    date: v.unknown().assert(Long.isLong).map(intoU64).map(unixTimestampToDateMs).optional(),
});

function serialize(
    validatedMessage: GlobalPropertyValues[GlobalPropertyKey.LAST_MEDIATOR_CONNECTION],
): Uint8Array {
    let date;
    if (validatedMessage.date === undefined) {
        date = undefined;
    } else {
        date = intoUnsignedLong(dateToUnixTimestampMs(validatedMessage.date));
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
