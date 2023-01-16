import {type ServicesForBackend} from '~/common/backend';
import {type SafeBackupData, type SafeGroup} from '~/common/dom/safe';
import {
    ConversationCategory,
    ConversationVisibility,
    GroupUserState,
    ReceiverType,
} from '~/common/enum';
import {SafeError} from '~/common/error';
import {groupDebugString} from '~/common/model/group';
import {ensureGroupId, ensureIdentityString, isIdentityString} from '~/common/network/types';
import {idColorIndex} from '~/common/utils/id-color';
import {hexLeToU64, unixTimestampToDateMs} from '~/common/utils/number';

/**
 * Imports all {@link SafeGroup}s in a {@link SafeBackupData} and saves them to the database.
 */
export class SafeGroupImporter {
    private readonly _log;
    private readonly _model;
    private readonly _device;

    public constructor(services: Pick<ServicesForBackend, 'logging' | 'model' | 'device'>) {
        this._log = services.logging.logger('backend.safe-group-importer');
        this._model = services.model;
        this._device = services.device;
    }

    /**
     * Import all groups in a {@link SafeBackupData} and save them to the database.
     *
     * @throws {@link SafeError} on unrecoverable import errors.
     */
    public importFrom(backupData: SafeBackupData): void {
        this._log.info(`Importing ${backupData.groups.length} groups from backup`);
        try {
            if (backupData.groups.length > 0) {
                this._importGroups(backupData.groups);
            }
        } catch (error) {
            if (error instanceof SafeError) {
                throw error;
            }

            throw new SafeError('import', 'Unknown unrecoverable safe group import error', {
                from: error,
            });
        }
    }

    private _importGroups(groups: readonly SafeGroup[]): void {
        for (const group of groups) {
            this._importGroup(group);
        }
    }

    /**
     * Import a {@link SafeGroup} and save them to the database.
     *
     * @throws {@link SafeError} on unrecoverable import errors.
     */
    private _importGroup(group: SafeGroup): void {
        const creatorIdentity = ensureIdentityString(group.creator);
        const groupId = ensureGroupId(hexLeToU64(group.id));
        const debugString = groupDebugString(creatorIdentity, groupId);
        this._log.debug(`Importing group ${debugString}`, {group});

        // Collect member UIDs. We assume that all contacts must have been imported in the safe
        // contact import step. A missing contact is treated as an invalid group.
        const memberUids = [];
        if (!group.deleted) {
            for (const member of group.members) {
                if (!isIdentityString(member)) {
                    throw new SafeError(
                        'import',
                        `Group ${debugString} could not be imported, member ${member} is not a valid identity string`,
                    );
                }
                if (member === this._device.identity.string) {
                    // Our own identity must not be part of the members list
                    continue;
                }
                const contact = this._model.contacts.getByIdentity(member);
                if (contact === undefined) {
                    throw new SafeError(
                        'import',
                        `Group ${debugString} could not be imported, member ${member} not found in database`,
                    );
                }
                memberUids.push(contact.ctx);
            }
        }

        // Explicitly add creator to members list
        // TODO(DESK-558): Remove this
        if (
            group.creator !== this._device.identity.string &&
            !group.members.includes(group.creator)
        ) {
            const creator = this._model.contacts.getByIdentity(ensureIdentityString(group.creator));
            if (creator === undefined) {
                throw new SafeError(
                    'import',
                    `Group ${debugString} could not be imported, creator ${group.creator} not found in database`,
                );
            }
            memberUids.push(creator.ctx);
        }

        // Determine timestamps
        const createdAt =
            group.createdAt !== undefined ? unixTimestampToDateMs(group.createdAt) : new Date();
        const lastUpdate =
            group.lastUpdate !== undefined ? unixTimestampToDateMs(group.lastUpdate) : createdAt;

        // Add group
        this._model.groups.add.fromSync(
            {
                groupId,
                creatorIdentity,
                createdAt,
                lastUpdate,
                name: group.groupname ?? '',
                colorIndex: idColorIndex({type: ReceiverType.GROUP, creatorIdentity, groupId}),
                userState: group.members.includes(this._device.identity.string)
                    ? GroupUserState.MEMBER
                    : GroupUserState.LEFT,
                notificationTriggerPolicyOverride: undefined,
                notificationSoundPolicyOverride: undefined,
                category:
                    group.private === true
                        ? ConversationCategory.PROTECTED
                        : ConversationCategory.DEFAULT,
                visibility: ConversationVisibility.SHOW,
            },
            memberUids,
        );
        this._log.debug(`Group ${debugString} successfully imported`);
    }
}
