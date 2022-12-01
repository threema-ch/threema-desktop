import * as v from '@badrap/valita';

import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {UTF8} from '~/common/utils/codec';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link csp.e2e.GroupName} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.GroupName.prototype, {
            name: instanceOf<Uint8Array>(Uint8Array).map((value) => UTF8.decode(value)),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.GroupName} */
export type Type = v.Infer<typeof SCHEMA>;
