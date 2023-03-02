import {expect} from 'chai';

import * as protobuf from '~/common/network/protobuf';

export function run(): void {
    describe('protobuf encoder', function () {
        // Encoded `BlobData` with id=01020304, data=fefefe -> 11 bytes
        const expectedBlobData = Uint8Array.from([
            0x0a, 0x04, 0x01, 0x02, 0x03, 0x04, 0x12, 0x03, 0xfe, 0xfe, 0xfe,
        ]);
        const encoder = protobuf.utils.encoder(protobuf.common.BlobData, {
            id: Uint8Array.of(1, 2, 3, 4),
            data: Uint8Array.of(0xfe, 0xfe, 0xfe),
        });

        it('fails to encode if given array is too small', function () {
            expect(() => encoder.encode(new Uint8Array(10))).to.throw(
                'Underlying buffer too small',
            );
        });

        it('encodes into given array correctly', function () {
            const array = new Uint8Array(20);
            const encoded = encoder.encode(array);

            expect(encoded.buffer).to.equal(array.buffer);
            expect(encoded).to.eql(expectedBlobData);
            expect(array).to.eql(
                Uint8Array.from([
                    0x0a, 0x04, 0x01, 0x02, 0x03, 0x04, 0x12, 0x03, 0xfe, 0xfe, 0xfe, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                ]),
            );
            expect(encoder.byteLength()).to.equal(11);
        });

        it('copies into given array correctly when it was cached', function () {
            expect(encoder.byteLength()).to.equal(11);

            const array = new Uint8Array(20);
            const encoded = encoder.encode(array);

            expect(encoded.buffer).to.equal(array.buffer);
            expect(encoded).to.eql(expectedBlobData);
            expect(array).to.eql(
                Uint8Array.from([
                    0x0a, 0x04, 0x01, 0x02, 0x03, 0x04, 0x12, 0x03, 0xfe, 0xfe, 0xfe, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                ]),
            );
            expect(encoder.byteLength()).to.equal(11);
        });
    });
}
