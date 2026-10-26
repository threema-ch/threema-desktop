import * as v from '@badrap/valita';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {csp_e2e} from '~/common/network/protobuf';
import {validator} from '~/common/network/protobuf/utils';
import {Unit} from '~/common/network/protobuf/validate/common';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import * as WorkAvailabilityStatus from '~/common/network/protobuf/validate/sync/work-availability-status';
import {ensureIdentityString} from '~/common/network/types';
import {nullOptional, unsignedLongAsU64} from '~/common/utils/valita-helpers';

const BASE_SCHEMA = {
    requireWorkSync: NULL_OR_UNDEFINED_SCHEMA,
    apply: NULL_OR_UNDEFINED_SCHEMA,
};

const NO_ACTION_SCHEMA = v.object({action: NULL_OR_UNDEFINED_SCHEMA});

const SCHEMA_REQUIRE_WORK_SYNC = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('requireWorkSync'),
        requireWorkSync: Unit.SCHEMA,
    })
    .rest(v.unknown());

const SCHEMA_CONTACT_SYNC = v.object({
    action: v.literal('update'),
    update: v
        .object({
            identity: v.string().map(ensureIdentityString),
            // Per protocol, `availabilityStatus` is optional and has no default. An `undefined`
            // value means the contact's status should be left unchanged.
            availabilityStatus: nullOptional(WorkAvailabilityStatus.SCHEMA),
        })
        // For consistency we map availabilityStatus directly to workAvailabilityStatus
        .map(({availabilityStatus, ...rest}) => ({
            ...rest,
            workAvailabilityStatus: availabilityStatus,
        })),
});

const SCHEMA_DELTA = v
    .object({
        action: v.literal('contactSync'),
        appliedAt: unsignedLongAsU64().map(unixTimestampToDateMs),
        contactSync: v.union(SCHEMA_CONTACT_SYNC, NO_ACTION_SCHEMA),
    })
    .rest(v.unknown());

const SCHEMA_APPLY = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('apply'),
        apply: v.object({
            deltas: v.array(v.union(SCHEMA_DELTA, NO_ACTION_SCHEMA)),
        }),
    })
    .rest(v.unknown());

/** Validates {@link csp_e2e.WORK_SYNC_DELTA}  */
export const SCHEMA = validator(
    csp_e2e.WorkSyncDelta,
    v.union(SCHEMA_REQUIRE_WORK_SYNC, SCHEMA_APPLY),
);

export type Type = v.Infer<typeof SCHEMA>;

export type DeltaType = v.Infer<typeof SCHEMA_DELTA> | v.Infer<typeof NO_ACTION_SCHEMA>;
