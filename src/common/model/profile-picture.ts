import {
    type DbContact,
    type DbContactUid,
    type DbGroup,
    type DbGroupUid,
    type DbReceiverLookup,
    type DbUpdate,
} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {
    type ProfilePicture,
    type ProfilePictureController,
    type ProfilePictureSource,
    type ProfilePictureUpdate,
    type ProfilePictureView,
    type ServicesForModel,
} from '~/common/model';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {hasProperty} from '~/common/utils/object';

/**
 * Return the appropriate profile picture for this contact.
 *
 * Precedence:
 *
 * 1. Contact-defined profile picture
 * 2. If Gateway-ID: Gateway-defined profile picture
 * 3. If Non-Gateway-ID: User-defined profile picture
 *
 * See section "Contact Profile Picture Precedence" in the protocol description.
 */
export function chooseContactProfilePicture(
    contact: Pick<
        DbContact,
        | 'identity'
        | 'profilePictureContactDefined'
        | 'profilePictureGatewayDefined'
        | 'profilePictureUserDefined'
    >,
): ReadonlyUint8Array | undefined {
    if (contact.profilePictureContactDefined !== undefined) {
        return contact.profilePictureContactDefined;
    }
    if (contact.identity.startsWith('*') && contact.profilePictureGatewayDefined !== undefined) {
        return contact.profilePictureGatewayDefined;
    }
    if (!contact.identity.startsWith('*') && contact.profilePictureUserDefined !== undefined) {
        return contact.profilePictureUserDefined;
    }
    return undefined;
}

/**
 * Update contact profile picture in the database.
 */
function updateContactProfilePicture(
    services: ServicesForModel,
    contactUid: DbContactUid,
    change: Pick<
        DbContact,
        | 'profilePictureContactDefined'
        | 'profilePictureGatewayDefined'
        | 'profilePictureUserDefined'
    >,
): void {
    const {db} = services;
    const dbChange: DbUpdate<DbContact> = {
        uid: contactUid,
    };
    if (hasProperty(change, 'profilePictureContactDefined')) {
        dbChange.profilePictureContactDefined = change.profilePictureContactDefined;
    }
    if (hasProperty(change, 'profilePictureGatewayDefined')) {
        dbChange.profilePictureGatewayDefined = change.profilePictureGatewayDefined;
    }
    if (hasProperty(change, 'profilePictureUserDefined')) {
        dbChange.profilePictureUserDefined = change.profilePictureUserDefined;
    }
    db.updateContact(dbChange);
}

/**
 * Update group profile picture in the database.
 */
function updateGroupProfilePicture(
    services: ServicesForModel,
    contactUid: DbGroupUid,
    profilePictureAdminDefined: ReadonlyUint8Array | undefined,
): void {
    const {db} = services;
    const dbChange: DbUpdate<DbGroup> = {
        uid: contactUid,
        profilePictureAdminDefined,
    };
    db.updateGroup(dbChange);
}

export class ProfilePictureModelController implements ProfilePictureController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<ProfilePictureView>();

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _receiver: DbReceiverLookup,
    ) {
        switch (_receiver.type) {
            case ReceiverType.CONTACT:
                this._log = _services.logging.logger(
                    `model.contact.${_receiver.uid}.profile-picture`,
                );
                break;
            case ReceiverType.GROUP:
                this._log = _services.logging.logger(
                    `model.group.${_receiver.uid}.profile-picture`,
                );
                break;
            case ReceiverType.DISTRIBUTION_LIST:
                this._log = _services.logging.logger(
                    `model.distribution-list.${_receiver.uid}.profile-picture`,
                );
                break;
            default:
                unreachable(_receiver);
        }
    }

    public update(change: ProfilePictureUpdate): void {
        this.meta.update(() => {
            throw new Error('TODO'); // TODO(WEBMD-231)
        });
    }

    /**
     * Update the profile picture from a certain `source`.
     */
    public setPicture(bytes: ReadonlyUint8Array | undefined, source: ProfilePictureSource): void {
        this.meta.update((view) => {
            // Update database
            switch (this._receiver.type) {
                case ReceiverType.CONTACT: {
                    let change;
                    switch (source) {
                        case 'contact-defined':
                            change = {profilePictureContactDefined: bytes};
                            break;
                        case 'gateway-defined':
                            change = {profilePictureGatewayDefined: bytes};
                            break;
                        case 'user-defined':
                            change = {profilePictureUserDefined: bytes};
                            break;
                        case 'admin-defined':
                            throw new Error(
                                `Cannot set admin-defined profile picture for a contact!`,
                            );
                        default:
                            unreachable(source);
                    }
                    updateContactProfilePicture(this._services, this._receiver.uid, change);
                    break;
                }
                case ReceiverType.GROUP:
                    assert(
                        source === 'admin-defined',
                        `Cannot set ${source} profile picture for a group!`,
                    );
                    updateGroupProfilePicture(this._services, this._receiver.uid, bytes);
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    assert(
                        source === 'user-defined',
                        `Cannot set ${source} profile picture for a distribution list!`,
                    );
                    break;
                default:
                    unreachable(this._receiver);
            }

            // Update view
            this._log.debug(`Updated ${source} profile picture`);
            return {...view, picture: this._loadProfilePicture()};
        });
    }

    /**
     * Load the appropriate profile picture bytes from the database.
     */
    private _loadProfilePicture(): ReadonlyUint8Array | undefined {
        const {db} = this._services;
        switch (this._receiver.type) {
            case ReceiverType.CONTACT: {
                const contact = db.getContactByUid(this._receiver.uid);
                return contact === undefined ? undefined : chooseContactProfilePicture(contact);
            }
            case ReceiverType.GROUP:
                return db.getGroupByUid(this._receiver.uid)?.profilePictureAdminDefined;
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(WEBMD-236): Implement distribution lists');
            default:
                return unreachable(this._receiver);
        }
    }
}

export class ProfilePictureModelStore extends LocalModelStore<ProfilePicture> {
    public constructor(
        services: ServicesForModel,
        receiver: DbReceiverLookup,
        profilePicture: ProfilePictureView,
    ) {
        const {logging} = services;
        const tag = 'profile-picture';
        super(
            profilePicture,
            new ProfilePictureModelController(services, receiver),
            undefined,
            undefined,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
