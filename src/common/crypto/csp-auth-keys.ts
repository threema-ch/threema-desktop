import {type Config} from '~/common/config';
import {type PublicKey} from '~/common/crypto';
import {
    type ClientKey,
    type DirectoryChallengeResponseKey,
    type VouchKey,
} from '~/common/network/types/keys';

const PERSONAL = '3ma-csp';

/**
 * Derive the Vouch Key for authentication towards the chat server.
 */
export function deriveVouchKey(config: Config, ck: ClientKey): VouchKey {
    return ck.deriveSharedKey(config.CHAT_SERVER_KEY, {
        personal: PERSONAL,
        salt: 'v',
    });
}

/**
 * Derive the Response Key for authentication towards the directory server.
 */
export function deriveDirectoryChallengeResponseKey(
    ck: ClientKey,
    challengeRequestKey: PublicKey,
): DirectoryChallengeResponseKey {
    return ck.deriveSharedKey(challengeRequestKey, {
        personal: PERSONAL,
        salt: 'dir',
    });
}
