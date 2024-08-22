import {expect} from 'chai';

import {StatusMessageType} from '~/common/enum';
import type {Contact, Conversation} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import {statusMessageUidToStatusMessageId} from '~/common/network/types';
import {
    addTestGroup,
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

export function run(): void {
    describe('status message model', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');

        let services: TestServices;
        let contact: ModelStore<Contact>;
        let conversation: ModelStore<Conversation>;

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
            contact = addTestUserAsContact(services.model, anotherUser);
            conversation = contact.get().controller.conversation();
            addTestGroup(services.model, {
                creator: 'me',
                members: [contact],
                createdAt: new Date(),
            });
        });

        // Set up log for failed tests
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        describe('group name change', function () {
            it('adds a status message', function () {
                conversation.get().controller.createStatusMessage({
                    createdAt: new Date(),
                    type: StatusMessageType.GROUP_NAME_CHANGED,
                    value: {
                        oldName: 'Hoi',
                        newName: 'Ciao',
                    },
                });

                const statusMessages = conversation.get().controller.getAllStatusMessages();
                expect(statusMessages.get().size).to.eq(1);
                expect([...statusMessages.get()].at(0)?.type).to.eq(
                    StatusMessageType.GROUP_NAME_CHANGED,
                );
                expect([...statusMessages.get()].at(0)?.get().view.value).to.deep.eq({
                    oldName: 'Hoi',
                    newName: 'Ciao',
                });
            });

            it('deletes a status message', async function () {
                const uid1 = conversation
                    .get()
                    .controller.createStatusMessage({
                        createdAt: new Date(),
                        type: StatusMessageType.GROUP_NAME_CHANGED,
                        value: {
                            oldName: 'Hoi',
                            newName: 'Ciao',
                        },
                    })
                    .get().controller.uid;

                const uid2 = conversation
                    .get()
                    .controller.createStatusMessage({
                        createdAt: new Date(),
                        type: StatusMessageType.GROUP_NAME_CHANGED,
                        value: {
                            oldName: 'Hoi',
                            newName: 'Ciao-zeme',
                        },
                    })
                    .get().controller.uid;

                expect(conversation.get().controller.getAllStatusMessages().get().size).to.eq(2);
                await conversation
                    .get()
                    .controller.removeStatusMessage.fromLocal(
                        statusMessageUidToStatusMessageId(uid1),
                    );

                const statusMessages = conversation.get().controller.getAllStatusMessages();

                expect(statusMessages.get().size).to.eq(1);
                expect([...statusMessages.get()].at(0)?.type).to.eq(
                    StatusMessageType.GROUP_NAME_CHANGED,
                );
                expect([...statusMessages.get()].at(0)?.get().view.value).to.deep.eq({
                    oldName: 'Hoi',
                    newName: 'Ciao-zeme',
                });
                expect([...statusMessages.get()].at(0)?.get().controller.uid).to.eq(uid2);

                conversation
                    .get()
                    .controller.createStatusMessage({
                        createdAt: new Date(),
                        type: StatusMessageType.GROUP_NAME_CHANGED,
                        value: {
                            oldName: 'Hoi',
                            newName: 'Ciao-zeme',
                        },
                    })
                    .get().controller.uid;

                expect(conversation.get().controller.getAllStatusMessages().get().size).to.eq(2);
                await conversation.get().controller.removeAllStatusMessages.fromLocal();
                expect(conversation.get().controller.getAllStatusMessages().get().size).to.eq(0);
            });
        });
    });
}
