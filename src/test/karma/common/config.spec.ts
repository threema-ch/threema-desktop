import {expect} from 'chai';

import {STATIC_CONFIG} from '~/common/config';

/**
 * Config tests.
 */
export function run(): void {
    describe('Static config', function () {
        it('Key storage path to be available', function () {
            expect(STATIC_CONFIG.KEY_STORAGE_PATH).to.deep.equal(import.meta.env.KEY_STORAGE_PATH);
        });
    });
}

run();
