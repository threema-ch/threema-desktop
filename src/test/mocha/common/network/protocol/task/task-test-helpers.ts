import {expect} from 'chai';

import {type ServicesForBackend} from '~/common/backend';
import {
    type EncryptedData,
    type Nonce,
    type PublicKey,
    NONCE_UNGUARDED_TOKEN,
} from '~/common/crypto';
import {type SharedBoxFactory, CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {CspE2eGroupControlType, TransactionScope} from '~/common/enum';
import {type LayerEncoder, CspPayloadType, D2mPayloadType} from '~/common/network/protocol';
import * as structbuf from '~/common/network/structbuf';
import {type Container} from '~/common/network/structbuf/csp/e2e';
import {
    type LegacyMessage,
    type LegacyMessageEncodable,
} from '~/common/network/structbuf/csp/payload';
import * as validate from '~/common/network/structbuf/validate';
import {
    type GroupId,
    type IdentityString,
    type MessageId,
    ensureMessageId,
} from '~/common/network/types';
import {assert, unwrap} from '~/common/utils/assert';
import {byteWithoutPkcs7} from '~/common/utils/byte';
import {Delayed} from '~/common/utils/delayed';
import {assertCspPayloadType, assertD2mPayloadType} from '~/test/mocha/common/assertions';
import {
    type NetworkExpectation,
    type TestUser,
    NetworkExpectationFactory,
} from '~/test/mocha/common/backend-mocks';

/**
 * Convert a layer encoder for a {@link LegacyMessageEncodable} to a {@link LegacyMessage} by
 * encoding and decoding.
 */
export function decodeLegacyMessageEncodable(
    encoder: LayerEncoder<LegacyMessageEncodable>,
): LegacyMessage {
    // Encode encodable
    const messageBytes = encoder.encode(new Uint8Array(encoder.byteLength()));
    // Decode bytes
    return structbuf.csp.payload.LegacyMessage.decode(messageBytes);
}

/**
 * Decode and encrypt the container inside a {@link LegacyMessage}.
 */
export function decryptContainer(
    message: LegacyMessage,
    senderPublicKey: PublicKey,
    receiverKeypair: SharedBoxFactory,
): Container {
    const decrypted = receiverKeypair
        .getSharedBox(senderPublicKey, NONCE_UNGUARDED_TOKEN)
        .decryptorWithNonce(
            CREATE_BUFFER_TOKEN,
            message.messageNonce as Nonce,
            message.messageBox as EncryptedData,
        )
        .decrypt();
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
    expectedMembers: IdentityString[],
): void {
    const group = services.model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);
    assert(group !== undefined, 'Group not found');
    expect(group.get().view.members).to.eql(expectedMembers);
}

/**
 * Expect a group-setup message to be reflected and sent towards a single user.
 */
export function reflectAndSendGroupSetupToUser(
    services: ServicesForBackend,
    recipient: TestUser,
    expectedMembers: IdentityString[],
): NetworkExpectation[] {
    const {device} = services;
    const messageIdDelayed = Delayed.simple<MessageId>(
        'Message ID not yet ready',
        'Message ID already set',
    );
    return [
        // Outgoing group setup should be reflected
        NetworkExpectationFactory.reflectSingle((payload) => {
            expect(payload.content).to.equal('outgoingMessage');
            const outgoingMessage = unwrap(
                payload.outgoingMessage,
                'Outgoing message is undefined',
            );
            expect(outgoingMessage.type).to.equal(CspE2eGroupControlType.GROUP_SETUP);

            // Conversation ID must be contact, not group
            expect(outgoingMessage.conversation?.contact).to.equal(recipient.identity.string);

            // Validate member list
            const container = structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(outgoingMessage.body),
            );
            const groupSetup = structbuf.validate.csp.e2e.GroupSetup.SCHEMA.parse(
                structbuf.csp.e2e.GroupSetup.decode(container.innerData),
            );
            expect(groupSetup.members).to.eql(expectedMembers);
        }),

        // Group setup must be sent
        NetworkExpectationFactory.write((m) => {
            // Message must be an outgoing CSP message
            assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
            assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);

            // Message must be sent from me to user1
            const message = decodeLegacyMessageEncodable(m.payload.payload);
            expect(message.senderIdentity).to.eql(device.identity.bytes);
            expect(message.receiverIdentity).to.eql(recipient.identity.bytes);
            messageIdDelayed.set(ensureMessageId(message.messageId));

            // Message should contain a group setup
            const messageContainer = decryptContainer(
                message,
                device.csp.ck.public,
                recipient.keypair,
            );
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
            expect(groupSetup.members).to.eql(expectedMembers);
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
    const messageIdDelayed = Delayed.simple<MessageId>(
        'Message ID not yet ready',
        'Message ID already set',
    );
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
            const container = validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(outgoingMessage.body),
            );
            const groupName = validate.csp.e2e.GroupName.SCHEMA.parse(
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
            const message = decodeLegacyMessageEncodable(m.payload.payload);
            expect(message.senderIdentity).to.eql(device.identity.bytes);
            expect(message.receiverIdentity).to.eql(recipient.identity.bytes);
            messageIdDelayed.set(ensureMessageId(message.messageId));

            // Message should contain a group name
            const messageContainer = decryptContainer(
                message,
                device.csp.ck.public,
                recipient.keypair,
            );
            expect(messageContainer.type).to.equal(CspE2eGroupControlType.GROUP_NAME);

            // Validate member list
            const container = validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(
                    byteWithoutPkcs7(messageContainer.paddedData),
                ),
            );
            const groupName = validate.csp.e2e.GroupName.SCHEMA.parse(
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
 * Expect a contact to be reflected.
 */
export function reflectContactSync(user: TestUser): NetworkExpectation[] {
    return [
        NetworkExpectationFactory.startTransaction(0, TransactionScope.CONTACT_SYNC),
        NetworkExpectationFactory.reflectSingle((payload) => {
            expect(payload.content).to.equal('contactSync');
            const outgoingMessage = unwrap(payload.contactSync, 'Contact sync is undefined');
            expect(outgoingMessage.create, 'Contact create is undefined').not.to.be.undefined;
            expect(outgoingMessage.create?.contact?.identity, 'Wrong contact reflected').to.equal(
                user.identity.string,
            );
        }),
    ];
}
