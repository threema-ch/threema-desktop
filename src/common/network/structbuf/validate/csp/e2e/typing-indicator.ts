import * as v from '@badrap/valita';

import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';

/** Validates {@link csp.e2e.TypingIndicator} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.TypingIndicator.prototype, {
            isTyping: v
                .number()
                .assert<0 | 1>((value) => value === 0 || value === 1)
                .map((value) => value !== 0),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.TypingIndicator} */
export type Type = v.Infer<typeof SCHEMA>;
