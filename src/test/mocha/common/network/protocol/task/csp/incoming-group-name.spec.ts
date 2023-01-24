import {expect} from 'chai';

import {IncomingGroupNameTask} from '~/common/network/protocol/task/csp/incoming-group-name';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {ensureIdentityString} from '~/common/network/types';
import {Identity} from '~/common/utils/identity';
import {
    addTestGroup,
    addTestUserAsContact,
    makeKeypair,
    makeTestServices,
    TestHandle,
    type TestServices,
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
            await task.run(new TestHandle(services, []));

            // Ensure that group name was updated
            expect(model.groups.getByUid(group.ctx)?.get()?.view.name).to.equal('BBB');
        });
    });
}
