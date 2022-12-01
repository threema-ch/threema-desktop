import {ZlibCompressor} from '~/common/node/compressor';

import {compressorTests} from '../compressor-tests';

export function run(): void {
    describe('ZlibCompressor', function () {
        const compressor = new ZlibCompressor();
        compressorTests.call(this, compressor);
    });
}
