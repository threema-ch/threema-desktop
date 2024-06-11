import * as v from '@badrap/valita';

export const INITIAL_MESSAGE_SCHEME = v
    .object({
        appPath: v.string(),
        oldProfilePath: v.string().optional(),
    })
    .rest(v.unknown());

export type InitialMessage = v.Infer<typeof INITIAL_MESSAGE_SCHEME>;
