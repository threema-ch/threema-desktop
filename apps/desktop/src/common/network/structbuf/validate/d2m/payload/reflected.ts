import * as v from '@badrap/valita';
import * as d2m from '@threema/protocol/structbuf/md-d2m';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {validator} from '~/common/network/structbuf/validate/utils';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link d2m.payload.Reflected} */
export const SCHEMA = v
    .object(
        validator(d2m.payload.Reflected.prototype, {
            headerLength: v.number(),
            reserved: v.number(),
            flags: v.number(),
            reflectedId: v.number(),
            timestamp: v.bigint().map(unixTimestampToDateMs),
            envelope: instanceOf<Uint8Array>(Uint8Array),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.Text} */
export type Type = v.Infer<typeof SCHEMA>;
