import {wrapRawKey} from '@threema/crypto';
import {TweetNaClBackend} from '@threema/crypto/tweetnacl';
import {NonceScope} from '@threema/protocol/enum';
import {bytesToHex} from '@threema/ts-utils/byte/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/byte/hex-to-bytes';
import {expect} from 'chai';

import {ensurePublicKey, NACL_CONSTANTS, type Nonce, type PlainData} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN, SecureSharedBoxFactory} from '~/common/crypto/box';
import {TestNonceService} from '~/test/mocha/common/backend-mocks';
import {type CryptoBoxTestCase, testCases} from '~/test/mocha/common/data/crypto-box-test-cases';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

const crypto = new TweetNaClBackend(pseudoRandomBytes);

/**
 * {@link SecureSharedBoxFactory} tests.
 */
export function run(): void {
    describe('SecureSharedBoxFactory', function () {
        it('should properly return shared boxes for public key encryption', function () {
            const actual = testCases.map((testCase): CryptoBoxTestCase => {
                const boxFactory = SecureSharedBoxFactory.consume(
                    crypto,
                    new TestNonceService(),
                    NonceScope.CSP,
                    wrapRawKey(hexToBytes(testCase.secretKey), NACL_CONSTANTS.KEY_LENGTH),
                    {debug: import.meta.env.DEBUG},
                );

                const nonce = hexToBytes(testCase.nonce) as Nonce;
                const plainData = hexToBytes(testCase.data.plain) as PlainData;

                return {
                    ...testCase,
                    data: {
                        ...testCase.data,
                        encryptedWithPublicKeyEncryption: bytesToHex(
                            boxFactory
                                .getSharedBox(ensurePublicKey(hexToBytes(testCase.publicKey)))
                                .encryptor(CREATE_BUFFER_TOKEN, plainData)
                                .encryptWithDangerousUnguardedNonce(nonce),
                        ),
                    },
                };
            });
            expect(actual).to.eql(testCases);
        });
    });
}
