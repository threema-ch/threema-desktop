import {expect} from 'chai';

import type {ServicesForBackend} from '~/common/backend';
import {GroupUserState} from '~/common/enum';
import {ReflectedOutgoingGroupLeaveTask} from '~/common/network/protocol/task/d2d/reflected-outgoing-group-leave';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import {
    ensureIdentityString,
    type GroupId,
    type IdentityString,
    type Nickname,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    addTestGroup,
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    type NetworkExpectation,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

/**
 * Test reflected incoming group leave task.
 */
export function run(): void {
    describe('ReflectedOutgoingGroupLeaveTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as Nickname,
            ck: createClientKey(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as Nickname,
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

        it('ignore outgoing message for unknown group', async () => {
            const {crypto, model} = services;

            // Add contact
            addTestUserAsContact(model, user1);

            // Run task
            const groupId = randomGroupId(crypto);
            await runTask(services, groupId, me, []);

            // Not much we can test here, except there's no exception :)
        });

        it("ignore outgoing message for group we're not part of", async () => {
            const {crypto, model} = services;

            // Add contact
            const user1Model = addTestUserAsContact(model, user1);
            const user2Model = addTestUserAsContact(model, user2);

            // Add group, created by user2
            const groupId = randomGroupId(crypto);
            const creator = user2.identity.string;
            addTestGroup(model, {
                groupId,
                creator: user2Model,
                name: 'Kulupu pi Toki Pona',
                userState: GroupUserState.KICKED,
                members: [user1Model, user2Model],
            });

            // Run task
            await runTask(services, groupId, creator, []);

            // Group state should still be KICKED, not LEFT (message should be discarded)
            const group = model.groups.getByGroupIdAndCreator(groupId, creator);
            assert(group !== undefined, 'Group not found');
            expect(group.get().view.userState).to.equal(GroupUserState.KICKED);
        });

        it("process message for a group we're part of", async () => {
            const {crypto, model} = services;

            // Add contact
            const user1Model = addTestUserAsContact(model, user1);
            const user2Model = addTestUserAsContact(model, user2);

            // Add group, created by user2
            const groupId = randomGroupId(crypto);
            const creator = user2.identity.string;
            addTestGroup(model, {
                groupId,
                creator: user2Model,
                name: 'Kulupu pi Toki Pona',
                userState: GroupUserState.MEMBER,
                members: [user1Model, user2Model],
            });

            // Run task
            await runTask(services, groupId, creator, []);

            // Ensure we left the group
            const group = model.groups.getByGroupIdAndCreator(groupId, creator);
            assert(group !== undefined, 'Group not found');
            expect(group.get().view.userState).to.equal(GroupUserState.LEFT);
        });

        it("if we're the creator of this group, dissolve group", async () => {
            const {crypto, device, model} = services;

            // Add contact
            const user1Model = addTestUserAsContact(model, user1);
            const user2Model = addTestUserAsContact(model, user2);

            // Add group, created by us
            const groupId = randomGroupId(crypto);
            const creator = me;
            addTestGroup(model, {
                groupId,
                creator: 'me',
                name: 'mi wile toki e toki pona',
                userState: GroupUserState.MEMBER,
                members: [user1Model, user2Model],
            });

            // Run task
            await runTask(services, groupId, creator, []);

            // Group should be marked as dissolved, with member list still intact
            const group = model.groups.getByGroupIdAndCreator(groupId, device.identity.string);
            assert(group !== undefined, 'Group not found');
            expect(group.get().view.userState, 'Wrong user state').to.equal(GroupUserState.LEFT);
            expect(
                [...group.get().view.members].map((member) => member.get().view.identity),
            ).to.have.members([user1.identity.string, user2.identity.string]);
        });
    });
}

/**
 * Run the reflected outgoing group leave task.
 *
 * The group member container will be created automatically.
 *
 * When running the test, the specified expectations will be verified.
 */
async function runTask(
    services: ServicesForBackend,
    groupId: GroupId,
    creatorIdentity: IdentityString,
    expectations: NetworkExpectation[],
    description?: string,
): Promise<void> {
    const container: GroupMemberContainer.Type = {
        groupId,
        creatorIdentity,
        innerData: new Uint8Array(0),
    };
    const messageId = randomMessageId(services.crypto);

    // Run task
    const task = new ReflectedOutgoingGroupLeaveTask(services, messageId, container, new Date());
    const handle = new TestHandle(services, expectations);
    await task.run(handle);
    let message = 'Not all expectations consumed';
    if (description !== undefined) {
        message += `: ${description}`;
    }
    expect(expectations, message).to.be.empty;
    handle.finish();
}
