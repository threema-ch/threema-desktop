import {expect} from 'chai';

import {TransactionScope} from '~/common/enum';
import {IncomingGroupNameTask} from '~/common/network/protocol/task/csp/incoming-group-name';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {ensureIdentityString} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    type TestServices,
    addTestGroup,
    addTestUserAsContact,
    makeKeypair,
    makeTestServices,
    NetworkExpectationFactory,
    TestHandle,
} from '~/test/mocha/common/backend-mocks';

/**
 * Test incoming group name task.
 */
export function run(): void {
    describe('IncomingGroupNameTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1',
            keypair: makeKeypair(),
        };

        // Set up services and log printing
        let services: TestServices;
        this.beforeEach(function () {
            services = makeTestServices(me);
        });
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        it('group name is updated', async function () {
            const {crypto, model} = services;

            // Add creator contact
            const creator = user1;
            const creatorContact = addTestUserAsContact(model, creator);

            // Add group
            const groupId = randomGroupId(crypto);
            const group = addTestGroup(model, {
                groupId,
                creatorIdentity: user1.identity.string,
                name: 'AAA',
                members: [creatorContact.ctx],
            });

            // Ensure that group name is AAA
            expect(model.groups.getByUid(group.ctx)?.get()?.view.name).to.equal('AAA');

            // Prepare payload
            const container = {
                groupId,
                creatorIdentity: creator.identity.string,
                innerData: new Uint8Array(0),
            };
            const name = {
                name: 'BBB',
            };

            // Run task
            const task = new IncomingGroupNameTask(
                services,
                randomMessageId(crypto),
                creatorContact,
                container,
                name,
            );
            await task.run(
                new TestHandle(services, [
                    // Start group sync transaction
                    NetworkExpectationFactory.startTransaction(0, TransactionScope.GROUP_SYNC),
                    // Reflect group sync
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('groupSync');
                        const msg = payload.groupSync;
                        assert(
                            msg !== null && msg !== undefined,
                            'payload.groupSync is null or undefined',
                        );
                        assert(
                            msg.update !== null && msg.update !== undefined,
                            `Group sync does not contain an update`,
                        );
                        // Only name should be synced, not members or state
                        expect(msg.update.group?.name).to.equal(name.name);
                        expect(msg.update.group?.memberIdentities).to.be.undefined;
                        expect(msg.update.group?.userState).to.be.undefined;
                    }),
                ]),
            );

            // Ensure that group name was updated
            expect(model.groups.getByUid(group.ctx)?.get()?.view.name).to.equal('BBB');
        });
    });
}
