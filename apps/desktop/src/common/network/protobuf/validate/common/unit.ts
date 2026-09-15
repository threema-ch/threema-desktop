import type * as v from '@badrap/valita';
import {UNIT_SCHEMA} from '@threema/protocol/protobuf/utils';

// Note: The schema lives in `@threema/protocol` next to the generated bindings it matches. It is
// re-exported here to keep the existing import sites working.
//
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports.
export {UNIT_SCHEMA as SCHEMA};

export type Type = v.Infer<typeof UNIT_SCHEMA>;
