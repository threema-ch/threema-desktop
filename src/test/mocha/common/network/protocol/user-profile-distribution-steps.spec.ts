import {expect} from 'chai';

import {NACL_CONSTANTS} from '~/common/crypto';
import type {Contact, Group} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import {BLOB_ID_LENGTH, ensureBlobId, type BlobId} from '~/common/network/protocol/blob';
import {profilePictureDistributionSteps} from '~/common/network/protocol/task/common/user-profile-distribution';
import {wrapRawBlobKey, type RawBlobKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {
    addTestGroup,
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

export function run(): void {
    describe('User Profile Distribution', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');
        const thirdUser = makeTestUser('USER0002');

        let services: TestServices;
        let contact: ModelStore<Contact>;
        let contact2: ModelStore<Contact>;

        let blob: Uint8Array;
        let blobId: BlobId;
        let key: RawBlobKey;
        let lastUploadedAt: Date;

        let group: ModelStore<Group>;

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
            // Add a profile picture
            blob = new Uint8Array([1, 2, 3, 4]);
            blobId = ensureBlobId(new Uint8Array(BLOB_ID_LENGTH));
            key = wrapRawBlobKey(
                services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
            );
            lastUploadedAt = new Date();

            services.model.user.profileSettings.get().controller.update({
                profilePicture: {
                    blob,
                    blobId,
                    key,
                    lastUploadedAt,
                },
            });
            contact = addTestUserAsContact(services.model, anotherUser);
            contact2 = addTestUserAsContact(services.model, thirdUser);
            group = addTestGroup(services.model, {
                creator: 'me',
                members: [contact, contact2],
                createdAt: new Date(),
            });
        });

        it('add single contact to receiver list of profile picture set message', async function () {
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(distributionResult.set.blobId, 'The blob IDs of must match').to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'The keys must match',
            ).to.byteEqual(key.unwrap() as Uint8Array);

            const protocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolState?.type === 'profile-picture');
            expect(
                protocolState.blobId,
                'The most recent blob ID should be in the persistent protocol cache',
            ).to.byteEqual(blobId as ReadonlyUint8Array as Uint8Array);
        });

        it('add multiple contact to receiver list of profile picture set message', async function () {
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([...group.get().view.members].map((member) => member.get())),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'Two contacts should receive a profile picture',
            ).to.eq(2);
            expect(distributionResult.set.blobId, 'The blob ID must match').to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts]).to.have.members(
                [...group.get().view.members].map((m) => m.get()),
            );

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'The keys must match',
            ).to.byteEqual(key.unwrap() as Uint8Array);

            const protocolStateContact1 =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolStateContact1?.type === 'profile-picture');
            expect(
                protocolStateContact1.blobId,
                `The most recent blob ID should be in the persistent protocol cache with an entry corresponding to ${contact.get().view.identity}`,
            ).to.byteEqual(blobId as ReadonlyUint8Array as Uint8Array);

            const protocolStateContact2 =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact2.get().view.identity,
                );

            assert(protocolStateContact2?.type === 'profile-picture');
            expect(
                protocolStateContact2.blobId,
                `The most recent blob ID should be in the persistent protocol cache with an entry corresponding to ${contact2.get().view.identity}`,
            ).to.byteEqual(blobId as ReadonlyUint8Array as Uint8Array);
        });

        it('remove the profile picture of a contact that is not on the allow list', async function () {
            services.model.user.profileSettings.get().controller.update({
                profilePictureShareWith: {
                    group: 'allowList',
                    allowList: [contact2.get().view.identity],
                },
            });

            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([...group.get().view.members].map((member) => member.get())),
            );

            assert(distributionResult.set !== undefined);
            assert(distributionResult.remove !== undefined);
            expect(
                distributionResult.remove.size,
                'The user profile picture should be removed at for contact',
            ).to.eq(1);
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(distributionResult.set.blobId).to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts]).to.have.members([contact2.get()]);
            expect(
                [...distributionResult.remove],
                `${contact.get().view.identity} should receive a remove profile picture signal because they are not on the allow list`,
            ).to.have.members([contact.get()]);

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'The keys must match',
            ).to.byteEqual(key.unwrap() as Uint8Array);

            const protocolStateContact1 =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(
                protocolStateContact1?.type === 'removed',
                'Profile picture should have a remove mark in the cache',
            );

            const protocolStateContact2 =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact2.get().view.identity,
                );

            assert(protocolStateContact2?.type === 'profile-picture');
            expect(protocolStateContact2.blobId).to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );
        });

        it('upload the profile picture if it is older than 7 days', async function () {
            lastUploadedAt = new Date(2024, 0, 1);

            services.model.user.profileSettings.get().controller.update({
                profilePicture: {
                    blob,
                    blobId,
                    key,
                    lastUploadedAt,
                },
            });
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(
                distributionResult.set.blobId,
                'A new profile picture was uploaded, the blobId must not match',
            ).to.not.byteEqual(blobId as ReadonlyUint8Array as Uint8Array);

            expect([...distributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'A new profile picture was uploaded, the keys must not match',
            ).to.not.byteEqual(key.unwrap() as Uint8Array);

            const protocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolState?.type === 'profile-picture');
            expect(
                protocolState.blobId,
                'The blobId in the cache must match the blob ID of the most recently uploaded profile picture',
            ).to.byteEqual(distributionResult.set.blobId as ReadonlyUint8Array as Uint8Array);
        });

        it('do not send the same profile picture to the same contact twice within 7 days', async function () {
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(distributionResult.set.blobId).to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'The keys must match since no new profile picture was uploaded',
            ).to.byteEqual(key.unwrap() as Uint8Array);

            const protocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolState?.type === 'profile-picture');

            expect(
                protocolState.blobId,
                'The blobId in the cache must match the blob ID of the most recently uploaded profile picture',
            ).to.byteEqual(distributionResult.set.blobId as ReadonlyUint8Array as Uint8Array);

            const repeatedDistributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            const laterProtocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(laterProtocolState?.type === 'profile-picture');

            expect(repeatedDistributionResult.remove).to.be.undefined;
            expect(
                repeatedDistributionResult.set,
                'Dont set the profile picture again if it was recently distributed to the contact',
            ).to.be.undefined;
            expect(
                protocolState.blobId as ReadonlyUint8Array as Uint8Array,
                'The blobId in the cache must still match the blob ID of the most recently uploaded profile picture',
            ).to.byteEqual(laterProtocolState.blobId as ReadonlyUint8Array as Uint8Array);
        });
        it('send if the cached entry is stale but dont upload it since the profile picture itself is not', async function () {
            services.persistentProtocolState.setLastUserProfileDistributionState(
                contact.get().view.identity,
                {blobId, type: 'profile-picture'},
                new Date(2024, 1, 0),
            );
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(distributionResult.set.blobId).to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'The keys must not match',
            ).to.byteEqual(key.unwrap() as Uint8Array);

            const protocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolState?.type === 'profile-picture');

            expect(
                protocolState.blobId,
                'The blobId in the cache must match the blob ID of the most recently uploaded profile picture',
            ).to.byteEqual(distributionResult.set.blobId as ReadonlyUint8Array as Uint8Array);
        });
        it('send and upload because profile picture and cache is stale', async function () {
            services.model.user.profileSettings.get().controller.update({
                profilePicture: {
                    blob,
                    blobId,
                    key,
                    lastUploadedAt: new Date(2024, 0, 1),
                },
            });
            services.persistentProtocolState.setLastUserProfileDistributionState(
                contact.get().view.identity,
                {blobId, type: 'profile-picture'},
                new Date(2024, 1, 0),
            );
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(distributionResult.set.blobId).to.not.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'A new key must have been generated since a new profile picture version was uploaded',
            ).to.not.byteEqual(key.unwrap() as Uint8Array);

            const protocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolState?.type === 'profile-picture');

            expect(
                protocolState.blobId,
                'The blobId in the cache must match the blob ID of the most recently uploaded profile picture',
            ).to.byteEqual(distributionResult.set.blobId as ReadonlyUint8Array as Uint8Array);
        });

        it('send and upload profile picture because the profile picture was changed', async function () {
            const distributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(distributionResult.set !== undefined);
            expect(distributionResult.remove).to.be.undefined;
            expect(
                distributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(distributionResult.set.blobId).to.byteEqual(
                blobId as ReadonlyUint8Array as Uint8Array,
            );

            expect([...distributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                distributionResult.set.key.unwrap() as Uint8Array,
                'The keys must be the same',
            ).to.byteEqual(key.unwrap() as Uint8Array);

            expect(
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                )?.type,
            ).to.eq('profile-picture');

            services.model.user.profileSettings.get().controller.update({
                profilePicture: {
                    blob: new Uint8Array([3, 4, 9, 9]),
                    blobId: ensureBlobId(
                        services.crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH)),
                    ),
                    key: wrapRawBlobKey(
                        services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                    ),
                    lastUploadedAt: new Date(),
                },
            });

            const newDistributionResult = await profilePictureDistributionSteps(
                services,
                true,
                new Set<Contact>([contact.get()]),
            );

            assert(newDistributionResult.set !== undefined);
            expect(newDistributionResult.remove).to.be.undefined;
            expect(
                newDistributionResult.set.contacts.size,
                'One contact should receive a profile picture',
            ).to.eq(1);
            expect(
                newDistributionResult.set.blobId,
                'A new profile picture was set, a new blobId must have been generated',
            ).to.not.byteEqual(blobId as ReadonlyUint8Array as Uint8Array);

            expect([...newDistributionResult.set.contacts][0]).to.deep.eq(contact.get());

            expect(
                newDistributionResult.set.key.unwrap() as Uint8Array,
                'A new key must have been generated because a new profile picture was set',
            ).to.not.byteEqual(key.unwrap() as Uint8Array);

            const protocolState =
                services.persistentProtocolState.getLastUserProfileDistributionState(
                    contact.get().view.identity,
                );

            assert(protocolState?.type === 'profile-picture');

            expect(
                protocolState.blobId,
                'The blobId in the cache must match the blob ID of the most recently uploaded profile picture',
            ).to.byteEqual(newDistributionResult.set.blobId as ReadonlyUint8Array as Uint8Array);

            expect(
                services.model.user.profileSettings.get().view.profilePicture?.blob,
                'The profile picture in the user model must match the most recently set profile picture',
            ).to.byteEqual(new Uint8Array([3, 4, 9, 9]));
        });
    });
}
