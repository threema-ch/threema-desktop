import * as chai from 'chai';

import type {u53} from '~/common/types';
import {createExactPropertyValidator, OPTIONAL, REQUIRED} from '~/common/utils/property-validator';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

interface MockType {
    a: u53;
    b?: boolean;
}

const ensureExactMockType = createExactPropertyValidator<MockType>('MockType', {
    a: REQUIRED,
    b: OPTIONAL,
});

/**
 * Test of random utils.
 */
export function run(): void {
    describe('createExactPropertyValidator', function () {
        it('throws error if unexpected property is present', function () {
            expect(() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
                ensureExactMockType({unexpectedProperty: undefined} as any),
            ).to.throw(Error, /^Expected unknown/u);
            createExactPropertyValidator<{a: u53}>('MockType', {a: REQUIRED})({a: 1});
        });

        it('throws error if REQUIRED property is missing', function () {
            expect(() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
                ensureExactMockType({b: 1} as any),
            ).to.throw(Error, /^Expected required keys/u);
        });

        it('does not throw error if all REQUIRED properties are present', function () {
            expect(() => ensureExactMockType({a: 1})).not.to.throw();
        });

        it('does not throw error if all REQUIRED and OPTIONAL properties are present', function () {
            expect(() => ensureExactMockType({a: 1, b: false})).not.to.throw();
        });
    });
}
