import * as v from '@badrap/valita';

import {ensureBlobId} from '~/common/network/protocol/blob';
import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {ensureU53} from '~/common/types';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link csp.e2e.SetProfilePicture} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.SetProfilePicture.prototype, {
            pictureBlobId: instanceOf(Uint8Array).map(ensureBlobId),
            pictureSize: v.number().map(ensureU53),
            key: instanceOf(Uint8Array).map(wrapRawBlobKey),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.SetProfilePicture} */
export type Type = v.Infer<typeof SCHEMA>;
