import {CONFIG} from '~/common/config';

describe('Config', function () {
    it('Mediator Server URL to be set', function () {
        expect(CONFIG.MEDIATOR_SERVER_URL).to.be.a('string');
        expect(CONFIG.MEDIATOR_SERVER_URL).to.be(import.meta.env.MEDIATOR_SERVER_URL);
    });
});
