import {type Config} from '~/common/config';
import {type PublicKey, wrapRawKey} from '~/common/crypto';
import {deriveKey} from '~/common/crypto/blake2b';
import {
    type ClientKey,
    type DirectoryChallengeResponseKey,
    type TemporaryServerKey,
    type VouchKey,
} from '~/common/network/types/keys';
import {byteJoin} from '~/common/utils/byte';

const PERSONAL = '3ma-csp';

/**
 * Derive the Vouch Key for authentication towards the chat server.
 */
export function deriveVouchKey(config: Config, ck: ClientKey, tsk: TemporaryServerKey): VouchKey {
    const ss1 = ck.getSharedSecret(config.CHAT_SERVER_KEY);
    const ss2 = ck.getSharedSecret(tsk);
    const ss1AndSs2 = wrapRawKey(byteJoin(ss1.unwrap(), ss2.unwrap()), 64);
    ss1.purge();
    ss2.purge();
    const vouchKey = deriveKey(32, ss1AndSs2, {
        personal: PERSONAL,
        salt: 'v2',
    }) as VouchKey;
    ss1AndSs2.purge();
    return vouchKey;
}

/**
 * Derive the Response Key for authentication towards the directory server.
 */
export function deriveDirectoryChallengeResponseKey(
    ck: ClientKey,
    challengeRequestKey: PublicKey,
): DirectoryChallengeResponseKey {
    return ck.deriveSharedKey(32, challengeRequestKey, {
        personal: PERSONAL,
        salt: 'dir',
    });
}
