import {
    type CryptoBackend,
    type CryptoBox,
    NACL_CONSTANTS,
    type RawKey,
    type ReadonlyRawKey,
} from '~/common/crypto';
import {deriveKey} from '~/common/crypto/blake2b';
import {SecureSharedBoxFactory} from '~/common/crypto/box';
import {type INonceService} from '~/common/crypto/nonce';
import {NonceScope} from '~/common/enum';
import {CryptoError} from '~/common/error';
import {type RawDeviceGroupKey} from '~/common/network/types/keys';
import {type Bare, type WeakOpaque} from '~/common/types';

type SecretBoxWithRandomNonce = CryptoBox<never, never, never, never, NonceScope.D2D>;

/**
 * This type binds several characteristics of a key to its name (i.e. `dg*k`): The type, the box
 * type and the corresponding salt.
 */
interface DeviceGroupKeyMap {
    /**
     * Device Group Path Key
     */
    readonly dgpk: {
        key: WeakOpaque<RawKey<32>, {readonly DgpkKey: unique symbol}>;
        box: WeakOpaque<
            SecureSharedBoxFactory<SecretBoxWithRandomNonce>,
            {readonly DgpkBox: unique symbol}
        >;
        salt: 'p';
    };
    /**
     * Device Group Reflect Key
     */
    readonly dgrk: {
        key: WeakOpaque<ReadonlyRawKey<32>, {readonly DgrkKey: unique symbol}>;
        box: WeakOpaque<SecretBoxWithRandomNonce, {readonly DgrkBox: unique symbol}>;
        salt: 'r';
    };
    /**
     * Device Group Device Info Key
     */
    readonly dgdik: {
        key: WeakOpaque<ReadonlyRawKey<32>, {readonly DgdikKey: unique symbol}>;
        box: WeakOpaque<SecretBoxWithRandomNonce, {readonly DgdikBox: unique symbol}>;
        salt: 'di';
    };
    /**
     * Device Group Shared Device Data Key
     */
    readonly dgsddk: {
        key: WeakOpaque<ReadonlyRawKey<32>, {readonly DgsddkKey: unique symbol}>;
        box: WeakOpaque<SecretBoxWithRandomNonce, {readonly DgsddkBox: unique symbol}>;
        salt: 'sdd';
    };
    /**
     * Device Group Transaction Scope Key
     */
    readonly dgtsk: {
        key: WeakOpaque<ReadonlyRawKey<32>, {readonly DgtskKey: unique symbol}>;
        box: WeakOpaque<SecretBoxWithRandomNonce, {readonly DgtskBox: unique symbol}>;
        salt: 'ts';
    };
}

export type DeviceGroupBoxes = {
    readonly [K in keyof DeviceGroupKeyMap]: DeviceGroupKeyMap[K]['box'];
};

/**
 * Derive all device group keys into their respective boxes.
 *
 * In the context of a multi-device group, each Threema ID ({@link IdentityString} in the codebase)
 * gets assigned a second secret key (on top of the regular {@link ClientKey}) referred to as
 * **Device Group Key** or `dgk` for short. This `dgk` is randomly created when the group is
 * created. For security reasons, the `dgk` is not directly used for encryption. Instead, the `dgk`
 * is used to derive five other keys that are effectively used for encryption in different contexts,
 * hinted by their names:
 *
 * Used only for public key cryptography:
 *
 * - `dgpk` for **Device Group Path Key**
 *
 * Used only for secret key cryptography:
 *
 * - `dgrk` for **Device Group Reflect Key**
 * - `dgdik` for **Device Group Device Info Key**
 * - `dgsddk` for **Device Group Shared Device Data Key**
 * - `dgtsk` for **Device Group Transaction Scope Key**
 *
 * This function consistently derives these five keys from the `dgk` with their respective
 * derivation parameters using the {@link Blake2b} key derivation function (KDF). The keys are
 * immediately transformed into in a more secure form, e.g. {@link SecureSharedBoxFactory} for keys
 * intended for public key cryptography, or a corresponding {@link CryptoBox} for keys intended for
 * secret key cryptography.
 */
export function deriveDeviceGroupKeys(
    crypto: CryptoBackend,
    dgk: RawDeviceGroupKey,
    nonceService: INonceService,
): DeviceGroupBoxes {
    function deriveKeyWithSalt<
        TKeyName extends keyof DeviceGroupKeyMap,
        TKey extends DeviceGroupKeyMap[TKeyName]['key'],
        TSalt extends DeviceGroupKeyMap[TKeyName]['salt'],
    >(keyName: TKeyName, salt: TSalt): TKey {
        try {
            return deriveKey(NACL_CONSTANTS.KEY_LENGTH, dgk, {
                personal: '3ma-mdev',
                salt,
            }) as TKey;
        } catch (error) {
            throw new CryptoError(
                `Error while deriving device group key '${keyName}' with salt '${salt}': ${error}`,
                {
                    from: error,
                },
            );
        }
    }

    // Create all boxes
    const boxes: {
        readonly [K in keyof DeviceGroupBoxes]: Bare<DeviceGroupBoxes[K]>;
    } = {
        dgpk: SecureSharedBoxFactory.consume(
            crypto,
            nonceService,
            NonceScope.D2D,
            deriveKeyWithSalt('dgpk', 'p'),
        ),
        dgrk: crypto.getSecretBox(deriveKeyWithSalt('dgrk', 'r'), NonceScope.D2D, nonceService),
        dgdik: crypto.getSecretBox(deriveKeyWithSalt('dgdik', 'di'), NonceScope.D2D, nonceService),
        dgsddk: crypto.getSecretBox(
            deriveKeyWithSalt('dgsddk', 'sdd'),
            NonceScope.D2D,
            nonceService,
        ),
        dgtsk: crypto.getSecretBox(deriveKeyWithSalt('dgtsk', 'ts'), NonceScope.D2D, nonceService),
    };

    // Upcast to the tagged box types
    return boxes as DeviceGroupBoxes;
}
