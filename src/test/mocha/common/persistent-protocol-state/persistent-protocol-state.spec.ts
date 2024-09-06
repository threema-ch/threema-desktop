import {expect} from 'chai';

import {ensureBlobId} from '~/common/network/protocol/blob';
import {assert} from '~/common/utils/assert';
import {TIMER} from '~/common/utils/timer';
import {makeTestServices, makeTestUser, type TestServices} from '~/test/mocha/common/backend-mocks';

export function run(): void {
    describe('PersistentProtocolState', function () {
        const me = makeTestUser('MEMEMEME');
        const you = makeTestUser('YOUYOUYO');
        const him = makeTestUser('HIMHIMHI');
        const her = makeTestUser('HERHERHE');

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function createProfilePicture() {
            const blobId = ensureBlobId(services.crypto.randomBytes(new Uint8Array(16)));

            return {
                type: 'profile-picture',
                blobId,
            } as const;
        }

        let services: TestServices;

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
        });

        it('add to protocol cache', async function () {
            const createdAt = new Date();
            const profilePicture = createProfilePicture();
            services.persistentProtocolState.setLastDistributionUserProfileState(
                you.identity.string,
                profilePicture,
                createdAt,
            );

            await TIMER.sleep(200);

            services.persistentProtocolState.setLastDistributionUserProfileState(
                him.identity.string,
                createProfilePicture(),
                new Date(),
            );

            const youDistr = services.persistentProtocolState.getLastDistributedUserProfileState(
                you.identity.string,
            );

            const himDistr = services.persistentProtocolState.getLastDistributedUserProfileState(
                him.identity.string,
            );

            assert(youDistr?.type === 'profile-picture');
            assert(himDistr?.type === 'profile-picture');

            expect(profilePicture.blobId).byteEqual(youDistr.blobId as unknown as Uint8Array);
            expect(profilePicture.blobId).to.not.byteEqual(
                himDistr.blobId as unknown as Uint8Array,
            );

            expect(
                services.persistentProtocolState.getLastDistributedUserProfileState(
                    her.identity.string,
                ),
            ).to.be.undefined;
        });

        it('expired protocol values are not returned', function () {
            const createdAt = new Date(2016);
            const profilePicture = createProfilePicture();
            services.persistentProtocolState.setLastDistributionUserProfileState(
                you.identity.string,
                profilePicture,
                createdAt,
            );

            const youDistr = services.persistentProtocolState.getLastDistributedUserProfileState(
                you.identity.string,
            );

            expect(youDistr).to.be.undefined;
        });

        it('overwrite cache value if already existing', async function () {
            const createdAt = new Date();
            const profilePicture = createProfilePicture();
            services.persistentProtocolState.setLastDistributionUserProfileState(
                you.identity.string,
                profilePicture,
                createdAt,
            );

            await TIMER.sleep(200);

            const newProfilePicture = createProfilePicture();

            services.persistentProtocolState.setLastDistributionUserProfileState(
                you.identity.string,
                newProfilePicture,
                new Date(),
            );

            const youDistr = services.persistentProtocolState.getLastDistributedUserProfileState(
                you.identity.string,
            );

            assert(youDistr?.type === 'profile-picture');

            expect(newProfilePicture.blobId).byteEqual(youDistr.blobId as unknown as Uint8Array);
        });
    });
}
