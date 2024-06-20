import * as v from '@badrap/valita';

import {wrapRawGroupCallKey} from '~/common/crypto/group-call';
import {csp_e2e} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {ensureBaseUrl} from '~/common/network/types';
import {ensureU53} from '~/common/types';
import {instanceOf} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    csp_e2e.GroupCallStart,
    v
        .object({
            protocolVersion: v.number().map(ensureU53),
            gck: instanceOf(Uint8Array).map(wrapRawGroupCallKey),
            sfuBaseUrl: v.string().map((url) => ({raw: url, parsed: ensureBaseUrl(url, 'https:')})),
        })
        .rest(v.unknown()),
);

export type Type = Readonly<v.Infer<typeof SCHEMA>>;
