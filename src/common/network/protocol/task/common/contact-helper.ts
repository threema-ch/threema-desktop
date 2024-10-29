import {
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {ProtocolError} from '~/common/error';
import type {Logger} from '~/common/logging';
import {
    isPredefinedContact,
    isSpecialContact,
    PREDEFINED_CONTACTS,
    type Contact,
    type ContactInit,
    type ContactInitFragment,
    type PredefinedContactIdentity,
} from '~/common/model/types/contact';
import {ModelStore} from '~/common/model/utils/model-store';
import {DirectoryError, type IdentityData} from '~/common/network/protocol/directory';
import type {ServicesForTasks} from '~/common/network/protocol/task';
import {WorkError, type WorkContacts} from '~/common/network/protocol/work';
import type {IdentityString} from '~/common/network/types';
import {assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
import {byteEquals} from '~/common/utils/byte';
import {idColorIndex} from '~/common/utils/id-color';

export type ContactOrInitMapValue = ModelStore<Contact> | ContactInitFragment | 'me' | 'invalid';

// When the contact does not exist yet, the caller must decide for the nickname and the acquaintance
// level. That's why we only put a `ContactOrInitFragment` into the map.
type ContactOrInitMap = Map<IdentityString, ContactOrInitMapValue>;

export async function validContactsLookupSteps(
    services: Pick<
        ServicesForTasks,
        'device' | 'directory' | 'model' | 'systemDialog' | 'volatileProtocolState' | 'work'
    >,
    lookupIdentities: Set<IdentityString>,
    log: Logger,
): Promise<ContactOrInitMap> {
    const {device, model} = services;
    const contactOrInitMap: ContactOrInitMap = new Map();
    const unknownIdentities = new Set<IdentityString>();

    // 4.  For each `identity` of `identities`:
    for (const identity of lookupIdentities) {
        /**
         * 4.1. If `identity` equals the user's Threema ID, add the information
         * that the _contact is the user_ to the `contact-or-inits` map and
         * abort these sub-steps.
         */
        if (identity === device.identity.string) {
            contactOrInitMap.set(identity, 'me');
            continue;
        }

        /**
         * 4.2. If `identity` is a _Special Contact_, add that special contact to the
         * `contact-or-inits` map and abort these sub-steps.
         */
        if (isSpecialContact(identity)) {
            contactOrInitMap.set(
                identity,
                await model.contacts.getOrCreatePredefinedContact(identity),
            );
            continue;
        }

        /**
         * 4.3. Lookup the contact associated to `identity` and let `contact` be the
         * result.
         */
        const contact = model.contacts.getByIdentity(identity);

        /**
         * 4.4 If `contact` is defined, add `contact` to the `contact-or-inits` map
         * and abort these sub-steps.
         */
        if (contact !== undefined) {
            contactOrInitMap.set(
                identity,
                contact.get().view.activityState === ActivityState.INVALID ? 'invalid' : contact,
            );
            continue;
        }

        // 4.5 Lookup the properties to create a contact from associated to identity from the
        // contact lookup cache and let init be the result.
        const init = services.volatileProtocolState.getValidContactLookup(identity);
        if (init !== undefined) {
            // 4.6 If init is defined, add init to the contact-or-inits map and abort these
            // sub-steps.
            contactOrInitMap.set(identity, init.lookup);
            continue;
        }

        // 4.7 Add identity to unknown-identities.
        unknownIdentities.add(identity);
    }

    if (unknownIdentities.size > 0) {
        // 5.  Let `directory-response` be the response of asynchronously looking up
        //     `unknown-identities` on the Directory Server.
        let directoryResponse: Map<IdentityString, IdentityData>;
        try {
            directoryResponse = await services.directory.identities([...unknownIdentities]);
        } catch (error) {
            if (error instanceof DirectoryError) {
                if (error.type === 'rate-limit-exceeded') {
                    log.error('fetch-work API rate limit exceeded, disconnecting.');
                    throw new ProtocolError(
                        'csp',
                        'Rate limit of directory identity API exceeded',
                        {
                            type: 'recoverable-on-reconnect',
                            disconnectForMs: 10000,
                        },
                    );
                }
            }
            throw error;
        }

        // 6. If work build, let `work-directory-response` be the response of asynchronously looking up
        //     `unknown-identities` on the Work Contacts API endpoint.
        let workDirectoryResponse: WorkContacts | undefined = undefined;
        if (import.meta.env.BUILD_VARIANT === 'work') {
            const workCredentials = unwrap(services.device.workData?.get().workCredentials);
            try {
                workDirectoryResponse = await services.work.contacts(workCredentials, [
                    ...unknownIdentities,
                ]);
            } catch (error) {
                if (!(error instanceof WorkError)) {
                    throw error;
                }
                switch (error.type) {
                    case 'invalid-credentials':
                        log.debug('Invalid work credentials when fetching work contacts.');
                        await services.systemDialog
                            .openOnce({
                                type: 'invalid-work-credentials',
                                context: {
                                    workCredentials,
                                },
                            })
                            .catch(assertUnreachable);
                        throw error;
                    case 'rate-limit-exceeded':
                        log.error('fetch-work API rate limit exceeded, disconnecting.');
                        throw new ProtocolError('csp', 'Rate limit of work contacts API exceeded', {
                            type: 'recoverable-on-reconnect',
                            disconnectForMs: 10000,
                        });
                    case 'invalid-response':
                    case 'non-work-build':
                    case 'fetch':
                        log.error(
                            'An errror ocurred when looking up identities on the work server:',
                            error,
                        );
                        throw error;
                    default:
                        unreachable(error.type);
                }
            }
        }

        // 8. Process the result of `directory-response`:
        for (const [identity, identityData] of directoryResponse.entries()) {
            // 8.4.1 Remove the contact from `unknown-identities`. If it was not present in
            // `unknown-identities`, log a warning and abort these sub-steps.
            if (!unknownIdentities.delete(identity)) {
                log.warn('Identity fetched from directory server was not in unknown identity set');
                continue;
            }

            // 8.4.2 If the contact is marked as invalid (never existed or has been revoked), add
            // the information that the contact is invalid to the contact-or-inits map and abort
            // these sub-steps
            if (identityData.state === ActivityState.INVALID) {
                contactOrInitMap.set(identity, 'invalid');
                continue;
            }

            // 8.4.3 If the contact is a Predefined Contact:
            if (isPredefinedContact(identity)) {
                // This is necessary so that `identity` can be used as accessor without cast.
                const predefinedContactIdentity: PredefinedContactIdentity = identity;
                // 8.4.3.1 If the contact's public key does not equal the _Predefined Contact_s
                // public key, log a warning and exceptionally abort these steps.
                const pk = PREDEFINED_CONTACTS[predefinedContactIdentity].publicKey;

                if (!byteEquals(pk, identityData.publicKey)) {
                    throw new Error(
                        'The public keys of a predefined contact does not match what was fetched from the directory server',
                    );
                }
                contactOrInitMap.set(
                    identity,
                    getContactInitFragment(identityData, VerificationLevel.FULLY_VERIFIED),
                );
            } else {
                contactOrInitMap.set(identity, getContactInitFragment(identityData));
            }
        }

        // 8.5 For each identity of unknown-identities:
        for (const unknowIdentity of unknownIdentities) {
            // 8.5.1 Add the information that the contact is invalid to the contact-or-inits map for
            // identity.
            contactOrInitMap.set(unknowIdentity, 'invalid');
        }

        if (workDirectoryResponse !== undefined) {
            // 9.5 For each work-contact of the result
            for (const workContact of workDirectoryResponse.contacts) {
                const mapEntry = contactOrInitMap.get(workContact.id);
                if (mapEntry === undefined) {
                    log.warn(
                        `Contact fetched by work API with identity ${workContact.id} was not fetched from directory server`,
                    );
                    continue;
                }
                // The former two can never happen since we lookup `unknown-identities`. We ignore
                // invalid entries (can happen in rare cases).
                if (mapEntry instanceof ModelStore || mapEntry === 'me' || mapEntry === 'invalid') {
                    continue;
                }

                // 9.5.2 If work-contact's public key does not equal contact-or-init's public key, log a
                // warning and exceptionally abort these steps.
                if (!byteEquals(workContact.pk, mapEntry.publicKey)) {
                    throw new Error(
                        'The public keys of a predefined contact does not match what was fetched from the work server',
                    );
                }

                // 9.5.3 Update the contact entry for work-contact's identity in contact-or-inits
                contactOrInitMap.set(workContact.id, {
                    ...mapEntry,
                    verificationLevel: VerificationLevel.SERVER_VERIFIED,
                    workVerificationLevel: WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED,
                    firstName: workContact.first ?? mapEntry.firstName,
                    lastName: workContact.last ?? mapEntry.lastName,
                });
            }
        }
    }

    // Nothing to do for step 11, since `verification_level` and `work_subscription_level` are
    // already set to their corresponding values when creating the init fragments.

    // 12. Update the contact lookup cache with the contents of contact-or-inits. Each newly added
    //     or updated entry has an expiration time of 10m after which the entry is to be removed
    //     from the cache.
    for (const [identity, contactLookup] of contactOrInitMap.entries()) {
        if (contactLookup === 'me' || contactLookup instanceof ModelStore) {
            continue;
        }
        services.volatileProtocolState.setValidContactLookup(identity, contactLookup, new Date());
    }

    return contactOrInitMap;
}

/**
 * Fetch identity data for the specified identity string and return a {@link ContactInit}.
 *
 * @returns the {@link ContactInit} object, or `invalid` if contact is invalid or has been
 *   revoked
 * @throws {DirectoryError} if directory fetch failed.
 */
function getContactInitFragment(
    identityData: IdentityData,
    verificationLevel?: VerificationLevel,
): Omit<ContactInit, 'nickname' | 'acquaintanceLevel'> | 'invalid' {
    if (identityData.state === ActivityState.INVALID) {
        return 'invalid';
    }

    return {
        identity: identityData.identity,
        publicKey: identityData.publicKey,
        firstName: '',
        lastName: '',
        colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity: identityData.identity}),
        createdAt: new Date(),
        verificationLevel: verificationLevel ?? VerificationLevel.UNVERIFIED,
        workVerificationLevel: WorkVerificationLevel.NONE,
        identityType: identityData.type,
        featureMask: identityData.featureMask,
        syncState: SyncState.INITIAL,
        activityState: identityData.state ?? ActivityState.ACTIVE,
        category: ConversationCategory.DEFAULT,
        visibility: ConversationVisibility.SHOW,
    };
}
