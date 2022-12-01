import {PakoCompressor} from '~/common/compressor/pako';

import {compressorTests} from './compressor-tests';

export function run(): void {
    describe('PakoCompressor', function () {
        const compressor = new PakoCompressor();
        compressorTests.call(this, compressor);
    });
}
