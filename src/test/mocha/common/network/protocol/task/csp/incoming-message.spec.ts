import {expect} from 'chai';

import {type ServicesForBackend} from '~/common/backend';
import {wrapRawKey} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN, SharedBoxFactory} from '~/common/crypto/box';
import {CspE2eGroupControlType} from '~/common/enum';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {MESSAGE_DATA_PADDING_LENGTH_MIN} from '~/common/network/protocol/task/constants';
import {IncomingMessageTask} from '~/common/network/protocol/task/csp/incoming-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {pkcs7PaddedEncoder} from '~/common/network/structbuf/bridge';
import {type IdentityString, ensureIdentityString} from '~/common/network/types';
import {type ByteLengthEncoder} from '~/common/types';
import {UTF8} from '~/common/utils/codec';
import {Identity} from '~/common/utils/identity';
import {dateToUnixTimestampS} from '~/common/utils/number';
import {
    type NetworkExpectation,
    type TestServices,
    type TestUser,
    makeTestServices,
    NetworkExpectationFactory,
    TestHandle,
} from '~/test/mocha/common/backend-mocks';

/**
 * Create a message from {@link sender} to {@link receiver} and with the {@link innerPayload} used
 * as the inner payload of the legacy message.
 */
function createMessage(
    services: ServicesForBackend,
    sender: TestUser,
    receiver: IdentityString,
    innerPayload: ByteLengthEncoder,
    flags: CspMessageFlags,
): structbuf.csp.payload.LegacyMessageLike {
    const {crypto, device} = services;
    const sharedBox = device.csp.ck.getSharedBox(sender.keypair.public, device.csp.nonceGuard);
    const [messageNonce, messageBox] = sharedBox
        .encryptor(
            CREATE_BUFFER_TOKEN,
            structbuf.bridge.encoder(structbuf.csp.e2e.Container, {
                type: CspE2eGroupControlType.GROUP_LEAVE,
                paddedData: pkcs7PaddedEncoder(
                    crypto,
                    MESSAGE_DATA_PADDING_LENGTH_MIN,
                    innerPayload,
                ),
            }),
        )
        .encryptWithRandomNonce();
    return {
        senderIdentity: sender.identity.bytes,
        receiverIdentity: UTF8.encode(receiver),
        messageId: randomMessageId(crypto),
        createdAt: dateToUnixTimestampS(new Date()),
        flags: flags.toBitmask(),
        reserved: 0,
        reservedMetadataLength: new Uint8Array(2),
        senderNickname: UTF8.encode(sender.nickname),
        messageNonce,
        messageBox,
    };
}

/**
 * Test incoming message task.
 */
export function run(): void {
    describe('IncomingMessageTask', function () {
        const me = ensureIdentityString('MEMEMEME');

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

        it('discard messages that appear to be sent by ourselves', async function () {
            const {crypto, model} = services;

            // Encode and encrypt message
            const msg = createMessage(
                services,
                {
                    identity: new Identity(me),
                    keypair: new SharedBoxFactory(
                        crypto,
                        wrapRawKey(Uint8Array.from(services.rawClientKeyBytes)).asReadonly(),
                    ),
                    nickname: 'me myself',
                },
                me,
                structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                    text: UTF8.encode('hello from myself'),
                }),
                CspMessageFlags.none(),
            );

            // Run task
            const task = new IncomingMessageTask(services, msg);
            const expectations: NetworkExpectation[] = [
                // We expect the message to be dropped because it's invalid
                NetworkExpectationFactory.writeIncomingMessageAck(),
            ];
            const handle = new TestHandle(services, expectations);
            await task.run(handle);
            expect(expectations, 'Not all expectations consumed').to.be.empty;

            // Ensure that no text message was created
            const contactForOwnIdentity = model.contacts.getByIdentity(me);
            expect(contactForOwnIdentity, 'Contact for own identity should not exist').to.be
                .undefined;
        });
    });
}
