import {expect} from 'chai';

import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {BlobDownloadState, MessageDirection, MessageDirectionUtils} from '~/common/enum';
import {randomFileEncryptionKey, randomFileId} from '~/common/file-storage';
import {type Contact, type Conversation, type InboundFileMessageState} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {BLOB_ID_LENGTH, ensureBlobId} from '~/common/network/protocol/blob';
import {randomMessageId} from '~/common/network/protocol/utils';
import {FILE_STORAGE_FORMAT} from '~/common/node/file-storage/system-file-storage';
import {assert} from '~/common/utils/assert';
import {
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';
import {createFileMessage, type TestFileMessageInit} from '~/test/mocha/common/db-backend-tests';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

const crypto = new TweetNaClBackend(pseudoRandomBytes);

export function run(): void {
    describe('Message model', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');

        let services: TestServices;
        let contact: LocalModelStore<Contact>;
        let conversation: LocalModelStore<Conversation>;

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

        describe('file message', function () {
            const testCases: {
                init: Pick<TestFileMessageInit, 'blobId' | 'fileData' | 'blobDownloadState'>;
                expectedState: InboundFileMessageState;
            }[] = [
                // Test case 1: Remote because it doesn't contain file data
                {
                    init: {
                        blobId: ensureBlobId(crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        blobDownloadState: undefined,
                        fileData: undefined,
                    },
                    expectedState: 'remote',
                },
                // Test case 2: Local because it does contain file data
                {
                    init: {
                        blobId: ensureBlobId(crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        blobDownloadState: undefined,
                        fileData: {
                            fileId: randomFileId(crypto),
                            encryptionKey: randomFileEncryptionKey(crypto),
                            unencryptedByteCount: 123,
                            storageFormatVersion: FILE_STORAGE_FORMAT.V1,
                        },
                    },
                    expectedState: 'local',
                },
                // Test case 3: Failed if marked as failed
                {
                    init: {
                        blobId: ensureBlobId(crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        blobDownloadState: BlobDownloadState.FAILED,
                        fileData: undefined,
                    },
                    expectedState: 'failed',
                },
            ];

            // TODO(DESK-316): Add tests for outbound messages as well

            for (const testCase of testCases) {
                // eslint-disable-next-line no-loop-func
                it(`initialize state '${testCase.expectedState}' for inbound ${testCase.expectedState} message`, function () {
                    // Create file message in database
                    const messageId = randomMessageId(crypto);
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

                    // Fetch message model
                    const message = conversation.get().controller.getMessage(messageId);
                    assert(message !== undefined, 'Message not found');
                    assert(
                        message.type === 'file',
                        `Expected a file message, but found ${message.type}`,
                    );
                    assert(
                        message.ctx === MessageDirection.INBOUND,
                        `Expected INBOUND message direction, but it was ${MessageDirectionUtils.nameOf(
                            message.ctx,
                        )}`,
                    );

                    // Validate view fields
                    const view = message.get().view;
                    expect(view.fileName).to.equal('document.pdf');
                    expect(view.state).to.equal(testCase.expectedState);
                });
            }
        });
    });
}
