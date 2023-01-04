import * as v from '@badrap/valita';

import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {ensureGroupId, ensureIdentityString} from '~/common/network/types';
import {UTF8} from '~/common/utils/codec';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link csp.e2e.GroupMemberContainer} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.GroupMemberContainer.prototype, {
            creatorIdentity: instanceOf<Uint8Array>(Uint8Array)
                .map((value) => UTF8.decode(value))
                .map(ensureIdentityString),
            groupId: v.bigint().map(ensureGroupId),
            innerData: instanceOf<Uint8Array>(Uint8Array),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.GroupMemberContainer} */
export type Type = v.Infer<typeof SCHEMA>;
