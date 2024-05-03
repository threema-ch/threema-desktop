import {expect} from 'chai';

import type {ServicesForBackend} from '~/common/backend';
import {
    AcquaintanceLevel,
    ActivityState,
    CspE2eGroupControlType,
    GroupUserState,
    NonceScope,
    TransactionScope,
} from '~/common/enum';
import * as protobuf from '~/common/network/protobuf';
import {IncomingGroupSetupTask} from '~/common/network/protocol/task/csp/incoming-group-setup';
import {ReflectedIncomingGroupSetupTask} from '~/common/network/protocol/task/d2d/reflected-incoming-group-setup';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import type {GroupCreatorContainer, GroupSetup} from '~/common/network/structbuf/validate/csp/e2e';
import type {GroupId, IdentityString} from '~/common/network/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';
import {
    addTestGroup,
    addTestUserAsContact,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    registerTestUser,
    TestHandle,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';
import {secondsAgo} from '~/test/mocha/common/utils';

/**
 * Reflect an incoming group setup message.
 */
const reflectIncomingSetup = NetworkExpectationFactory.reflectSingle((payload) => {
    expect(payload.content).to.equal('incomingMessage');
    assert(
        payload.incomingMessage !== undefined && payload.incomingMessage !== null,
        'incomingMessage not defined',
    );
    expect(payload.incomingMessage.type).to.equal(CspE2eGroupControlType.GROUP_SETUP);
});

/**
 * Generic tests for the incoming (not outgoing!) group setup message, both CSP and D2D.
 */
export function groupSetupTests(
    this: Mocha.Suite,
    me: IdentityString,
    user1: TestUser,
    user2: TestUser,
    user3: TestUser,
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

    it('process group-setup for a new group', async function () {
        const {crypto, directory, model} = services;

        // User 1 is creator, user 2 is member
        const creator = user1;
        const member = user2;

        // Add creator to the database
        addTestUserAsContact(model, creator);

        // Register member in the directory
        registerTestUser(directory, member);

        // For D2D, member must already exist
        if (mode === 'd2d') {
            addTestUserAsContact(model, member);
        }

        // Create group setup message. Members: user1, user2, me
        const groupId = randomGroupId(crypto);
        const groupSetup: GroupSetup.Type = {
            members: [member.identity.string, me],
        };

        // Run task
        const expectations: NetworkExpectation[] =
            mode === 'd2d'
                ? []
                : [
                      // User 2 will be created and synchronized in a transaction
                      NetworkExpectationFactory.startTransaction(0, TransactionScope.CONTACT_SYNC),
                      NetworkExpectationFactory.reflectSingle((payload) => {
                          expect(payload.content).to.equal('contactSync');
                          const createdContact = payload.contactSync?.create?.contact;
                          assert(
                              createdContact !== undefined && createdContact !== null,
                              'Reflected contact sync does not contain creation payload',
                          );
                          expect(createdContact.identity).to.equal(member.identity.string);
                      }),

                      // Then the group will be reflected
                      reflectIncomingSetup,
                  ];
        const now = new Date();
        const reflectedAt = secondsAgo(13);
        await runTask(
            services,
            groupId,
            creator.identity.string,
            groupSetup,
            expectations,
            mode,
            reflectedAt,
        );

        // Ensure group was created
        const group = services.model.groups.getByGroupIdAndCreator(groupId, {
            creatorIsUser: false,
            creatorIdentity: creator.identity.string,
        });
        assert(group !== undefined, 'Group was not created');
        const view = group.get().view;
        expect(view.members).to.have.members([member.identity.string]);
        expect(view.name).to.be.empty;
        expect(view.userState, 'userState').to.equal(GroupUserState.MEMBER);
        expect(view.notificationTriggerPolicyOverride).to.be.undefined;
        expect(view.notificationSoundPolicyOverride).to.be.undefined;

        // CSP: Ensure created contact has acquaintance level "GROUP"
        if (mode === 'csp') {
            const memberModel = model.contacts.getByIdentity(member.identity.string);
            assert(memberModel !== undefined, 'User not found');
            expect(memberModel.get().view.acquaintanceLevel).to.equal(AcquaintanceLevel.GROUP);
        }

        // Ensure creation date is set correctly
        switch (mode) {
            case 'csp':
                expect(view.createdAt).to.be.greaterThanOrEqual(now);
                break;
            case 'd2d':
                expect(view.createdAt).to.eql(reflectedAt);
                break;
            default:
                unreachable(mode);
        }
    });

    it('handle duplicate IDs, creator-as-member and revoked contacts', async function () {
        const {crypto, directory, model} = services;

        const creator = user1;

        // Add creator and user 2 to the database
        addTestUserAsContact(model, creator);
        addTestUserAsContact(model, user2);

        // Register user 3 in the directory as invalid
        registerTestUser(directory, {...user3, activityState: ActivityState.INVALID});

        // Create group setup message. It has the following issues:
        // - Creator is listed as member (should not be the case)
        // - User 2 identity is duplicated
        // - User 3 is revoked
        const groupId = randomGroupId(crypto);
        const groupSetup: GroupSetup.Type = {
            members: [
                creator.identity.string, // Should not be part of member list
                user2.identity.string,
                user3.identity.string, // Revoked identity
                me,
                user2.identity.string, // Duplicate
                me, // Duplicate
            ],
        };

        // Run task
        const reflectedAt = secondsAgo(3);
        const expectations = mode === 'd2d' ? [] : [reflectIncomingSetup];
        await runTask(
            services,
            groupId,
            creator.identity.string,
            groupSetup,
            expectations,
            mode,
            reflectedAt,
        );

        // Ensure group was created successfully (but without user 3)
        const group = services.model.groups.getByGroupIdAndCreator(groupId, {
            creatorIsUser: false,
            creatorIdentity: creator.identity.string,
        });
        assert(group !== undefined, 'Group was not created');
        const view = group.get().view;
        expect(view.members).to.have.members([user2.identity.string]);
        expect(view.name).to.be.empty;
        expect(view.userState).to.equal(GroupUserState.MEMBER);
        expect(view.notificationTriggerPolicyOverride).to.be.undefined;
        expect(view.notificationSoundPolicyOverride).to.be.undefined;
        if (mode === 'd2d') {
            expect(view.createdAt).to.eql(reflectedAt);
        }
    });

    it('process group-setup for an existing group', async function () {
        const {crypto, model} = services;

        // User 1 is creator, user 2 is future member
        const creator = user1;
        const member = user2;

        // Add users to the database
        const creatorModel = addTestUserAsContact(model, creator);
        addTestUserAsContact(model, member);

        // Timestamps
        const groupCreatedAt = secondsAgo(37);
        const reflectedAt = secondsAgo(7);

        // Create existing group, without user 2 as member
        const groupId = randomGroupId(crypto);
        const group = addTestGroup(model, {
            groupId,
            creatorIdentity: creator.identity.string,
            userState: GroupUserState.MEMBER,
            createdAt: groupCreatedAt,
            members: [creatorModel.ctx],
        });

        // Create group setup message. Members: user1, user2, me
        const groupSetup: GroupSetup.Type = {
            members: [member.identity.string, me],
        };

        // Run task
        const expectations = mode === 'd2d' ? [] : [reflectIncomingSetup];
        await runTask(
            services,
            groupId,
            creator.identity.string,
            groupSetup,
            expectations,
            mode,
            reflectedAt,
        );

        // Ensure group was updated to include the additional member
        const view = group.get().view;
        expect(view.members).to.have.members([member.identity.string]);
        expect(view.userState).to.equal(GroupUserState.MEMBER);

        // Group creation date should not change
        expect(view.createdAt).to.deep.equal(groupCreatedAt);
    });

    it('handle being removed from a group', async function () {
        const {crypto, model} = services;

        const creator = user1;
        const member = user2;

        // Add users to the database
        const creatorModel = addTestUserAsContact(model, creator);
        const memberModel = addTestUserAsContact(model, member);

        // Timestamps
        const groupCreatedAt = secondsAgo(37);
        const reflectedAt = secondsAgo(7);

        // Create group in database
        const groupId = randomGroupId(crypto);
        const group = addTestGroup(model, {
            groupId,
            creatorIdentity: creator.identity.string,
            userState: GroupUserState.MEMBER,
            createdAt: groupCreatedAt,
            members: [creatorModel.ctx, memberModel.ctx],
        });

        // Create group setup message with empty member list (we were kicked)
        const groupSetup: GroupSetup.Type = {
            members: [],
        };

        // Run task
        const expectations = mode === 'd2d' ? [] : [reflectIncomingSetup];
        await runTask(
            services,
            groupId,
            creator.identity.string,
            groupSetup,
            expectations,
            mode,
            reflectedAt,
        );

        // Ensure group was updated, we should not be part of the group anymore, but the member
        // list should not be modified
        const view = group.get().view;
        expect(view.members).to.have.members([member.identity.string]);
        expect(view.userState).to.equal(GroupUserState.KICKED);

        // Group creation date should not change
        expect(view.createdAt).to.deep.equal(groupCreatedAt);
    });

    it('handle being re-added to a group', async function () {
        const {crypto, model} = services;

        const creator = user1;
        const member = user2;

        // Add users to the database
        const creatorModel = addTestUserAsContact(model, creator);
        addTestUserAsContact(model, member);

        // Timestamps
        const groupCreatedAt = secondsAgo(37);
        const reflectedAt = secondsAgo(7);

        // Create group in database
        const groupId = randomGroupId(crypto);
        const group = addTestGroup(model, {
            groupId,
            creatorIdentity: creator.identity.string,
            userState: GroupUserState.LEFT,
            createdAt: groupCreatedAt,
            members: [creatorModel.ctx],
        });

        // Create group setup message where both we and user 2 are members
        const groupSetup: GroupSetup.Type = {
            members: [member.identity.string, me],
        };

        // Run task
        const expectations = mode === 'd2d' ? [] : [reflectIncomingSetup];
        await runTask(
            services,
            groupId,
            creator.identity.string,
            groupSetup,
            expectations,
            mode,
            reflectedAt,
        );

        // Ensure group was updated, we should be part of the group again and the member list
        // should include user 2 as well
        const view = group.get().view;
        expect(view.members).to.have.members([member.identity.string]);
        expect(view.userState).to.equal(GroupUserState.MEMBER);

        // Group creation date should not change
        expect(view.createdAt).to.deep.equal(groupCreatedAt);
    });
}

/**
 * Run the incoming group setup task (CSP or D2D) with the specified {@link groupSetup} message.
 *
 * The group creator container will be created automatically.
 *
 * When running the test, the specified expectations will be verified.
 */
async function runTask(
    services: ServicesForBackend,
    groupId: GroupId,
    senderIdentity: IdentityString,
    groupSetup: GroupSetup.Type,
    expectations: NetworkExpectation[],
    mode: 'csp' | 'd2d',
    reflectedAt?: Date,
): Promise<void> {
    const container: GroupCreatorContainer.Type = {
        groupId,
        innerData: new Uint8Array(0),
    };
    const messageId = randomMessageId(services.crypto);
    const nonceGuard = services.nonces.getRandomNonce(NonceScope.CSP);

    const reflectIncomingGroupSetup = protobuf.utils.creator(protobuf.d2d.IncomingMessage, {
        type: CspE2eGroupControlType.GROUP_SETUP,
        createdAt: intoUnsignedLong(dateToUnixTimestampMs(new Date())),
        body: new Uint8Array([0x42, 0x42, 0x42]), // Fake data is OK for testing
        senderIdentity,
        messageId: intoUnsignedLong(randomMessageId(services.crypto)),
        nonce: nonceGuard.nonce as Uint8Array,
    });
    nonceGuard.commit();

    // Run task
    const task =
        mode === 'csp'
            ? new IncomingGroupSetupTask(
                  services,
                  messageId,
                  senderIdentity,
                  container,
                  groupSetup,
                  reflectIncomingGroupSetup,
              )
            : new ReflectedIncomingGroupSetupTask(
                  services,
                  messageId,
                  senderIdentity,
                  unwrap(reflectedAt, 'reflectedAt not set for D2D message'),
                  container,
                  groupSetup,
              );
    const handle = new TestHandle(services, expectations);
    await task.run(handle);
    handle.finish();
}
