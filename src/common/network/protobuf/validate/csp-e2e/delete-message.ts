import * as v from '@badrap/valita';

import {csp_e2e} from '~/common/network/protobuf';
import {validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';

/** Validates {@link csp_e2e.DeleteMessage} */

export const SCHEMA = validator(
    csp_e2e.DeleteMessage,
    v.object({
        messageId: MESSAGE_ID_SCHEMA,
    }),
);

/** Validated Scheme for {@link csp_e2e.DeleteMessage} */
export type Type = v.Infer<typeof SCHEMA>;
