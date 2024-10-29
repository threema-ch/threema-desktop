import {expect} from 'chai';

import {ActivityState, VerificationLevel} from '~/common/enum';
import type {Contact} from '~/common/model';
import {PREDEFINED_CONTACTS} from '~/common/model/types/contact';
import {ModelStore} from '~/common/model/utils/model-store';
import {validContactsLookupSteps} from '~/common/network/protocol/task/common/contact-helper';
import {assert} from '~/common/utils/assert';
import {
    addTestUserAsContact,
    addTestUserToFakeDirectory,
    addTestUserToFakeDirectoryPredefinedContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

export function run(): void {
    describe('Valid Contact Lookup', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');
        const unknownUser = makeTestUser('USER0002');

        let services: TestServices;
        let contact: ModelStore<Contact>;

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
            contact = addTestUserAsContact(services.model, anotherUser);
        });

        it('a known contact is returned as such', async function () {
            const lookupOrInitMap = await validContactsLookupSteps(
                services,
                new Set([contact.get().view.identity]),
                services.logging.logger('test.logger'),
            );

            expect(lookupOrInitMap.size).to.eq(1);

            const lookup = lookupOrInitMap.get(contact.get().view.identity);
            expect(lookup, 'Contact should be in map').to.not.be.undefined;

            expect(lookup instanceof ModelStore, 'Contact should be added to the map').to.be.true;

            const cacheEntry = services.volatileProtocolState.getValidContactLookup(
                contact.get().view.identity,
            );
            expect(cacheEntry, 'Contact should be added to cache').to.not.be.undefined;

            expect(cacheEntry?.lookup instanceof ModelStore, 'Contact in cache should be known').to
                .be.true;
        });

        it('an unknown contact is returned as such', async function () {
            addTestUserToFakeDirectory(services.directory, unknownUser);

            const contactOrInitMap = await validContactsLookupSteps(
                services,
                new Set([unknownUser.identity.string]),
                services.logging.logger('test.logger'),
            );

            expect(contactOrInitMap.size).to.eq(1);

            const init = contactOrInitMap.get(unknownUser.identity.string);
            expect(init, 'Contact should be in map').to.not.be.undefined;

            assert(
                !(init instanceof ModelStore || init === 'invalid' || init === 'me'),
                'Contact should be added to the map as InitFragment',
            );

            expect(init?.verificationLevel).to.equal(VerificationLevel.UNVERIFIED);

            const cacheEntry = services.volatileProtocolState.getValidContactLookup(
                unknownUser.identity.string,
            );

            assert(cacheEntry !== undefined, 'Contact should be added to cache');

            assert(
                !(
                    cacheEntry.lookup instanceof ModelStore ||
                    cacheEntry.lookup === 'invalid' ||
                    cacheEntry.lookup === 'me'
                ),
                'Contact should be added to cache as init fragment',
            );

            expect(cacheEntry.lookup.verificationLevel).to.equal(VerificationLevel.UNVERIFIED);
        });
        it('a predefined contact has verification level verified', async function () {
            const support = makeTestUser('*SUPPORT');

            // Hack the public key of support into the directory.
            addTestUserToFakeDirectoryPredefinedContact(
                services.directory,
                support,
                PREDEFINED_CONTACTS['*SUPPORT'].publicKey,
            );

            const contactOrInitMap = await validContactsLookupSteps(
                services,
                new Set([support.identity.string]),
                services.logging.logger('test.logger'),
            );

            expect(contactOrInitMap.size).to.eq(1);

            const init = contactOrInitMap.get(support.identity.string);
            expect(init, 'Contact should be in map').to.not.be.undefined;

            expect(
                !(init instanceof ModelStore || init === 'invalid' || init === 'me'),
                'Contact should be added to the map as InitFragment',
            ).to.be.true;

            const cacheEntry = services.volatileProtocolState.getValidContactLookup(
                support.identity.string,
            );

            assert(cacheEntry !== undefined, 'Contact should be added to cache');

            assert(
                !(
                    cacheEntry.lookup instanceof ModelStore ||
                    cacheEntry.lookup === 'invalid' ||
                    cacheEntry.lookup === 'me'
                ),
                'Contact should be added to cache as init fragment',
            );

            expect(cacheEntry.lookup.verificationLevel).to.equal(VerificationLevel.FULLY_VERIFIED);
        });

        it('an invalid contact should be marked as such', async function () {
            const invalidUser = makeTestUser('INVALID1');

            // Hack the public key of support into the directory.
            addTestUserToFakeDirectory(services.directory, invalidUser, ActivityState.INVALID);

            const contactOrInitMap = await validContactsLookupSteps(
                services,
                new Set([invalidUser.identity.string]),
                services.logging.logger('test.logger'),
            );

            expect(contactOrInitMap.size).to.eq(1);

            const init = contactOrInitMap.get(invalidUser.identity.string);

            expect(init, 'Contact should be in map').to.not.be.undefined;

            expect(init === 'invalid', 'Contact should be added to the map as invalid').to.be.true;

            const cacheEntry = services.volatileProtocolState.getValidContactLookup(
                invalidUser.identity.string,
            );

            assert(cacheEntry !== undefined, 'Contact should be added to cache');

            expect(cacheEntry.lookup).to.eq('invalid');
        });

        it('valid contact lookup steps can be used for multiple identities', async function () {
            const support = makeTestUser('*SUPPORT');

            // Hack the public key of support into the directory.
            addTestUserToFakeDirectoryPredefinedContact(
                services.directory,
                support,
                PREDEFINED_CONTACTS['*SUPPORT'].publicKey,
            );

            const invalidUser = makeTestUser('INVALID1');

            addTestUserToFakeDirectory(services.directory, unknownUser);

            addTestUserToFakeDirectory(services.directory, invalidUser, ActivityState.INVALID);

            const contactOrInitMap = await validContactsLookupSteps(
                services,
                new Set([
                    support.identity.string,
                    unknownUser.identity.string,
                    contact.get().view.identity,
                    invalidUser.identity.string,
                ]),
                services.logging.logger('test.logger'),
            );

            expect(contactOrInitMap.size).to.eq(4);

            const suppportValue = contactOrInitMap.get(support.identity.string);
            expect(suppportValue, 'support should be in map').to.not.be.undefined;

            assert(
                !(
                    suppportValue instanceof ModelStore ||
                    suppportValue === 'invalid' ||
                    suppportValue === 'me'
                ),
                'support contact should be added to the map as InitFragment',
            );

            expect(contactOrInitMap.size).to.eq(4);

            const unknownUserEntry = contactOrInitMap.get(unknownUser.identity.string);
            expect(unknownUserEntry, 'unknown user should be in map').to.not.be.undefined;

            assert(
                !(
                    unknownUserEntry instanceof ModelStore ||
                    unknownUserEntry === 'invalid' ||
                    unknownUserEntry === 'me'
                ),
                'Unknown contact should be added to the map as InitFragment',
            );

            expect(unknownUserEntry?.verificationLevel).to.equal(VerificationLevel.UNVERIFIED);

            const invalidEntry = contactOrInitMap.get(invalidUser.identity.string);
            expect(invalidEntry).to.eq('invalid');

            const contactEntry = contactOrInitMap.get(contact.get().view.identity);

            assert(contactEntry instanceof ModelStore);

            expect(contactEntry.get().view.verificationLevel).to.eq(VerificationLevel.UNVERIFIED);

            const contactCacheEntry = services.volatileProtocolState.getValidContactLookup(
                contact.get().view.identity,
            );
            expect(contactCacheEntry, 'Contact should be added to cache').to.not.be.undefined;

            expect(
                contactCacheEntry?.lookup instanceof ModelStore,
                'Contact in cache should be known',
            ).to.be.true;

            const supportCacheEntry = services.volatileProtocolState.getValidContactLookup(
                support.identity.string,
            );

            assert(supportCacheEntry !== undefined, ' Support xcontact should be added to cache');

            assert(
                !(
                    supportCacheEntry.lookup instanceof ModelStore ||
                    supportCacheEntry.lookup === 'invalid' ||
                    supportCacheEntry.lookup === 'me'
                ),
                'support contact should be added to cache as init fragment',
            );

            expect(supportCacheEntry.lookup.verificationLevel).to.equal(
                VerificationLevel.FULLY_VERIFIED,
            );

            const unknownCacheEntry = services.volatileProtocolState.getValidContactLookup(
                unknownUser.identity.string,
            );

            assert(unknownCacheEntry !== undefined, 'unknown contact should be added to cache');

            assert(
                !(
                    unknownCacheEntry.lookup instanceof ModelStore ||
                    unknownCacheEntry.lookup === 'invalid' ||
                    unknownCacheEntry.lookup === 'me'
                ),
                'unknown contact should be added to cache as init fragment',
            );

            expect(unknownCacheEntry.lookup.verificationLevel).to.equal(
                VerificationLevel.UNVERIFIED,
            );

            const invalidCacheEntry = services.volatileProtocolState.getValidContactLookup(
                invalidUser.identity.string,
            );

            assert(invalidCacheEntry !== undefined, 'invalid contact should be added to cache');

            expect(invalidCacheEntry.lookup).to.eq('invalid');
        });
    });
}
