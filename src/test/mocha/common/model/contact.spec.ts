import {expect} from 'chai';

import {reflectContactSync} from '~/test/mocha/common/network/protocol/task/task-test-helpers';
import {expectRejectedWith} from '~/test/mocha/common/utils';

import {
    makeContactInit,
    makeTestServices,
    makeTestUser,
    registerTestUser,
    TestHandle,
    type TestServices,
} from '../backend-mocks';

export function run(): void {
    describe('ContactModelRepository', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');

        let services: TestServices;

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
            registerTestUser(services.directory, anotherUser);

            // Sanity check that there the current user has no contacts
            expect(services.model.contacts.getAll().get()).to.be.empty;
        });

        // Set up log for failed tests
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        describe('another user can be added', function () {
            it('from remote', async function () {
                const expectations = reflectContactSync(anotherUser, 'create');
                const handle = new TestHandle(services, expectations);
                await services.model.contacts.add.fromRemote(handle, makeContactInit(anotherUser));
                expect(services.model.contacts.getAll().get().size).to.eql(1);
                handle.finish();
            });

            // TODO(DESK-696): .fromLocal cannot yet be tested because 'taskManager.schedule' is
            // not yet mocked.

            it('from sync', function () {
                services.model.contacts.add.fromSync(makeContactInit(anotherUser));
                expect(services.model.contacts.getAll().get().size).to.eql(1);
            });
        });

        describe('the user themself cannot be added', function () {
            const expectedErrorMessage = 'The user cannot add themself as contact.';

            it('from remote', async function () {
                const handle = new TestHandle(services, []);
                await expectRejectedWith(
                    services.model.contacts.add.fromRemote(handle, makeContactInit(me)),
                    '.add.fromRemote(...) should have thrown exception',
                    Error,
                    expectedErrorMessage,
                );
                expect(services.model.contacts.getAll().get().size).to.eql(0);
                handle.finish();
            });

            it('from local', async function () {
                await expectRejectedWith(
                    services.model.contacts.add.fromLocal(makeContactInit(me)),
                    '.add.fromLocal(...) should have thrown exception',
                    Error,
                    expectedErrorMessage,
                );
                expect(services.model.contacts.getAll().get().size).to.eql(0);
            });

            it('from sync', function () {
                expect(function () {
                    services.model.contacts.add.fromSync(makeContactInit(me));
                }).throws(Error, expectedErrorMessage);
                expect(services.model.contacts.getAll().get().size).to.eql(0);
            });
        });
    });
}
