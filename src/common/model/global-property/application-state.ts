import * as v from '@badrap/valita';

import type {GlobalPropertyKey} from '~/common/enum';
import * as proto from '~/common/model/global-property/global-property';
import type {GlobalPropertyValues} from '~/common/model/types/settings';
import type {ReadonlyUint8Array} from '~/common/types';

/**
 * Validation schema for the Profile Settings parameters.
 *
 * @throws {ValitaError} In case validation fails.
 */
const APPLICATION_STATE_SCHEMA = v.object({
    /**
     * The last successfull mediator connection date.
     */
    unrecoverableStateDetected: v.boolean().default(false),
});

function serialize(
    validatedMessage: GlobalPropertyValues[GlobalPropertyKey.APPLICATION_STATE],
): Uint8Array {
    let unrecoverableStateDetected;
    if (validatedMessage.unrecoverableStateDetected === undefined) {
        unrecoverableStateDetected = undefined;
    } else {
        unrecoverableStateDetected = validatedMessage.unrecoverableStateDetected;
    }

    return proto.ApplicationState.encode({unrecoverableStateDetected}).finish();
}

/**
 * Decode and validate APPLICATION_STATE property
 *
 * @param serializedValue Serialized Protobuf Value
 * @throws Error if serialized value is not valid
 * @returns Deserialized property
 */
function deserialize(
    serializedValue: ReadonlyUint8Array,
): GlobalPropertyValues[GlobalPropertyKey.APPLICATION_STATE] {
    const decoded = proto.ApplicationState.decode(serializedValue as Uint8Array);
    return APPLICATION_STATE_SCHEMA.parse(decoded);
}

export const APPLICATION_STATE_CODEC = {
    serialize,
    deserialize,
};
