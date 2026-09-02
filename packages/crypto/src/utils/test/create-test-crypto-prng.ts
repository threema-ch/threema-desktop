import type {CryptoPrng} from '../../backend.js';

/**
 * A deterministic "CSPRNG", so that tests are reproducible.
 */
export function createTestCryptoPrng(): CryptoPrng {
    let counter = 0;
    return <T extends ArrayBufferView>(buffer: T): T => {
        const array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        for (let index = 0; index < array.byteLength; ++index) {
            counter = (counter + 0x3b) % 0x100;
            array[index] = counter;
        }
        return buffer;
    };
}
