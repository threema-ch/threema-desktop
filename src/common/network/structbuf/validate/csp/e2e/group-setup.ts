import * as v from '@badrap/valita';

import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {ensureIdentityString} from '~/common/network/types';
import {UTF8} from '~/common/utils/codec';
import {isIterable} from '~/common/utils/object';

/** Validates {@link csp.e2e.GroupSetup} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.GroupSetup.prototype, {
            members: v
                .unknown()
                .assert(isIterable)
                .map((iterable) =>
                    Array.from(iterable).map((identityBytes) => {
                        if (!(identityBytes instanceof Uint8Array)) {
                            throw new Error(`Members array value is not an Uint8Array`);
                        }
                        return ensureIdentityString(UTF8.decode(identityBytes));
                    }),
                ),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.GroupSetup} */
export type Type = v.Infer<typeof SCHEMA>;
