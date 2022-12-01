import {expect} from 'chai';

import {instanceOf, nullOptional, optionalInstanceOf} from '~/common/utils/valita-helpers';

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
        });

        describe('optionalInstanceOf', function () {
            it('should accept undefined as input', function () {
                const validator = optionalInstanceOf(Date);
                expect(validator.parse(undefined)).to.be.undefined;
            });

            it('should not accept null as input', function () {
                const validator = optionalInstanceOf(Date);
                expect(() => validator.parse(null)).to.throw(
                    'expected an optional instance of Date',
                );
            });

            it('should accept null as input when chained with nullOptional', function () {
                const validator = nullOptional(optionalInstanceOf(Date));
                expect(validator.parse(null), 'null').to.be.undefined;
                expect(validator.parse(undefined), 'undefined').to.be.undefined;
            });
        });
    });
}
