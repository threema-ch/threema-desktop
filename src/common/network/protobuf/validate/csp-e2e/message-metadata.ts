import * as v from '@badrap/valita';

import {csp_e2e} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {MESSAGE_ID_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {nullOptional, unsignedLongAsU64} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    csp_e2e.MessageMetadata,
    v
        .object({
            padding: v.unknown(), // We don't care about the padding
            nickname: nullOptional(v.string()),
            messageId: MESSAGE_ID_SCHEMA,
            createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
