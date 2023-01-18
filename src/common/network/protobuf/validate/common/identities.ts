import * as v from '@badrap/valita';

import {common} from '~/common/network/protobuf/js';
import {type ProtobufInstanceOf, creator, validator} from '~/common/network/protobuf/utils';
import {ensureIdentityString} from '~/common/network/types';

/** Validates {@link common.Identities} */
export const SCHEMA = validator(
    common.Identities,
    v
        .object({
            identities: v.array(v.string().map(ensureIdentityString)),
        })
        .rest(v.unknown()),
);

export function serialize(validatedMessage: Type): ProtobufInstanceOf<typeof common.Identities> {
    return creator(common.Identities, {
        identities: validatedMessage.identities,
    });
}

export type Type = v.Infer<typeof SCHEMA>;
