import * as v from '@badrap/valita';

import {parseLocation} from '~/common/network/protocol/task/common/location';
import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {UTF8} from '~/common/utils/codec';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link csp.e2e.Location} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.Location.prototype, {
            location: instanceOf<Uint8Array>(Uint8Array)
                .map((value) => UTF8.decode(value))
                .map(parseLocation),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.Location} */
export type Type = v.Infer<typeof SCHEMA>;
