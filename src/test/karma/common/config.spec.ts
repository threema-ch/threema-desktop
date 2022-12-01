import {expect} from 'chai';

import {CONFIG} from '~/common/config';

/**
 * Config tests.
 */
export function run(): void {
    describe('Config', function () {
        it('Mediator Server URL to be set', function () {
            expect(CONFIG.MEDIATOR_SERVER_URL).to.be.a('string');
            expect(CONFIG.MEDIATOR_SERVER_URL).to.equal(import.meta.env.MEDIATOR_SERVER_URL);
        });
    });
}

run();
