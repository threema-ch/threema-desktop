import {expect} from 'chai';

import {type CryptoBackend} from '~/common/crypto';
import {
    CspE2eConversationType,
    CspE2eGroupConversationType,
    MessageDirection,
    MessageType,
} from '~/common/enum';
import {type AnyReceiver, type Contact, type Group} from '~/common/model';
import {type OutboundTextMessageModelStore} from '~/common/model/message/text-message';
import {type OutboundTextMessageModel} from '~/common/model/types/message';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {type ActiveTaskCodecHandle, type ServicesForTasks} from '~/common/network/protocol/task';
import {serializeQuoteText} from '~/common/network/protocol/task/common/quotes';
import {OutgoingConversationMessageTask} from '~/common/network/protocol/task/csp/outgoing-conversation-message';
import {
    type IOutgoingCspMessageTaskConstructor,
    type MessageProperties,
    type ValidCspMessageTypeForReceiver,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {
    type GroupMemberContainerEncodable,
    type TextEncodable,
} from '~/common/network/structbuf/csp/e2e';
import {ensureIdentityString, type MessageId, type Nickname} from '~/common/network/types';
import {UTF8} from '~/common/utils/codec';
import {Identity} from '~/common/utils/identity';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {
    addTestGroup,
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

class TestOutgoingCspMessageBaseMock<
    TMessageEncoder,
    TReceiver extends AnyReceiver,
    TMessageType extends ValidCspMessageTypeForReceiver<TReceiver>,
> {
    public constructor(
        cspServices: ServicesForTasks,
        cspReceiver: TReceiver,
        properties: MessageProperties<TMessageEncoder, TMessageType>,
    ) {
        this._constructorCall();
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(): Promise<Date | undefined> {
        return new Date();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _constructorCall(): void {}
}

/**
 * Test {@link OutgoingCspMessageTask}
 */
export function run(): void {
    describe('OutgoingConversationMessageTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as Nickname,
            ck: createClientKey(),
        };

        const messageText = "I'm gonna be an astronaut when I grow up! 👩🏽‍🚀";
        function addOutgoingTestMessageForReceiver(
            receiver: AnyReceiver,
            crypto: CryptoBackend,
            text = messageText,
            quotedMessageId: MessageId | undefined = undefined,
        ): {
            readonly message: OutboundTextMessageModel;
            readonly messageStore: OutboundTextMessageModelStore;
        } {
            const messageStore = receiver.controller
                .conversation()
                .get()
                .controller.addMessage.fromSync({
                    direction: MessageDirection.OUTBOUND,
                    type: 'text',
                    createdAt: new Date(),
                    id: randomMessageId(crypto),
                    text,
                    quotedMessageId,
                }) as OutboundTextMessageModelStore;
            return {message: messageStore.get(), messageStore};
        }

        // Set up services and log printing
        let services: TestServices;
        let handle: ActiveTaskCodecHandle<'persistent'>;
        this.beforeEach(function () {
            services = makeTestServices(me);
            handle = new TestHandle(services, []) as unknown as ActiveTaskCodecHandle<'persistent'>;
        });
        this.afterEach(function () {
            (handle as unknown as TestHandle).finish();
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        it('should execute an OutgoingCspMessageTask', async function () {
            const {model, crypto} = services;

            const cspTaskConstructorPromise = new ResolvablePromise<void>();
            const runCalledPromise = new ResolvablePromise<void>();
            const outgoingCspMessageTaskConstructor = class extends TestOutgoingCspMessageBaseMock<
                TextEncodable,
                Contact,
                CspE2eConversationType.TEXT
            > {
                // eslint-disable-next-line @typescript-eslint/require-await
                public async run(): Promise<Date | undefined> {
                    runCalledPromise.resolve();
                    return new Date();
                }

                protected _constructorCall(): void {
                    cspTaskConstructorPromise.resolve();
                }
            } as IOutgoingCspMessageTaskConstructor;

            const receiver = addTestUserAsContact(model, user1).get();
            const {messageStore} = addOutgoingTestMessageForReceiver(receiver, crypto);
            const task = new OutgoingConversationMessageTask(
                services,
                receiver,
                messageStore,
                outgoingCspMessageTaskConstructor,
            );
            await task.run(handle);
            expect(cspTaskConstructorPromise.done, 'constructor function call').to.be.true;
            expect(runCalledPromise.done, 'run function call').to.be.true;
        });

        it('should initialize OutgoingCspMessageTask correctly for a text message', async function () {
            const {model, crypto} = services;
            const receiver = addTestUserAsContact(model, user1).get();
            const {message, messageStore} = addOutgoingTestMessageForReceiver(
                receiver,
                crypto,
                messageText,
            );

            const outgoingCspMessageTaskConstructor: IOutgoingCspMessageTaskConstructor =
                class extends TestOutgoingCspMessageBaseMock<
                    TextEncodable,
                    Contact,
                    CspE2eConversationType.TEXT
                > {
                    public constructor(
                        cspServices: ServicesForTasks,
                        cspReceiver: Contact,
                        properties: MessageProperties<TextEncodable, CspE2eConversationType.TEXT>,
                    ) {
                        super(cspServices, cspReceiver, properties);

                        const {messageId, type, encoder, cspMessageFlags} = properties;
                        expect(messageId).to.equal(message.view.id);
                        expect(type).to.equal(CspE2eConversationType.TEXT);
                        expect(cspMessageFlags).to.deep.equal(
                            CspMessageFlags.forMessageType(MessageType.TEXT),
                        );

                        const encodedMessage = encoder.encode(new Uint8Array(encoder.byteLength()));
                        const decodedMessage = structbuf.csp.e2e.Text.decode(encodedMessage);
                        const decodedText = UTF8.decode(decodedMessage.text);
                        expect(decodedText).to.equal(messageText);
                    }
                } as IOutgoingCspMessageTaskConstructor;

            const task = new OutgoingConversationMessageTask(
                services,
                receiver,
                messageStore,
                outgoingCspMessageTaskConstructor,
            );
            await task.run(handle);
        });

        it('should call OutgoingCspMessageTask correctly for a group text message', async function () {
            const {model, crypto} = services;
            const user = addTestUserAsContact(model, user1).get();
            const receiver = addTestGroup(model, {
                creatorIdentity: user.view.identity,
                members: [user.ctx],
            }).get();
            const {message, messageStore} = addOutgoingTestMessageForReceiver(
                receiver,
                crypto,
                messageText,
            );

            const outgoingCspMessageTaskConstructor: IOutgoingCspMessageTaskConstructor =
                class extends TestOutgoingCspMessageBaseMock<
                    GroupMemberContainerEncodable,
                    Group,
                    CspE2eGroupConversationType.GROUP_TEXT
                > {
                    public constructor(
                        cspServices: ServicesForTasks,
                        cspReceiver: Group,
                        properties: MessageProperties<
                            GroupMemberContainerEncodable,
                            CspE2eGroupConversationType.GROUP_TEXT
                        >,
                    ) {
                        super(cspServices, cspReceiver, properties);

                        const {messageId, type, encoder, cspMessageFlags} = properties;
                        expect(messageId).to.equal(message.view.id);
                        expect(type).to.equal(CspE2eGroupConversationType.GROUP_TEXT);

                        expect(cspMessageFlags).to.deep.equal({
                            ...CspMessageFlags.forMessageType(MessageType.TEXT),
                            groupMessage: true,
                        });

                        const encodedMessage = encoder.encode(new Uint8Array(encoder.byteLength()));
                        const decodedGroupMemberContainer =
                            structbuf.csp.e2e.GroupMemberContainer.decode(encodedMessage);
                        const {innerData, creatorIdentity, groupId} = decodedGroupMemberContainer;
                        expect(UTF8.decode(creatorIdentity)).to.equal(user.view.identity);
                        expect(groupId).to.equal(receiver.view.groupId);

                        const decodedMessage = structbuf.csp.e2e.Text.decode(innerData);
                        const decodedText = UTF8.decode(decodedMessage.text);
                        expect(decodedText).to.equal(messageText);
                    }
                } as IOutgoingCspMessageTaskConstructor;

            const task = new OutgoingConversationMessageTask(
                services,
                receiver,
                messageStore,
                outgoingCspMessageTaskConstructor,
            );
            await task.run(handle);
        });

        it('should serialize a quote text message', async function () {
            const {model, crypto} = services;
            const receiver = addTestUserAsContact(model, user1).get();
            const {
                message: {
                    view: {id: quotedMessageId},
                },
            } = addOutgoingTestMessageForReceiver(receiver, crypto, 'asdf');
            const {message, messageStore} = addOutgoingTestMessageForReceiver(
                receiver,
                crypto,
                messageText,
                quotedMessageId,
            );

            const outgoingCspMessageTaskConstructor: IOutgoingCspMessageTaskConstructor =
                class extends TestOutgoingCspMessageBaseMock<
                    TextEncodable,
                    Contact,
                    CspE2eConversationType.TEXT
                > {
                    public constructor(
                        cspServices: ServicesForTasks,
                        cspReceiver: Contact,
                        properties: MessageProperties<TextEncodable, CspE2eConversationType.TEXT>,
                    ) {
                        super(cspServices, cspReceiver, properties);

                        const {messageId, type, encoder, cspMessageFlags} = properties;
                        expect(messageId).to.equal(message.view.id);
                        expect(type).to.equal(CspE2eConversationType.TEXT);
                        expect(cspMessageFlags).to.deep.equal(
                            CspMessageFlags.forMessageType(MessageType.TEXT),
                        );

                        const encodedMessage = encoder.encode(new Uint8Array(encoder.byteLength()));
                        const decodedMessage = structbuf.csp.e2e.Text.decode(encodedMessage);
                        const decodedText = UTF8.decode(decodedMessage.text);
                        expect(decodedText).to.equal(
                            serializeQuoteText(quotedMessageId, messageText),
                        );
                    }
                } as IOutgoingCspMessageTaskConstructor;

            const task = new OutgoingConversationMessageTask(
                services,
                receiver,
                messageStore,
                outgoingCspMessageTaskConstructor,
            );
            await task.run(handle);
        });

        it('should mark the message as sent with the reflection date', async function () {
            const {model, crypto} = services;
            const receiver = addTestUserAsContact(model, user1).get();
            const {messageStore} = addOutgoingTestMessageForReceiver(receiver, crypto);
            expect(messageStore.get().view.sentAt).to.be.undefined;

            const reflectionDate = new Date();
            const outgoingCspMessageTaskConstructor: IOutgoingCspMessageTaskConstructor =
                class extends TestOutgoingCspMessageBaseMock<
                    unknown,
                    AnyReceiver,
                    CspE2eConversationType.TEXT
                > {
                    // eslint-disable-next-line @typescript-eslint/require-await
                    public async run(): Promise<Date | undefined> {
                        return reflectionDate;
                    }
                } as IOutgoingCspMessageTaskConstructor;

            const task = new OutgoingConversationMessageTask(
                services,
                receiver,
                messageStore,
                outgoingCspMessageTaskConstructor,
            );
            await task.run(handle);
            expect(messageStore.get().view.sentAt).to.equal(reflectionDate);
        });

        it('should not mark the message as sent when no reflection date was returned', async function () {
            const {model, crypto} = services;
            const receiver = addTestUserAsContact(model, user1).get();
            const {messageStore} = addOutgoingTestMessageForReceiver(receiver, crypto);
            expect(messageStore.get().view.sentAt).to.be.undefined;

            const outgoingCspMessageTaskConstructor: IOutgoingCspMessageTaskConstructor =
                class extends TestOutgoingCspMessageBaseMock<
                    unknown,
                    AnyReceiver,
                    CspE2eConversationType.TEXT
                > {
                    // eslint-disable-next-line @typescript-eslint/require-await
                    public async run(): Promise<Date | undefined> {
                        return undefined;
                    }
                } as IOutgoingCspMessageTaskConstructor;

            const task = new OutgoingConversationMessageTask(
                services,
                receiver,
                messageStore,
                outgoingCspMessageTaskConstructor,
            );
            await task.run(handle);
            expect(messageStore.get().view.sentAt).to.equal(undefined);
        });
    });
}
