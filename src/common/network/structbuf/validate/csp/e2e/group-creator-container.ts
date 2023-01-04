import * as v from '@badrap/valita';

import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {ensureGroupId} from '~/common/network/types';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link csp.e2e.GroupCreatorContainer} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.GroupCreatorContainer.prototype, {
            groupId: v.bigint().map(ensureGroupId),
            innerData: instanceOf<Uint8Array>(Uint8Array),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.GroupCreatorContainer} */
export type Type = v.Infer<typeof SCHEMA>;
