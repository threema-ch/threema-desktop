import {expect} from 'chai';

import {CounterIv} from '~/common/node/file-storage/file-crypto';

/**
 * File storage crypto tests.
 */
export function run(): void {
    describe('file crypto', function () {
        describe('CounterIv', function () {
            it('counts up correctly', function () {
                const civ = new CounterIv();
                expect(civ.next(), '0').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
                );
                expect(civ.next(), '1').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),
                );
                expect(civ.next(), '2').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2),
                );
                expect(civ.next(), '3').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3),
                );
                for (let i = 0; i < 251; i++) {
                    civ.next(); // Advance until 254
                }
                expect(civ.next(), '255').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255),
                );
                expect(civ.next(), '256').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
                );
                expect(civ.next(), '257').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1),
                );
                for (let i = 0; i < 2 ** 16 - 257 - 2; i++) {
                    civ.next(); // Advance until 2**16 - 1
                }
                expect(civ.next(), '2**16 - 1').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255),
                );
                expect(civ.next(), '2**16').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0),
                );
            });

            it('limits counter to 32 bits', function () {
                const civ = new CounterIv();
                expect(civ.next(), '0').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
                );

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (civ as any)._counter = 2 ** 32 - 1;

                expect(civ.next(), '4294967295').to.deep.equal(
                    Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255),
                );
                expect(() => civ.next(), '4294967296').to.throw('Max counter reached');
            });
        });
    });
}
