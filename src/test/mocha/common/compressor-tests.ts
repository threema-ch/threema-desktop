import {expect} from 'chai';

import {type CompressionMethod, type Compressor} from '~/common/compressor';

import {expectRejectedWith} from './utils';

/**
 * Return compression tests that are backend-agnostic.
 */
export function compressorTests(this: Mocha.Suite, compressor: Compressor): void {
    const methods: CompressionMethod[] = ['gzip'];
    for (const method of methods) {
        it(`Roundtrip (${method})`, async function () {
            const data = Buffer.from('helloooooo world'.repeat(50), 'utf8');
            const compressed = await compressor.compress(method, data);
            expect(compressed.byteLength).to.be.lessThan(data.byteLength);
            const decompressed = await compressor.decompress(method, compressed);
            expect(decompressed).to.byteEqual(data);
        });

        it(`Decompressing uncompressed data throws an error (${method})`, async function () {
            const uncompressed = Buffer.from('helloooooo world', 'utf8');
            await expectRejectedWith(
                compressor.decompress(method, uncompressed),
                'compressor.decompress should have thrown exception',
                Error,
            );
        });
    }
}
