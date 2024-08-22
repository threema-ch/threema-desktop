import {expect} from 'chai';

import type {Contact, Conversation} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import {assert} from '~/common/utils/assert';
import {
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    TestTweetNaClBackend,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';
import {createFileMessage, randomBlobId} from '~/test/mocha/common/db-backend-tests';

export function run(): void {
    describe('Message history model', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');

        const crypto = new TestTweetNaClBackend();

        let services: TestServices;
        let contact: ModelStore<Contact>;
        let conversation: ModelStore<Conversation>;

        const messageId = randomMessageId(crypto);

        const testCase = {
            init: {
                blobId: randomBlobId(),
                blobDownloadState: undefined,
                fileData: undefined,
            },
            expectedState: 'unsynced',
        };

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
            contact = addTestUserAsContact(services.model, anotherUser);
            conversation = contact.get().controller.conversation();
        });

        // Set up log for failed tests
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        describe('File Message History', function () {
            it('Initialize a message without history', function () {
                createFileMessage(services.model.db, {
                    // Message ID
                    id: messageId,
                    // Make it an inbound message
                    senderContactUid: contact.ctx,
                    conversationUid: conversation.ctx,
                    raw: new Uint8Array(123),
                    processedAt: new Date(),
                    // File data
                    mediaType: 'application/pdf',
                    fileName: 'document.pdf',
                    fileSize: 1234,
                    ...testCase.init,
                });
                const message = conversation.get().controller.getMessage(messageId);

                assert(message !== undefined, 'Message must not be undefined');
                expect(message.get().view.history.length).to.equal(
                    0,
                    'No message history should be present',
                );

                assert(message.type === 'file');

                expect(message.get().view.lastEditedAt, 'Message was not edited').to.be.undefined;

                const editedAt = new Date();
                message.get().controller.editMessage.fromSync({
                    lastEditedAt: editedAt,
                    newText: 'abcdefg',
                });

                expect(message.get().view.lastEditedAt).to.equal(editedAt);
                expect(message.get().view.caption).to.equal('abcdefg');
                expect(message.get().view.history.length).to.equal(2);
                expect(message.get().view.caption).to.equal('abcdefg');

                const editedAt2 = new Date();

                message.get().controller.editMessage.fromSync({
                    lastEditedAt: editedAt2,
                    newText: 'caption2',
                });

                expect(message.get().view.history.length).to.equal(3);
                expect(message.get().view.caption).to.eq('caption2');
                expect(message.get().view.history.find((val) => val.text === 'abcdefg')).to.not.be
                    .undefined;
                expect(message.get().view.history.find((val) => val.text === '')).to.not.be
                    .undefined;
            });
        });
    });
}
