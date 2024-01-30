import {expect} from 'chai';

import {ReflectedGroupNameTask} from '~/common/network/protocol/task/d2d/reflected-group-name';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {ensureIdentityString, type Nickname} from '~/common/network/types';
import {Identity} from '~/common/utils/identity';
import {
    addTestGroup,
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

/**
 * Test reflected group name task.
 */
export function run(): void {
    describe('ReflectedGroupNameTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as Nickname,
            ck: createClientKey(),
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

        it('incoming: group name is updated', async function () {
            const {crypto, model} = services;

            // Add creator contact
            const creator = user1;
            const creatorUid = addTestUserAsContact(model, creator).ctx;

            // Add group, we are not the creator
            const groupId = randomGroupId(crypto);
            const group = addTestGroup(model, {
                groupId,
                creatorIdentity: user1.identity.string,
                name: 'AAA',
                members: [creatorUid],
            });

            // Ensure that group name is AAA
            expect(model.groups.getByUid(group.ctx)?.get().view.name).to.equal('AAA');

            // Prepare payload
            const container = {
                groupId,
                creatorIdentity: creator.identity.string,
                innerData: new Uint8Array(0),
            };
            const name = {
                name: 'BBB',
            };

            // Run task, no network side effects expected
            const task = new ReflectedGroupNameTask(
                services,
                randomMessageId(crypto),
                creator.identity.string,
                container,
                name,
            );
            const handle = new TestHandle(services, []);
            await task.run(handle);
            handle.finish();

            // Ensure that group name was updated
            expect(model.groups.getByUid(group.ctx)?.get().view.name).to.equal('BBB');
        });

        it('outgoing: group name is updated', async function () {
            const {crypto, model} = services;

            // Add member contact
            const user1Uid = addTestUserAsContact(model, user1).ctx;

            // Add group, we're the creator
            const groupId = randomGroupId(crypto);
            const group = addTestGroup(model, {
                groupId,
                creatorIdentity: me,
                name: 'AAA',
                members: [user1Uid],
            });

            // Ensure that group name is AAA
            expect(model.groups.getByUid(group.ctx)?.get().view.name).to.equal('AAA');

            // Prepare payload
            const container = {
                groupId,
                creatorIdentity: me,
                innerData: new Uint8Array(0),
            };
            const name = {
                name: 'BBB',
            };

            // Run task, no network side effects expected
            const task = new ReflectedGroupNameTask(
                services,
                randomMessageId(crypto),
                me,
                container,
                name,
            );
            const handle = new TestHandle(services, []);
            await task.run(handle);
            handle.finish();

            // Ensure that group name was updated
            expect(model.groups.getByUid(group.ctx)?.get().view.name).to.equal('BBB');
        });
    });
}
