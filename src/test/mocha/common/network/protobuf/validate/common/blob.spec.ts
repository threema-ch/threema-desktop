import {expect} from 'chai';

import {ensureNonce, NACL_CONSTANTS} from '~/common/crypto';
import {Blob} from '~/common/network/protobuf/validate/common';
import {ensureBlobId} from '~/common/network/protocol/blob';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {dateToUnixTimestampMs, intoU64} from '~/common/utils/number';
import {TestTweetNaClBackend} from '~/test/mocha/common/backend-mocks';

/**
 * Blob validation tests.
 */
export function run(): void {
    describe('validate common.Blob', function () {
        const crypto = new TestTweetNaClBackend();
        describe('serialize', function () {
            it('only the id is required', function () {
                const blobId = ensureBlobId(crypto.randomBytes(new Uint8Array(16)));
                const serialized = Blob.serialize({id: blobId});
                expect(serialized.id).to.deep.equal(blobId);
                expect(serialized.nonce).to.be.undefined;
                expect(serialized.key).to.be.undefined;
                expect(serialized.uploadedAt).to.be.undefined;
            });

            it('all keys can be specified', function () {
                const blobId = ensureBlobId(crypto.randomBytes(new Uint8Array(16)));
                const nonce = ensureNonce(
                    crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
                );
                const key = wrapRawBlobKey(
                    crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                );
                const uploadedAt = new Date();
                const serialized = Blob.serialize({
                    id: blobId,
                    nonce,
                    key,
                    uploadedAt,
                });
                expect(serialized.id).to.deep.equal(blobId);
                expect(serialized.nonce).to.deep.equal(nonce);
                expect(serialized.key).to.deep.equal(key.unwrap());
                expect(intoU64(serialized.uploadedAt)).to.equal(dateToUnixTimestampMs(uploadedAt));
            });
        });
    });
}
