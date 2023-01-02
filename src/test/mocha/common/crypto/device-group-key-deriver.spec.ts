import {expect} from 'chai';

import {
    type EncryptedData,
    type Nonce,
    type NonceGuard,
    type PlainData,
    ensurePublicKey,
    NACL_CONSTANTS,
    NONCE_UNGUARDED_TOKEN,
    wrapRawKey,
} from '~/common/crypto';
import {type CryptoBox, CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {type DeviceGroupBoxes, deriveDeviceGroupKeys} from '~/common/crypto/device-group-keys';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {type D2xNonceGuard} from '~/common/network/types';
import {wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {type Bare} from '~/common/types';
import {hexToBytes} from '~/common/utils/byte';
import {
    type DeviceGroupKeyDerivationTestVector,
    testVectors,
} from '~/test/mocha/common/data/device-group-key-derivation-test-vectors';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

type TestVectorCiphertexts = {
    readonly [K in keyof DeviceGroupKeyDerivationTestVector['derived']]: EncryptedData;
};

/**
 * {@link DeviceGroupKeyDeriver} tests.
 */
export function run(): void {
    const crypto = new TweetNaClBackend(pseudoRandomBytes);
    const publicKey = ensurePublicKey(new Uint8Array(32));
    const plaintext = Uint8Array.from([0x01, 0x02, 0x03, 0x04]) as PlainData;
    const nonce = new Uint8Array(24) as Nonce;
    const noopNonceGuard = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        use: (): void => {},
    } as NonceGuard as D2xNonceGuard;

    describe('deriveDeviceGroupKeys', function () {
        // Note: We cannot compare the actual keys because the API conceals them immediately. That's
        //       intentional and any way to work around that for the sake of testing would
        //       circumvent this protection. However, we can test whether they encrypt into the same
        //       ciphertext.

        function encryptTestData(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            box: CryptoBox<never, never, never, never, any>,
        ): EncryptedData {
            return box.encryptor(CREATE_BUFFER_TOKEN, plaintext).encryptWithNonce(nonce);
        }

        function encryptTestDataForAllKeys(
            keys: DeviceGroupKeyDerivationTestVector['derived'],
        ): TestVectorCiphertexts {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function createSecretBox(key: string): CryptoBox<never, never, never, never, any> {
                return crypto.getSecretBox(
                    wrapRawKey(hexToBytes(key), NACL_CONSTANTS.KEY_LENGTH).asReadonly(),
                    NONCE_UNGUARDED_TOKEN,
                );
            }
            return {
                dgpk: encryptTestData(
                    crypto.getSharedBox(
                        publicKey,
                        wrapRawKey(hexToBytes(keys.dgpk), NACL_CONSTANTS.KEY_LENGTH).asReadonly(),
                        NONCE_UNGUARDED_TOKEN,
                    ),
                ),
                dgrk: encryptTestData(createSecretBox(keys.dgrk)),
                dgdik: encryptTestData(createSecretBox(keys.dgdik)),
                dgsddk: encryptTestData(createSecretBox(keys.dgsddk)),
                dgtsk: encryptTestData(createSecretBox(keys.dgtsk)),
            };
        }

        function encryptTestDataForAllBoxes(boxes: Bare<DeviceGroupBoxes>): TestVectorCiphertexts {
            return {
                dgpk: encryptTestData(boxes.dgpk.getSharedBox(publicKey, noopNonceGuard)),
                dgrk: encryptTestData(boxes.dgrk),
                dgdik: encryptTestData(boxes.dgdik),
                dgsddk: encryptTestData(boxes.dgsddk),
                dgtsk: encryptTestData(boxes.dgtsk),
            };
        }

        it('should derive the correct device group keys', function () {
            const expectedCiphertexts = testVectors.map(({dgk, derived: keys}) => ({
                dgk,
                data: encryptTestDataForAllKeys(keys),
            }));
            const actualCiphertexts = testVectors.map(({dgk}) => {
                const boxes = deriveDeviceGroupKeys(
                    crypto,
                    wrapRawDeviceGroupKey(hexToBytes(dgk)),
                    noopNonceGuard,
                );
                return {dgk, data: encryptTestDataForAllBoxes(boxes)};
            });
            expect(actualCiphertexts).to.eql(expectedCiphertexts);
        });
    });
}
