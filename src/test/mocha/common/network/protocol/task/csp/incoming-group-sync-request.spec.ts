import {expect} from 'chai';

import {type ServicesForBackend} from '~/common/backend';
import {GroupUserState, GroupUserStateUtils} from '~/common/enum';
import {type Contact, type ContactInit} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {IncomingGroupSyncRequestTask} from '~/common/network/protocol/task/csp/incoming-group-sync-request';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {type GroupCreatorContainer} from '~/common/network/structbuf/validate/csp/e2e';
import {
    type GroupId,
    type IdentityString,
    type PublicNickname,
    ensureIdentityString,
} from '~/common/network/types';
import {Identity} from '~/common/utils/identity';
import {
    type NetworkExpectation,
    type TestServices,
    addTestGroup,
    addTestUserAsContact,
    makeContactInit,
    makeKeypair,
    makeTestServices,
    TestHandle,
} from '~/test/mocha/common/backend-mocks';
import {
    reflectAndSendGroupNameToUser,
    reflectAndSendGroupProfilePictureToUser,
    reflectAndSendGroupSetupToUser,
    reflectContactSync,
} from '~/test/mocha/common/network/protocol/task/task-test-helpers';

/**
 * Test incoming group sync request task.
 */
export function run(): void {
    describe('IncomingGroupSyncRequestTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as PublicNickname,
            keypair: makeKeypair(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as PublicNickname,
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

        it('if we are not the creator, request should be ignored', async function () {
            const sender = user1;
            const creator = user2;
            const groupId = randomGroupId(services.crypto);
            await runTask(services, groupId, creator.identity.string, makeContactInit(sender), []);
        });

        it('if group cannot be found, request should be ignored', async function () {
            const sender = user1;
            const groupId = randomGroupId(services.crypto);
            await runTask(services, groupId, me, makeContactInit(sender), []);
        });

        ([GroupUserState.LEFT, GroupUserState.KICKED] as const).forEach((userState) => {
            it(`if group is marked as ${GroupUserStateUtils.nameOf(
                userState,
            )}, an empty group-setup should be sent`, async function () {
                const {crypto, model} = services;

                // Add sender as contact
                const sender = user1;
                const member = user2;
                const senderContact = addTestUserAsContact(model, sender);
                const memberContact = addTestUserAsContact(model, member);

                // Create group
                const groupId = randomGroupId(crypto);
                addTestGroup(model, {
                    groupId,
                    creatorIdentity: me,
                    userState,
                    members: [senderContact.ctx, memberContact.ctx],
                });

                // Run task
                await runTask(services, groupId, me, senderContact, [
                    // An empty group setup must be reflected and sent
                    ...reflectAndSendGroupSetupToUser(services, sender, []),
                ]);
            });
        });

        [true, false].forEach((userKnown) => {
            it(`if ${
                userKnown ? 'a known' : 'an unknown'
            } user is not a member of the group, an empty group-setup should be sent`, async function () {
                const {crypto, model} = services;

                // Add contacts
                const sender = user1;
                const member = user2;
                let senderContactOrInit;
                if (userKnown) {
                    senderContactOrInit = addTestUserAsContact(model, sender);
                } else {
                    senderContactOrInit = makeContactInit(sender);
                }
                const memberContact = addTestUserAsContact(model, member);

                // Create group without user as member
                const groupId = randomGroupId(crypto);
                addTestGroup(model, {
                    groupId,
                    creatorIdentity: me,
                    members: [memberContact.ctx],
                });

                // Determine network expectations
                const expectations = [];
                // For unknown users, the user is first added and reflected
                if (!userKnown) {
                    expectations.push(...reflectContactSync(sender));
                }
                // Then an empty group setup must be reflected and sent
                expectations.push(...reflectAndSendGroupSetupToUser(services, sender, []));

                // Run task
                await runTask(services, groupId, me, senderContactOrInit, expectations);

                // Contact should now exist
                expect(
                    model.contacts.getByIdentity(sender.identity.string),
                    'Sender contact not found',
                ).not.to.be.undefined;
            });
        });

        [true, false].forEach((profilePicture) => {
            it(`if user is a member of the group ${
                profilePicture ? 'with' : 'without'
            } profile picture, group setup/name/${
                profilePicture ? 'set-' : 'delete-'
            }profile-picture should be sent`, async function () {
                const {crypto, model} = services;

                // Add sender as contact
                const sender = user1;
                const member = user2;
                const senderContact = addTestUserAsContact(model, sender);
                const memberContact = addTestUserAsContact(model, member);

                // Create group without user as member
                const groupId = randomGroupId(crypto);
                const groupName = 'Masters of disaster';
                const group = addTestGroup(model, {
                    groupId,
                    name: groupName,
                    creatorIdentity: me,
                    members: [senderContact.ctx, memberContact.ctx],
                });

                // Potentially add a profile picture to the group
                if (profilePicture) {
                    group
                        .get()
                        .controller.profilePicture.get()
                        .controller.setPicture.fromSync(
                            services.crypto.randomBytes(new Uint8Array(23)),
                            'admin-defined',
                        );
                }

                // Run task
                await runTask(services, groupId, me, senderContact, [
                    // The current group setup must be reflected and sent
                    ...reflectAndSendGroupSetupToUser(services, sender, [
                        sender.identity.string,
                        member.identity.string,
                    ]),

                    // The group name must be reflected and sent
                    ...reflectAndSendGroupNameToUser(services, sender, groupName),

                    // The group profile picture must be reflected and sent
                    ...reflectAndSendGroupProfilePictureToUser(services, sender, profilePicture),
                ]);
            });
        });
    });
}

async function runTask(
    services: ServicesForBackend,
    groupId: GroupId,
    creatorIdentity: IdentityString,
    senderContactOrInit: LocalModelStore<Contact> | ContactInit,
    expectations: NetworkExpectation[],
): Promise<void> {
    const container: GroupCreatorContainer.Type = {
        groupId,
        innerData: new Uint8Array(0),
    };
    const messageId = randomMessageId(services.crypto);

    // Run task
    const task = new IncomingGroupSyncRequestTask(
        services,
        messageId,
        senderContactOrInit,
        container,
    );
    const handle = new TestHandle(services, expectations);
    await task.run(handle);
    handle.finish();
}
