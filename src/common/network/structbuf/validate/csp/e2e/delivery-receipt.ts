import * as v from '@badrap/valita';

import {CspE2eDeliveryReceiptStatusUtils} from '~/common/enum';
import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {ensureMessageId} from '~/common/network/types';
import {isIterable} from '~/common/utils/object';

/** Validates {@link csp.e2e.DeliveryReceipt} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.DeliveryReceipt.prototype, {
            status: v.number().map((value) => CspE2eDeliveryReceiptStatusUtils.fromNumber(value)),
            messageIds: v
                .unknown()
                .assert(isIterable)
                .map((value) => Array.from(value).map(ensureMessageId)),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.DeliveryReceipt} */
export type Type = v.Infer<typeof SCHEMA>;
