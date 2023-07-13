import * as sha256 from 'fast-sha256';

import {ensureNonceHash, type Nonce, type NonceHash} from '~/common/crypto';
import {type Identity} from '~/common/utils/identity';

/**
 * Hash a nonce before storing it.
 */
export function hashNonce(identity: Identity, nonce: Nonce): NonceHash {
    return ensureNonceHash(sha256.hmac(identity.bytes, nonce));
}
