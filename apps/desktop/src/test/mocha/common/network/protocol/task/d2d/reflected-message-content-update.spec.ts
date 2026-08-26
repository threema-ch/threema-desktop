import {UTF8} from '@threema/ts-utils/codec/utf8';
import {dateToUnixTimestampMs} from '@threema/ts-utils/number/date-to-unix-timestamp-ms';
import {intoUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import {expect} from 'chai';

import {NACL_CONSTANTS} from '~/common/crypto';
import {
    CspE2eGroupConversationType,
    CspE2eGroupMessageUpdateType,
    D2dProtocolVersion,
    MessageDirection,
} from '~/common/enum';
import type {Contact, Conversation} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {d2d} from '~/common/network/protobuf';
import * as proto from '~/common/network/protobuf';
import {ReflectedIncomingMessageTask} from '~/common/network/protocol/task/d2d/reflected-incoming-message';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {
    ensureD2mDeviceId,
    ensureIdentityString,
    type GroupId,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    addTestGroup,
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';
import {secondsAgo} from '~/test/mocha/common/utils';

/**
 * Tests for {@link ReflectedMessageContentUpdateTask} (exercised through
 * {@link ReflectedIncomingMessageTask}).
 *
 * A message content update (edit or delete) is only authorized when it originates from the original
 * author of the referenced message. These tests verify that authorization invariant for group
 * conversations, where more than one contact can send content updates into the same conversation.
 */
export function run(): void {
    describe('ReflectedMessageContentUpdateTask', function () {
        const me = ensureIdentityString('MEMEMEME');

        // Author of the referenced message.
        const author = {
            identity: new Identity(ensureIdentityString('AUTHOR01')),
            nickname: 'author' as Nickname,
            ck: createClientKey(),
        };
        // Another member of the same group.
        const otherMember = {
            identity: new Identity(ensureIdentityString('OTHERMEM')),
            nickname: 'other' as Nickname,
            ck: createClientKey(),
        };

        let services: TestServices;
        let authorContact: ModelStore<Contact>;
        let groupId: GroupId;
        let groupConversation: ModelStore<Conversation>;

        this.beforeEach(function () {
            services = makeTestServices(me);

            authorContact = addTestUserAsContact(services.model, author);
            const otherMemberContact = addTestUserAsContact(services.model, otherMember);

            groupId = randomGroupId(services.crypto);
            const group = addTestGroup(services.model, {
                groupId,
                creator: authorContact,
                name: 'Shared group',
                members: [authorContact, otherMemberContact],
            });
            groupConversation = group.get().controller.conversation();
        });

        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        /**
         * Insert an inbound group text message authored by {@link author} into the group
         * conversation, as it would be received (reflected) from the author.
         */
        async function insertGroupTextMessageFromAuthor(
            handle: TestHandle,
            messageId: MessageId,
            text: string,
        ): Promise<void> {
            const createdAt = secondsAgo(20);
            const reflectedAt = secondsAgo(10);
            const encoder = structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                creatorIdentity: author.identity.bytes,
                groupId,
                innerData: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                    text: UTF8.encode(text),
                }),
            });
            const reflectedMessage: d2d.IncomingMessage = {
                senderIdentity: author.identity.string,
                messageId: intoUnsignedLong(messageId),
                createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                type: CspE2eGroupConversationType.GROUP_TEXT,
                body: encoder.encode(new Uint8Array(encoder.byteLength())),
                nonce: services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
            };
            await new ReflectedIncomingMessageTask(
                services,
                reflectedMessage,
                ensureD2mDeviceId(42n),
                reflectedAt,
                D2dProtocolVersion.UNSPECIFIED,
            ).run(handle);
            handle.finish();
        }

        it('rejects an EDIT content update if the sender is not the original author', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

            // The author sends a group message.
            const messageId = randomMessageId(crypto);
            const originalText = 'Original text';
            await insertGroupTextMessageFromAuthor(handle, messageId, originalText);

            // A different group member sends an edit that references the author's message.
            const editEncoder = structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                creatorIdentity: author.identity.bytes,
                groupId,
                innerData: proto.utils.encoder(proto.csp_e2e.EditMessage, {
                    text: 'Edited text',
                    messageId: intoUnsignedLong(messageId),
                }),
            });
            const reflectedEditMessage: d2d.IncomingMessage = {
                senderIdentity: otherMember.identity.string,
                messageId: intoUnsignedLong(randomMessageId(crypto)),
                createdAt: intoUnsignedLong(dateToUnixTimestampMs(secondsAgo(5))),
                type: CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE,
                body: editEncoder.encode(new Uint8Array(editEncoder.byteLength())),
                nonce: services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
            };
            await new ReflectedIncomingMessageTask(
                services,
                reflectedEditMessage,
                ensureD2mDeviceId(42n),
                secondsAgo(4),
                D2dProtocolVersion.UNSPECIFIED,
            ).run(handle);
            handle.finish();

            // The edit must be ignored: the message keeps its original text and is not marked edited.
            const messages = groupConversation.get().controller.getAllMessages().get();
            expect(messages.size, 'Group conversation message count').to.equal(1);
            const [message] = [...messages.values()];
            assert(message !== undefined);
            assert(message.type === 'text', `Wrong message type: ${message.type}`);
            assert(message.ctx === MessageDirection.INBOUND, 'Wrong message direction');
            expect(message.get().view.text, 'Message text').to.equal(originalText);
            expect(message.get().view.lastEditedAt, 'lastEditedAt').to.be.undefined;
        });

        it('rejects a DELETE content update if the sender is not the original author', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

            // The author sends a group message.
            const messageId = randomMessageId(crypto);
            const originalText = 'Original text';
            await insertGroupTextMessageFromAuthor(handle, messageId, originalText);

            // A different group member sends a delete that references the author's message.
            const deleteEncoder = structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                creatorIdentity: author.identity.bytes,
                groupId,
                innerData: proto.utils.encoder(proto.csp_e2e.DeleteMessage, {
                    messageId: intoUnsignedLong(messageId),
                }),
            });
            const reflectedDeleteMessage: d2d.IncomingMessage = {
                senderIdentity: otherMember.identity.string,
                messageId: intoUnsignedLong(randomMessageId(crypto)),
                createdAt: intoUnsignedLong(dateToUnixTimestampMs(secondsAgo(5))),
                type: CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE,
                body: deleteEncoder.encode(new Uint8Array(deleteEncoder.byteLength())),
                nonce: services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
            };
            await new ReflectedIncomingMessageTask(
                services,
                reflectedDeleteMessage,
                ensureD2mDeviceId(42n),
                secondsAgo(4),
                D2dProtocolVersion.UNSPECIFIED,
            ).run(handle);
            handle.finish();

            // The delete must be ignored: the message is still present and not marked as deleted.
            const messages = groupConversation.get().controller.getAllMessages().get();
            expect(messages.size, 'Group conversation message count').to.equal(1);
            const [message] = [...messages.values()];
            assert(message !== undefined);
            expect(message.type, 'Message type').to.equal('text');
        });
    });
}
