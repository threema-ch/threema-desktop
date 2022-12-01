import * as v from '@badrap/valita';

import {ensureCspE2eType} from '~/common/network/protocol';

/** Validates {@link d2d.MessageType} */
export const SCHEMA = v.number().map(ensureCspE2eType);
export type Type = v.Infer<typeof SCHEMA>;
