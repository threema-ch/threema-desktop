import * as v from '@badrap/valita';

import {NACL_CONSTANTS} from '~/common/crypto';
import {ProtocolError} from '~/common/error';
import {d2m} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {instanceOf} from '~/common/utils/valita-helpers';

const CHALLENGE_LENGTH = 32;

export const SCHEMA = validator(
    d2m.ServerHello,
    v
        .object({
            version: v.number(),
            esk: instanceOf(Uint8Array).assert(
                (value) => value.byteLength === NACL_CONSTANTS.KEY_LENGTH,
                new ProtocolError('d2m', 'ServerHello.esk length invalid'),
            ),
            challenge: instanceOf(Uint8Array).assert(
                (value) => value.byteLength === CHALLENGE_LENGTH,
                new ProtocolError('d2m', 'ServerHello.challenge length invalid'),
            ),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
