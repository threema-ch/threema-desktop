import {expect} from 'chai';

import type {DbReceiverLookup} from '~/common/db';
import {MessageDirection, ReceiverType} from '~/common/enum';
import type {Conversation} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import {
    ensureIdentityString,
    isMessageId,
    ensureNickname,
    isStatusMessageId,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import {
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';

export function run(): void {
    describe('lastMessage', function () {
        const me = ensureIdentityString('MEMEMEME');

        let services: TestServices;
        let user1: TestUser;

        let singleConversation: LocalModelStore<Conversation>;

        let viewModel: ConversationViewModelBundle | undefined;

        this.beforeEach(function () {
            // Create test services
            services = makeTestServices(me);

            user1 = {
                ...makeTestUser('EUGEN000', ensureNickname('eugen')),
                firstName: 'Eugen',
                lastName: 'Pfister',
            };

            // Create conversation with user1
            const user1Uid = addTestUserAsContact(services.model, user1).ctx;
            const user1Conversation = services.model.conversations.getForReceiver({
                type: ReceiverType.CONTACT,
                uid: user1Uid,
            });
            assert(user1Conversation !== undefined, 'Conversation for user1 not found');
            singleConversation = user1Conversation;

            assert(
                singleConversation.get().view.type === ReceiverType.CONTACT,
                'Unexpected conversation type',
            );
            const receiver: DbReceiverLookup = {
                type: ReceiverType.CONTACT,
                uid: user1Uid,
            };
            viewModel = services.viewModel.conversation(receiver);
        });

        it('get the last message when only normal messages are present', function () {
            const {crypto} = services;

            for (let i = 0; i < 10; i += 1) {
                const messageId = randomMessageId(crypto);
                singleConversation.get().controller.addMessage.fromSync({
                    direction: MessageDirection.OUTBOUND,
                    type: 'text',
                    id: messageId,
                    text: `Message with ID ${messageId}`,
                    createdAt: new Date(),
                });
            }
            const messageId = randomMessageId(crypto);

            const lastMessageDate = new Date();
            singleConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: lastMessageDate,
            });

            assert(viewModel !== undefined, 'Viewmodel should not be undefined');
            const lastMessageStore = viewModel.viewModelStore.get()?.lastMessage;
            expect(
                isMessageId(lastMessageStore?.id),
                'Last message should be a standard message',
            ).to.eq(true);
            expect(
                singleConversation.get().controller.lastMessageStore().get()?.get().view.createdAt,
            ).to.eql(lastMessageDate);
            expect(singleConversation.get().controller.lastStatusMessageStore().get()).to.eq(
                undefined,
            );
        });

        it('Get the last status message when only status messages are present', function () {
            for (let i = 0; i < 10; i += 1) {
                const createdAt = new Date();
                singleConversation.get().controller.createStatusMessage({
                    type: 'group-name-change',
                    value: {
                        oldName: 'bli',
                        newName: 'blub',
                    },
                    createdAt,
                });
            }
            const lastMessageDate = new Date();
            singleConversation.get().controller.createStatusMessage({
                type: 'group-name-change',
                value: {
                    oldName: 'bli',
                    newName: 'blub',
                },
                createdAt: lastMessageDate,
            });

            const lastMessageStore = viewModel?.viewModelStore.get()?.lastMessage;
            expect(isMessageId(lastMessageStore?.id)).to.eq(false);
            expect(isStatusMessageId(lastMessageStore?.id)).to.eq(true);
            expect(lastMessageStore?.direction).to.eq('none');
            expect(
                singleConversation.get().controller.lastStatusMessageStore().get()?.get().view
                    .createdAt,
            ).to.eql(lastMessageDate);
            expect(singleConversation.get().controller.lastMessageStore().get()).to.eq(undefined);
        });

        it('last message store when no message is present', function () {
            const lastMessageStore = viewModel?.viewModelStore.get()?.lastMessage;
            expect(lastMessageStore).to.be.undefined;
            expect(singleConversation.get().controller.lastMessageStore().get()).to.be.undefined;
            expect(singleConversation.get().controller.lastStatusMessageStore().get()).to.be
                .undefined;
        });

        it('last message store when a mixture of status and normal messages is present', function () {
            const {crypto} = services;

            const now = Date.now();
            for (let i = 0; i < 10; i += 1) {
                if (i % 2 === 0) {
                    singleConversation.get().controller.createStatusMessage({
                        type: 'group-name-change',
                        value: {
                            oldName: 'bli',
                            newName: 'blub',
                        },
                        createdAt: new Date(now + i * 20),
                    });
                } else {
                    const messageId = randomMessageId(crypto);
                    singleConversation.get().controller.addMessage.fromSync({
                        direction: MessageDirection.OUTBOUND,
                        type: 'text',
                        id: messageId,
                        text: `Message with ID ${messageId}`,
                        createdAt: new Date(now + i * 20 + 10),
                    });
                }
            }

            const lastStatusMessageDate = new Date(now + 3000);
            singleConversation.get().controller.createStatusMessage({
                type: 'group-name-change',
                value: {
                    oldName: 'bli',
                    newName: 'blub',
                },
                createdAt: lastStatusMessageDate,
            });

            const lastStatusMessageStore = viewModel?.viewModelStore.get()?.lastMessage;
            expect(
                isMessageId(lastStatusMessageStore?.id),
                'last status message store Should not be a message ID',
            ).to.eq(false);
            expect(
                isStatusMessageId(lastStatusMessageStore?.id),
                'last status message store should be a status ID',
            ).to.eq(true);
            expect(
                lastStatusMessageStore?.direction,
                'last status message store should not have a direction',
            ).to.eq('none');
            expect(
                singleConversation.get().controller.lastStatusMessageStore().get()?.get().view
                    .createdAt,
            ).to.eql(lastStatusMessageDate);
            expect(singleConversation.get().controller.lastMessageStore().get()).to.not.be
                .undefined;

            const messageId = randomMessageId(crypto);

            const lastMessageDate = new Date(now + 10000);
            singleConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: lastMessageDate,
            });

            assert(viewModel !== undefined, 'Viewmodel should not be undefined');
            const lastMessageStore = viewModel.viewModelStore.get()?.lastMessage;
            expect(
                isMessageId(lastMessageStore?.id),
                'Last message should be a standard message',
            ).to.eq(true);
            expect(
                singleConversation.get().controller.lastMessageStore().get()?.get().view.createdAt,
            ).to.eql(lastMessageDate);
            expect(singleConversation.get().controller.lastStatusMessageStore().get()).to.not.be
                .undefined;
        });
    });
}
