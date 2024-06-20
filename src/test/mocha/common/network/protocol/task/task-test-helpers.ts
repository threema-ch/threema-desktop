import {expect} from 'chai';

import type {ServicesForBackend} from '~/common/backend';
import type {EncryptedData, Nonce, PublicKey} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {deriveMessageMetadataKey} from '~/common/crypto/csp-keys';
import {
    type CspE2eDeliveryReceiptStatus,
    CspE2eGroupControlType,
    CspE2eStatusUpdateType,
    TransactionScope,
} from '~/common/enum';
import * as protobuf from '~/common/network/protobuf';
import {CspPayloadType, D2mPayloadType, type LayerEncoder} from '~/common/network/protocol';
import * as structbuf from '~/common/network/structbuf';
import {
    ensureMessageId,
    type GroupId,
    type IdentityString,
    type MessageId,
} from '~/common/network/types';
import type {ClientKey} from '~/common/network/types/keys';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {byteWithoutPkcs7} from '~/common/utils/byte';
import {Delayed} from '~/common/utils/delayed';
import {assertCspPayloadType, assertD2mPayloadType} from '~/test/mocha/common/assertions';
import {
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestNonceService,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';

/**
 * Convert a layer encoder for a message payload to the actual message by encoding and decoding.
 */
export function decodeMessageEncodable(
    encoder: LayerEncoder<structbuf.csp.payload.MessageWithMetadataBoxEncodable>,
): structbuf.csp.payload.MessageWithMetadataBox {
    // Encode encodable
    const messageBytes = encoder.encode(new Uint8Array(encoder.byteLength()));
    // Decode bytes
    return structbuf.csp.payload.MessageWithMetadataBox.decode(messageBytes);
}

/**
 * Decode and encrypt the metadata box of a message payload.
 */
export function decryptMetadata(
    {crypto}: Pick<ServicesForBackend, 'crypto'>,
    message: structbuf.csp.payload.MessageWithMetadataBox,
    senderPublicKey: PublicKey,
    receiverCk: ClientKey,
): protobuf.validate.csp_e2e.MessageMetadata.Type | undefined {
    if (message.metadataLength === 0) {
        return undefined;
    }
    return protobuf.validate.csp_e2e.MessageMetadata.SCHEMA.parse(
        protobuf.csp_e2e.MessageMetadata.decode(
            deriveMessageMetadataKey(
                {crypto, nonces: new TestNonceService()},
                receiverCk,
                senderPublicKey,
            )
                .decryptorWithNonce(
                    CREATE_BUFFER_TOKEN,
                    message.messageAndMetadataNonce as Nonce,
                    message.metadataContainer as EncryptedData,
                )
                .decrypt('decryptMetadata').plainData,
        ),
    );
}

/**
 * Decode and encrypt the container inside a message payload.
 */
export function decryptContainer(
    message: structbuf.csp.payload.MessageWithMetadataBox,
    senderPublicKey: PublicKey,
    receiverCk: ClientKey,
): structbuf.csp.e2e.Container {
    const decrypted = receiverCk
        .getSharedBox(senderPublicKey)
        .decryptorWithNonce(
            CREATE_BUFFER_TOKEN,
            message.messageAndMetadataNonce as Nonce,
            message.messageBox as EncryptedData,
        )
        .decrypt('decryptContainer').plainData;
    return structbuf.csp.e2e.Container.decode(decrypted);
}

/**
 * Ensure that the group with the specified lookup keys exists in the database and has the specified
 * members.
 */
export function assertGroupHasMembers(
    services: Pick<ServicesForBackend, 'model'>,
    groupId: GroupId,
    creatorIdentity: IdentityString,
    expectedMembers: readonly IdentityString[],
): void {
    const group = services.model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);
    assert(group !== undefined, 'Group not found');
    expect(
        [...group.get().view.members].map((member) => member.get().view.identity),
    ).to.have.members(expectedMembers);
}

/**
 * Return a list of expectations for:
 *
 * - Reflect outgoing delivery receipt
 * - Send outgoing delivery receipt
 * - Receive server ack for outgoing delivery receipt
 */
export function reflectAndSendDeliveryReceipt(
    services: ServicesForBackend,
    recipient: TestUser,
    status: CspE2eDeliveryReceiptStatus,
): NetworkExpectation[] {
    const {device} = services;
    const messageIdDelayed = Delayed.simple<MessageId>('MessageId');
    return [
        // Reflect outgoing delivery receipt
        NetworkExpectationFactory.reflectSingle((payload) => {
            expect(payload.content).to.equal('outgoingMessage');
            expect(payload.outgoingMessage?.type).to.equal(
                protobuf.common.CspE2eMessageType.DELIVERY_RECEIPT,
            );
        }),

        // Send outgoing delivery receipt
        NetworkExpectationFactory.write((m) => {
            // Message must be an outgoing CSP message
            assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
            assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);

            // Message must be sent from me to the recipient
            const message = decodeMessageEncodable(m.payload.payload);
            expect(message.senderIdentity).to.eql(device.identity.bytes);
            expect(message.receiverIdentity).to.eql(recipient.identity.bytes);
            messageIdDelayed.set(ensureMessageId(message.messageId));

            // Validate message type
            const messageContainer = decryptContainer(message, device.csp.ck.public, recipient.ck);
            expect(messageContainer.type).to.equal(CspE2eStatusUpdateType.DELIVERY_RECEIPT);

            // Validate message contents
            const deliveryReceipt = structbuf.csp.e2e.DeliveryReceipt.decode(
                byteWithoutPkcs7(messageContainer.paddedData),
            );
            expect(deliveryReceipt.status).to.equal(status);
        }),

        // Expect server ack for delivery receipt
        NetworkExpectationFactory.readIncomingMessageAck(
            recipient.identity.string,
            messageIdDelayed,
        ),
    ];
}

/**
 * Expect a group-setup message to be sent towards a single user.
 *
 * If `options.reflect` is `true`, then it is expected that the message is reflected as well.
 */
export function sendGroupSetupToUser(
    services: ServicesForBackend,
    recipient: TestUser,
    expectedMembers: IdentityString[],
    options: {reflect: boolean},
): NetworkExpectation[] {
    const {device} = services;
    const messageIdDelayed = Delayed.simple<MessageId>('MessageId');
    return [
        ...(options.reflect
            ? [
                  // Outgoing group setup should be reflected
                  NetworkExpectationFactory.reflectSingle((payload) => {
                      expect(payload.content).to.equal('outgoingMessage');
                      const outgoingMessage = unwrap(
                          payload.outgoingMessage,
                          'Outgoing message is undefined',
                      );
                      expect(outgoingMessage.type).to.equal(CspE2eGroupControlType.GROUP_SETUP);

                      // Conversation ID must be contact, not group
                      expect(outgoingMessage.conversation?.contact).to.equal(
                          recipient.identity.string,
                      );

                      // Validate member list
                      const container =
                          structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                              structbuf.csp.e2e.GroupCreatorContainer.decode(outgoingMessage.body),
                          );
                      const groupSetup = structbuf.validate.csp.e2e.GroupSetup.SCHEMA.parse(
                          structbuf.csp.e2e.GroupSetup.decode(container.innerData),
                      );
                      expect(groupSetup.members).to.have.members(expectedMembers);
                  }),
              ]
            : []),

        // Group setup must be sent
        NetworkExpectationFactory.write((m) => {
            // Message must be an outgoing CSP message
            assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
            assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);

            // Message must be sent from me to user1
            const message = decodeMessageEncodable(m.payload.payload);
            expect(message.senderIdentity).to.eql(device.identity.bytes);
            expect(message.receiverIdentity).to.eql(recipient.identity.bytes);
            messageIdDelayed.set(ensureMessageId(message.messageId));

            // Message should contain a group setup
            const messageContainer = decryptContainer(message, device.csp.ck.public, recipient.ck);
            expect(messageContainer.type).to.equal(CspE2eGroupControlType.GROUP_SETUP);

            // Validate member list
            const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(
                    byteWithoutPkcs7(messageContainer.paddedData),
                ),
            );
            const groupSetup = structbuf.validate.csp.e2e.GroupSetup.SCHEMA.parse(
                structbuf.csp.e2e.GroupSetup.decode(container.innerData),
            );
            expect(groupSetup.members).to.have.members(expectedMembers);
        }),

        // Expect server ack for group setup
        NetworkExpectationFactory.readIncomingMessageAck(
            recipient.identity.string,
            messageIdDelayed,
        ),
    ];
}

/**
 * Expect a group-name message to be reflected and sent towards a single user.
 */
export function reflectAndSendGroupNameToUser(
    services: ServicesForBackend,
    recipient: TestUser,
    expectedName: string,
): NetworkExpectation[] {
    const {device} = services;
    const messageIdDelayed = Delayed.simple<MessageId>('MessageId');
    return [
        // Outgoing group name should be reflected
        NetworkExpectationFactory.reflectSingle((payload) => {
            expect(payload.content).to.equal('outgoingMessage');
            const outgoingMessage = unwrap(
                payload.outgoingMessage,
                'Outgoing message is undefined',
            );
            expect(outgoingMessage.type).to.equal(CspE2eGroupControlType.GROUP_NAME);

            // Conversation ID must be contact, not group
            expect(outgoingMessage.conversation?.contact).to.equal(recipient.identity.string);

            // Validate name
            const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(outgoingMessage.body),
            );
            const groupName = structbuf.validate.csp.e2e.GroupName.SCHEMA.parse(
                structbuf.csp.e2e.GroupName.decode(container.innerData),
            );
            expect(groupName.name).to.equal(expectedName);
        }),

        // Group name must be sent
        NetworkExpectationFactory.write((m) => {
            // Message must be an outgoing CSP message
            assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
            assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);

            // Message must be sent from me to user1
            const message = decodeMessageEncodable(m.payload.payload);
            expect(message.senderIdentity).to.eql(device.identity.bytes);
            expect(message.receiverIdentity).to.eql(recipient.identity.bytes);
            messageIdDelayed.set(ensureMessageId(message.messageId));

            // Message should contain a group name
            const messageContainer = decryptContainer(message, device.csp.ck.public, recipient.ck);
            expect(messageContainer.type).to.equal(CspE2eGroupControlType.GROUP_NAME);

            // Validate name
            const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(
                    byteWithoutPkcs7(messageContainer.paddedData),
                ),
            );
            const groupName = structbuf.validate.csp.e2e.GroupName.SCHEMA.parse(
                structbuf.csp.e2e.GroupName.decode(container.innerData),
            );
            expect(groupName.name).to.equal(expectedName);
        }),

        // Expect server ack for group name
        NetworkExpectationFactory.readIncomingMessageAck(
            recipient.identity.string,
            messageIdDelayed,
        ),
    ];
}

/**
 * Expect a group-name message to be reflected and sent towards a single user.
 */
export function reflectAndSendGroupProfilePictureToUser(
    services: ServicesForBackend,
    recipient: TestUser,
    profilePictureSent: boolean,
): NetworkExpectation[] {
    const {device} = services;
    const messageIdDelayed = Delayed.simple<MessageId>('MessageId');
    const cspMessageType = profilePictureSent
        ? CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE
        : CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE;
    const d2dMessageType = profilePictureSent
        ? CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE
        : CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE;
    return [
        // Outgoing group profile picture should be reflected
        NetworkExpectationFactory.reflectSingle((payload) => {
            expect(payload.content).to.equal('outgoingMessage');
            const outgoingMessage = unwrap(
                payload.outgoingMessage,
                'Outgoing message is undefined',
            );
            expect(outgoingMessage.type).to.equal(d2dMessageType);

            // Conversation ID must be contact, not group
            expect(outgoingMessage.conversation?.contact).to.equal(recipient.identity.string);

            // Validate profile picture message
            const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(outgoingMessage.body),
            );
            if (profilePictureSent) {
                const groupSetProfilePicture =
                    structbuf.validate.csp.e2e.SetProfilePicture.SCHEMA.parse(
                        structbuf.csp.e2e.SetProfilePicture.decode(container.innerData),
                    );
                expect(groupSetProfilePicture.pictureBlobId).not.to.be.empty;
                expect(groupSetProfilePicture.key.length).to.equal(32);
            } else {
                expect(container.innerData).to.be.empty;
            }
        }),

        // Group profile picture message must be sent
        NetworkExpectationFactory.write((m) => {
            // Message must be an outgoing CSP message
            assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
            assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);

            // Message must be sent from me to user1
            const message = decodeMessageEncodable(m.payload.payload);
            expect(message.senderIdentity).to.eql(device.identity.bytes);
            expect(message.receiverIdentity).to.eql(recipient.identity.bytes);
            messageIdDelayed.set(ensureMessageId(message.messageId));

            // Message should contain a group name
            const messageContainer = decryptContainer(message, device.csp.ck.public, recipient.ck);
            expect(messageContainer.type).to.equal(cspMessageType);

            // Validate contents
            const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(
                    byteWithoutPkcs7(messageContainer.paddedData),
                ),
            );
            if (profilePictureSent) {
                const groupSetProfilePicture =
                    structbuf.validate.csp.e2e.SetProfilePicture.SCHEMA.parse(
                        structbuf.csp.e2e.SetProfilePicture.decode(container.innerData),
                    );
                expect(groupSetProfilePicture.pictureBlobId).not.to.be.empty;
                expect(groupSetProfilePicture.key.length).to.equal(32);
            } else {
                expect(container.innerData).to.be.empty;
            }
        }),

        // Expect server ack for group profile picture message
        NetworkExpectationFactory.readIncomingMessageAck(
            recipient.identity.string,
            messageIdDelayed,
        ),
    ];
}

/**
 * Expect a contact to be reflected.
 */
export function reflectContactSync(
    user: TestUser,
    mode: 'create' | 'update',
): NetworkExpectation[] {
    return [
        NetworkExpectationFactory.startTransaction(0, TransactionScope.CONTACT_SYNC),
        NetworkExpectationFactory.reflectSingle((payload) => {
            expect(payload.content).to.equal('contactSync');
            const outgoingMessage = unwrap(payload.contactSync, 'Contact sync is undefined');
            let identity;
            switch (mode) {
                case 'create':
                    expect(outgoingMessage.create, 'Contact create is undefined').not.to.be
                        .undefined;
                    identity = outgoingMessage.create?.contact?.identity;
                    break;
                case 'update':
                    expect(outgoingMessage.update, 'Contact update is undefined').not.to.be
                        .undefined;
                    identity = outgoingMessage.update?.contact?.identity;
                    break;
                default:
                    unreachable(mode);
            }
            expect(identity, 'Wrong contact reflected').to.equal(user.identity.string);
        }),
    ];
}
