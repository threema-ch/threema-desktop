import * as v from '@badrap/valita';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {Settings} from '~/common/network/protobuf/validate/sync';

const UPDATE_SCHEMA = validator(
    d2d.SettingsSync.Update,
    v
        .object({
            settings: Settings.SCHEMA,
        })
        .rest(v.unknown()),
);

export const SCHEMA = validator(
    d2d.SettingsSync,
    v
        .object({
            action: v.literal('update'),
            update: UPDATE_SCHEMA,
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
