import * as v from '@badrap/valita';

import {csp_e2e} from '~/common/network/protobuf';
import {validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';

/** Validates {@link csp_e2e.EditMessage} */

export const SCHEMA = validator(
    csp_e2e.EditMessage,
    v
        .object({
            messageId: MESSAGE_ID_SCHEMA,
            text: v.string(),
        })
        .rest(v.unknown()),
);

/** Validated Scheme for {@link csp_e2e.EditMessage} */
export type Type = v.Infer<typeof SCHEMA>;
