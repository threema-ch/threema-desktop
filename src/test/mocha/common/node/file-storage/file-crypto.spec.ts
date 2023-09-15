import {expect} from 'chai';

import {ensureFileId} from '~/common/file-storage';
import {FileChunkNonce} from '~/common/node/file-storage/file-crypto';

/**
 * File storage crypto tests.
 */
export function run(): void {
    describe('file crypto', function () {
        describe('FileChunkNonce', function () {
            it('counts up correctly', function () {
                const fileId = ensureFileId('ffc428dfec8a46ff737957d0a0d487216379eea92a7231eb');
                const nonce = new FileChunkNonce(fileId);
                expect(nonce.next(false), '1').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 0, 1, 0, 0, 0, 0),
                );
                expect(nonce.next(false), '2').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 0, 2, 0, 0, 0, 0),
                );
                expect(nonce.next(false), '3').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 0, 3, 0, 0, 0, 0),
                );
                for (let i = 0; i < 251; i++) {
                    nonce.next(false); // Advance until 254
                }
                expect(nonce.next(false), '255').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 0, 255, 0, 0, 0, 0),
                );
                expect(nonce.next(false), '256').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 1, 0, 0, 0, 0, 0),
                );
                expect(nonce.next(false), '257').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 1, 1, 0, 0, 0, 0),
                );
                for (let i = 0; i < 2 ** 16 - 257 - 2; i++) {
                    nonce.next(false); // Advance until 2**16 - 1
                }
                expect(nonce.next(false), '2**16 - 1').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 0, 255, 255, 0, 0, 0, 0),
                );
                expect(nonce.next(false), '2**16').to.deep.equal(
                    Uint8Array.of(0x2a, 0x72, 0x31, 0xeb, 0, 1, 0, 0, 0, 0, 0, 0),
                );
            });

            it('limits counter to 32 bits', function () {
                const fileId = ensureFileId('5b351d810da8842ca0b806c443545cdd338326d094dc4a78');
                const nonce = new FileChunkNonce(fileId);
                expect(nonce.next(false), '1').to.deep.equal(
                    Uint8Array.of(0x94, 0xdc, 0x4a, 0x78, 0, 0, 0, 1, 0, 0, 0, 0),
                );

                // @ts-expect-error: Private property
                nonce._counter = 2 ** 32 - 1;

                expect(nonce.next(false), '4294967295').to.deep.equal(
                    Uint8Array.of(0x94, 0xdc, 0x4a, 0x78, 255, 255, 255, 255, 0, 0, 0, 0),
                );
                expect(() => nonce.next(false), '4294967296').to.throw('Max counter reached');
            });

            it('correctly handles lastChunk flag', function () {
                const fileId = ensureFileId('5e923764e4748462f30a6d71d5edf0e439515a246b4f3bd9');
                const nonce = new FileChunkNonce(fileId);

                // First two chunks where lastChunk is set to false
                expect(nonce.next(false), '1').to.deep.equal(
                    Uint8Array.of(0x6b, 0x4f, 0x3b, 0xd9, 0, 0, 0, 1, 0, 0, 0, 0),
                );
                expect(nonce.next(false), '2').to.deep.equal(
                    Uint8Array.of(0x6b, 0x4f, 0x3b, 0xd9, 0, 0, 0, 2, 0, 0, 0, 0),
                );

                // Now mark a chunk as the last chunk. The last bit should be set to 1.
                expect(nonce.next(true), '3').to.deep.equal(
                    Uint8Array.of(0x6b, 0x4f, 0x3b, 0xd9, 0, 0, 0, 3, 0, 0, 0, 1),
                );

                // Calling next() again - no matter what the value of `lastChunk` is - should result
                // in an exception
                expect(() => nonce.next(false), 'false').to.throw('last chunk was reached');
                expect(() => nonce.next(true), 'true').to.throw('last chunk was reached');
            });
        });
    });
}
