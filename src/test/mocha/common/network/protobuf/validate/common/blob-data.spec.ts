import {expect} from 'chai';

import {BlobData} from '~/common/network/protobuf/validate/common';
import {ensureBlobId} from '~/common/network/protocol/blob';
import {type ReadonlyUint8Array} from '~/common/types';
import {TestTweetNaClBackend} from '~/test/mocha/common/backend-mocks';

/**
 * Blob validation tests.
 */
export function run(): void {
    describe('validate common.BlobData', function () {
        const crypto = new TestTweetNaClBackend();

        describe('serialize', function () {
            it('correctly serialize blob data', function () {
                const blobId = ensureBlobId(crypto.randomBytes(new Uint8Array(16)));
                const data = crypto.randomBytes(new Uint8Array(32)) as ReadonlyUint8Array;

                const serialized = BlobData.serialize({id: blobId, data});

                expect(serialized.id).to.deep.equal(blobId);
                expect(serialized.data).to.deep.equal(data);
            });
        });
    });
}
