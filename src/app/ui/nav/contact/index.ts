import {
    type VerificationLevel,
    type VerificationLevelColors,
} from '#3sc/components/threema/VerificationDots';
import {type ContactData, type ReceiverBadgeType} from '#3sc/types';
import {
    type ReceiverNotificationPolicy,
    transformNotificationPolicyFromContact,
} from '~/app/ui/generic/receiver';
import {type PublicKey} from '~/common/crypto';
import {type DbReceiverLookup} from '~/common/db';
import {
    AcquaintanceLevel,
    IdentityType,
    ReceiverType,
    VerificationLevel as NumericVerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {
    type Avatar,
    type Contact,
    type ContactView,
    type RemoteModelFor,
    type Settings,
} from '~/common/model';
import {getFullName} from '~/common/model/contact';
import {type RemoteModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';
import {type Remote} from '~/common/utils/endpoint';
import {type IQueryableStore, DeprecatedDerivedStore, WritableStore} from '~/common/utils/store';
import {localeSort} from '~/common/utils/string';
import {type ContactListItemViewModel} from '~/common/viewmodel/contact-list-item';

/**
 * Transformed data necessary to display a contact in several places in the UI.
 */
export type TransformedContact = ContactData & {
    readonly lookup: DbReceiverLookup;
    readonly isNew: boolean;
    readonly identity: string;
    readonly publicKey: PublicKey;
    readonly nickname: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly displayName: string;
    readonly initials: string;
    readonly verificationLevel: VerificationLevel;
    readonly verificationLevelColors: VerificationLevelColors;
    readonly notifications: ReceiverNotificationPolicy;
    readonly activityState: 'active' | 'inactive' | 'invalid';
};

/**
 * Stores necessary to display a conversation preview.
 */
export interface ContactPreviewStores {
    /**
     * Avatar of the receiver.
     */
    readonly avatar: RemoteModelStore<Avatar>;
}

/**
 * Contact list filter/search term (if any).
 */
export const contactListFilter = new WritableStore('');

/**
 * Return whether the {@link contactView} matches the {@link filter}.
 *
 * @deprecated use {@link matchesContactSearchFilter} instead.
 */
function deprecatedMatchesSearchFilter(
    filter: string,
    contactView: Readonly<ContactView>,
): boolean {
    if (filter.trim() === '') {
        return true;
    }
    return [contactView.firstName, contactView.lastName, contactView.identity, contactView.nickname]
        .join(' ')
        .toLowerCase()
        .includes(filter.trim().toLowerCase());
}

/**
 * Return whether the {@link contactView} matches the {@link filter}.
 */
export function matchesContactSearchFilter(
    filter: string,
    contact: Pick<ContactListItemViewModel, 'firstName' | 'lastName' | 'identity' | 'nickname'>,
): boolean {
    const trimmedFilter = filter.trim();
    if (trimmedFilter === '') {
        return true;
    }
    return [contact.firstName, contact.lastName, contact.identity, contact.nickname]
        .join(' ')
        .toLowerCase()
        .includes(trimmedFilter.toLowerCase());
}

/**
 * Filters and sorts delivered contacts by display name.
 *
 * If the filter is set to an empty string, then no filtering will be done. See
 * {@link deprecatedMatchesSearchFilter} for filtering logic.
 */
export function filterContacts(
    set: ReadonlySet<RemoteModelStore<Contact>>,
    filter: string,
): IQueryableStore<readonly RemoteModelStore<Contact>[]> {
    return new DeprecatedDerivedStore([...set.values()], (item) =>
        [...item]
            .filter(
                ([, {view}]) =>
                    view.acquaintanceLevel !== AcquaintanceLevel.GROUP &&
                    deprecatedMatchesSearchFilter(filter, view),
            )
            // Sort by display name
            .sort(([, {view: a}], [, {view: b}]) => localeSort(a.displayName, b.displayName))
            .map(([store]) => store),
    );
}

export async function getStores(contact: RemoteModelFor<Contact>): Promise<ContactPreviewStores> {
    const {controller} = contact;
    const [avatar] = await Promise.all([controller.avatar()]);
    return {
        avatar,
    };
}

/**
 * Return the transformed verification level and color information.
 */
export function transformContactVerificationLevel(
    contact: RemoteModelFor<Contact>,
): Pick<TransformedContact, 'verificationLevel' | 'verificationLevelColors'> {
    // Determine verification level
    let verificationLevel: TransformedContact['verificationLevel'];
    switch (contact.view.verificationLevel) {
        case NumericVerificationLevel.UNVERIFIED:
            verificationLevel = 'unverified';
            break;
        case NumericVerificationLevel.SERVER_VERIFIED:
            verificationLevel = 'server-verified';
            break;
        case NumericVerificationLevel.FULLY_VERIFIED:
            verificationLevel = 'fully-verified';
            break;
        default:
            unreachable(contact.view.verificationLevel);
    }

    // Determine verification level colors
    let verificationLevelColors: TransformedContact['verificationLevelColors'];
    switch (contact.view.workVerificationLevel) {
        case WorkVerificationLevel.NONE:
            verificationLevelColors = 'default';
            break;
        case WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED:
            verificationLevelColors = 'shared-work-subscription';
            break;
        default:
            unreachable(contact.view.workVerificationLevel);
    }

    return {verificationLevel, verificationLevelColors};
}

export async function transformContact(
    settings: Remote<Settings>,
    contact: RemoteModelFor<Contact>,
): Promise<TransformedContact> {
    // Determine badge type.
    //
    // Note: We only display contact badges when the identity type differs from our own identity
    //       type (i.e. the build variant).
    let badge: ReceiverBadgeType | undefined;
    switch (contact.view.identityType) {
        case IdentityType.REGULAR:
            badge = import.meta.env.BUILD_VARIANT !== 'consumer' ? 'contact-consumer' : undefined;
            break;
        case IdentityType.WORK:
            badge = import.meta.env.BUILD_VARIANT !== 'work' ? 'contact-work' : undefined;
            break;
        default:
            unreachable(contact.view.identityType);
    }

    // Determine activity state
    let activityState: TransformedContact['activityState'];
    switch (contact.view.activityState) {
        case 0:
            activityState = 'active';
            break;
        case 1:
            activityState = 'inactive';
            break;
        case 2:
            activityState = 'invalid';
            break;
        default:
            unreachable(contact.view.activityState);
    }

    // TODO(WEBMD-381): Determine whether contact is a new contact
    const isNew = Math.random() < 0.5;

    // Determine verification level
    const {verificationLevel, verificationLevelColors} = transformContactVerificationLevel(contact);

    return {
        lookup: {
            type: ReceiverType.CONTACT,
            uid: contact.ctx,
        },
        identity: contact.view.identity,
        publicKey: contact.view.publicKey,
        isNew,
        badge,
        nickname: contact.view.nickname.trim(),
        firstName: contact.view.firstName,
        lastName: contact.view.lastName,
        fullName: getFullName(contact.view),
        displayName: contact.view.displayName,
        initials: contact.view.initials,
        blocked: await settings.contactIsBlocked(contact.view.identity),
        notifications: transformNotificationPolicyFromContact(contact.view),
        verificationLevel,
        verificationLevelColors,
        activityState,
    };
}

export function showFullNameAndNickname(
    contact: Pick<ContactListItemViewModel, 'fullName' | 'nickname'>,
): boolean {
    return contact.fullName.length > 0 && contact.nickname.length > 0;
}
