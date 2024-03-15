import * as v from '@badrap/valita';
import {expect} from 'chai';
import Long from 'long';

import {ensureU53} from '~/common/types';
import {
    chainAdapter,
    instanceOf,
    nullOptional,
    unsignedLongAsU64,
} from '~/common/utils/valita-helpers';

export function run(): void {
    describe('utils::valita-helpers', function () {
        describe('instanceOf', function () {
            it('should validate value of the correct type', function () {
                const arr = Uint8Array.of(1, 2, 3);
                expect(instanceOf(Uint8Array).parse(arr), 'Uint8Array').to.eql(arr);

                const date = new Date();
                expect(instanceOf(Date).parse(date), 'Date').to.eql(date);
            });

            it('should reject values of a different type', function () {
                const arr = Uint8Array.of(1, 2, 3);
                const date = new Date();

                expect(() => instanceOf(Uint8Array).parse(date)).to.throw(
                    'expected an instance of Uint8Array',
                );
                expect(() => instanceOf(Date).parse(arr)).to.throw('expected an instance of Date');
            });

            it('should reject null / undefined', function () {
                expect(() => instanceOf(Date).parse(null)).to.throw('expected an instance of Date');
                expect(() => instanceOf(Date).parse(undefined)).to.throw(
                    'expected an instance of Date',
                );
            });

            it('should allow undefined when chained with .optional()', function () {
                expect(() =>
                    v.object({value: instanceOf(Date).optional()}).parse({value: undefined}),
                ).not.to.throw();
            });
        });

        describe('unsignedLongAsU64', function () {
            it('should reject undefined as input', function () {
                const validator = unsignedLongAsU64();
                expect(() => validator.parse(undefined)).to.throw(
                    'Expected a Long value, but "Long.isLong" returns false for value "undefined" with type "undefined"',
                );
            });

            it('should reject null as input', function () {
                const validator = unsignedLongAsU64();
                expect(() => validator.parse(null)).to.throw(
                    'Expected a Long value, but "Long.isLong" returns false for value "null" with type "object"',
                );
            });

            it('should reject a regular number', function () {
                const validator = unsignedLongAsU64();
                expect(() => validator.parse(123)).to.throw(
                    'Expected a Long value, but "Long.isLong" returns false for value "123" with type "number"',
                );
            });

            it('should accept a Long and turn it into an u64', function () {
                const validator = unsignedLongAsU64();
                expect(validator.parse(Long.UZERO)).to.equal(0n);
                expect(validator.parse(Long.UONE)).to.equal(1n);
                expect(validator.parse(Long.fromString('7239847298347982734', true))).to.equal(
                    7239847298347982734n,
                );
            });

            it('should convert signed zero to unsigned zero', function () {
                const validator = unsignedLongAsU64();
                expect(validator.parse(Long.ZERO)).to.equal(0n);
            });
        });

        describe('nullOptional', function () {
            it('should accept undefined as input', function () {
                const validator = v.object({value: nullOptional(v.number())});
                expect(validator.parse({value: undefined})).to.deep.equal({value: undefined});
            });

            it('should map null to undefined', function () {
                const validator = v.object({value: nullOptional(v.number())});
                expect(validator.parse({value: null})).to.deep.equal({value: undefined});
            });

            it('should accept the correct value as input', function () {
                const validator = v.object({value: nullOptional(v.number())});
                expect(validator.parse({value: 123})).to.deep.equal({value: 123});
            });

            it('should reject an invalid value as input', function () {
                const validator = v.object({value: nullOptional(v.number())});
                expect(() => validator.parse({value: 'hi'})).to.throw(
                    'invalid_type at .value (expected number)',
                );
            });

            it('should be chainable with instanceOf(Uint8Array)', function () {
                const validator = v.object({value: nullOptional(instanceOf(Uint8Array))});
                expect(validator.parse({value: undefined})).to.deep.equal({value: undefined});
                expect(validator.parse({value: null})).to.deep.equal({value: undefined});
                const array = Uint8Array.of(1, 2, 3);
                expect(validator.parse({value: array})).to.deep.equal({value: array});
            });

            it('should be chainable with unsignedLongAsU64()', function () {
                const validator = v.object({value: nullOptional(unsignedLongAsU64())});
                expect(validator.parse({value: undefined})).to.deep.equal({value: undefined});
                expect(validator.parse({value: null})).to.deep.equal({value: undefined});
                expect(validator.parse({value: Long.UONE})).to.deep.equal({value: 1n});
            });
        });

        describe('chainAdapter', function () {
            const u53ValidatorChain = v.object({value: v.number().chain(chainAdapter(ensureU53))});

            it('makes it possible to use an ensureXxx function with chain', () => {
                expect(() => u53ValidatorChain.parse({value: -123})).to.throw(
                    'custom_error at .value (Type guard failed: Error: Value -123 is not a valid integer in the u53 range)',
                );
            });
        });
    });
}
