import {expect} from 'chai';

import type {ServicesForBackend} from '~/common/backend';
import {
    CspE2eGroupControlType,
    CspPayloadType,
    D2mPayloadType,
    GroupUserState,
} from '~/common/enum';
import type {Contact, ContactInit} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {IncomingGroupLeaveTask} from '~/common/network/protocol/task/csp/incoming-group-leave';
import {ReflectedIncomingGroupLeaveTask} from '~/common/network/protocol/task/d2d/reflected-incoming-group-leave';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import {
    ensureMessageId,
    type GroupId,
    type IdentityString,
    type MessageId,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {Delayed} from '~/common/utils/delayed';
import {assertCspPayloadType, assertD2mPayloadType} from '~/test/mocha/common/assertions';
import {
    addTestGroup,
    addTestUserAsContact,
    makeContactInit,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestHandle,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';
import {
    assertGroupHasMembers,
    decodeMessageEncodable,
    decryptContainer,
    reflectContactSync,
} from '~/test/mocha/common/network/protocol/task/task-test-helpers';

/**
 * Generic tests for the incoming (not outgoing!) group leave message, both CSP and D2D.
 */
export function groupLeaveTests(
    this: Mocha.Suite,
    me: IdentityString,
    user1: TestUser,
    user2: TestUser,
    mode: 'csp' | 'd2d',
): void {
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

    it('if the sender is the creator of the group, discard', async function () {
        const {crypto, model} = services;

        // Prepare sender contact
        const senderContactOrInit =
            mode === 'csp' ? makeContactInit(user1) : addTestUserAsContact(model, user1);

        // Run task
        const groupId = randomGroupId(crypto);
        const creatorIdentity = user1.identity.string;
        const expectations: NetworkExpectation[] = [
            // The message is invalid (group creator may not send a leave message), so the
            // message should be dropped.
        ];
        await runTask(services, groupId, creatorIdentity, senderContactOrInit, expectations, mode);
    });

    it('if the group cannot be found and we are the creator, discard', async function () {
        const {crypto, model} = services;

        // Prepare sender contact
        const senderContactOrInit =
            mode === 'csp' ? makeContactInit(user1) : addTestUserAsContact(model, user1);

        // Run task
        const groupId = randomGroupId(crypto);
        const creatorIdentity = me;
        const expectations: NetworkExpectation[] = [
            // We cannot find the group but are supposedly the creator, so the message should be
            // dropped.
        ];
        await runTask(services, groupId, creatorIdentity, senderContactOrInit, expectations, mode);
    });

    it('if the group cannot be found and we are not the creator, send a group sync request if leader', async function () {
        const {crypto, device, model} = services;

        // Prepare sender (user1) contact
        const senderContactOrInit =
            mode === 'csp' ? makeContactInit(user1) : addTestUserAsContact(model, user1);

        // Add creator (user2) contact
        const creator = user2;
        addTestUserAsContact(model, creator);

        // This promise will be resolved with the message ID that will be used later for the
        // outgoing message ack.
        const groupSyncRequestMessageId = Delayed.simple<MessageId>(
            'Message ID not yet ready',
            'Message ID already set',
        );

        // Determine expectations
        const expectations: NetworkExpectation[] =
            mode === 'd2d'
                ? []
                : [
                      // Reflect outgoing group sync request
                      NetworkExpectationFactory.reflectSingle((payload) => {
                          expect(payload.content).to.equal('outgoingMessage');
                          expect(payload.outgoingMessage?.type).to.equal(
                              CspE2eGroupControlType.GROUP_SYNC_REQUEST,
                          );
                      }),
                      // Send a CSP group sync request
                      NetworkExpectationFactory.write((m) => {
                          assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
                          assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);
                          const message = decodeMessageEncodable(m.payload.payload);
                          expect(message.senderIdentity).to.eql(UTF8.encode(me));
                          expect(message.receiverIdentity).to.eql(creator.identity.bytes);
                          const messageContainer = decryptContainer(
                              message,
                              device.csp.ck.public,
                              user2.ck,
                          );
                          expect(messageContainer.type).to.equal(
                              CspE2eGroupControlType.GROUP_SYNC_REQUEST,
                          );
                          groupSyncRequestMessageId.set(ensureMessageId(message.messageId));
                      }),
                      // Expect a CSP ack for this message
                      NetworkExpectationFactory.readIncomingMessageAck(
                          creator.identity.string,
                          groupSyncRequestMessageId,
                      ),
                  ];

        // Run task
        const groupId = randomGroupId(crypto);
        await runTask(
            services,
            groupId,
            creator.identity.string,
            senderContactOrInit,
            expectations,
            mode,
        );
    });

    if (mode === 'csp') {
        it('if group can be found but user is unknown, create it', async function () {
            const {crypto, model} = services;

            // Sender (user1) contact init
            const sender = user1;
            const senderContactInit = makeContactInit(sender);

            // Add member (user2) contact
            const member = user2;
            const memberContact = addTestUserAsContact(model, member);

            // Add group
            const groupId = randomGroupId(crypto);
            const creator = me;
            addTestGroup(model, {
                groupId,
                creator: 'me',
                userState: GroupUserState.MEMBER,
                members: [memberContact],
            });

            // Ensure that sender contact does not yet exist
            expect(
                model.contacts.getByIdentity(sender.identity.string),
                'Sender contact unexpectedly found',
            ).to.be.undefined;

            // Run task: Leave from user1
            await runTask(
                services,
                groupId,
                creator,
                senderContactInit,
                [...reflectContactSync(sender, 'create')],
                mode,
                'Leave from unknown user',
            );

            // Ensure that sender contact was created
            expect(model.contacts.getByIdentity(sender.identity.string), 'Sender contact not found')
                .not.to.be.undefined;
        });
    }

    it('remove member from local group if present', async function () {
        const {crypto, model} = services;

        // Add member sender (user1) contact
        const member = user1;
        const memberContact = addTestUserAsContact(model, member);

        // Add non-member sender (user2) contact
        const nonmember = user2;
        const nonmemberContact = addTestUserAsContact(model, nonmember);

        // Add group
        const groupId = randomGroupId(crypto);
        const creator = me;
        addTestGroup(model, {
            groupId,
            creator: 'me',
            name: 'Chüngelizüchter Pfäffikon',
            userState: GroupUserState.MEMBER,
            members: [memberContact],
        });

        // Ensure that user1 is member of the group
        assertGroupHasMembers(services, groupId, {creatorIsUser: true}, [member.identity.string]);

        // Run task: Leave from member
        await runTask(services, groupId, creator, memberContact, [], mode, 'Leave from member');

        // Ensure that group member was removed
        assertGroupHasMembers(services, groupId, {creatorIsUser: true}, []);

        // Run task: Leave from non-member
        await runTask(
            services,
            groupId,
            creator,
            nonmemberContact,
            [],
            mode,
            'Leave from non-member',
        );

        // No changes to member list
        assertGroupHasMembers(services, groupId, {creatorIsUser: true}, []);
    });
}

/**
 * Run the incoming group leave task (CSP or D2D).
 *
 * The group member container will be created automatically.
 *
 * When running the test, the specified expectations will be verified.
 */
async function runTask(
    services: ServicesForBackend,
    groupId: GroupId,
    creatorIdentity: IdentityString,
    senderContactOrInit: LocalModelStore<Contact> | ContactInit,
    expectations: NetworkExpectation[],
    mode: 'csp' | 'd2d',
    description?: string,
): Promise<void> {
    const container: GroupMemberContainer.Type = {
        groupId,
        creatorIdentity,
        innerData: new Uint8Array(0),
    };
    const messageId = randomMessageId(services.crypto);

    // Run task
    let task;
    if (mode === 'csp') {
        task = new IncomingGroupLeaveTask(
            services,
            messageId,
            senderContactOrInit,
            container,
            new Date(),
        );
    } else {
        assert(senderContactOrInit instanceof LocalModelStore, 'Sender must be a contact');
        task = new ReflectedIncomingGroupLeaveTask(
            services,
            messageId,
            senderContactOrInit,
            container,
            new Date(),
        );
    }
    const handle = new TestHandle(services, expectations);
    await task.run(handle);
    let message = 'Not all expectations consumed';
    if (description !== undefined) {
        message += `: ${description}`;
    }
    expect(expectations, message).to.be.empty;
    handle.finish();
}
