import {expect} from 'chai';

import {createDefaultConfig} from '~/common/config';

/**
 * Config tests.
 */
export function run(): void {
    describe('Config', function () {
        it('Mediator Server URL to be set', function () {
            if (import.meta.env.BUILD_ENVIRONMENT !== 'onprem') {
                const config = createDefaultConfig();
                expect(config.MEDIATOR_SERVER_URL).to.be.a('string');
                expect(config.MEDIATOR_SERVER_URL).to.equal(import.meta.env.MEDIATOR_SERVER_URL);
            }
        });
    });
}

run();
