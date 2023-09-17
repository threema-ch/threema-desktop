import type {Logger} from '~/common/logging';
import type * as protobuf from '~/common/network/protobuf';
import type {validate} from '~/common/network/protobuf';
import * as d2d from '~/common/network/protobuf/validate/d2d';
import {
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task/';
import type {D2mDeviceId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';
import {filterUndefinedProperties} from '~/common/utils/object';

/**
 * Process reflected SettingsSync messages with updated settings.
 */
export class ReflectedSettingsSyncTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;
    private readonly _senderDeviceIdString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _unvalidatedMessage: protobuf.d2d.SettingsSync,
        senderDeviceId: D2mDeviceId,
    ) {
        this._log = _services.logging.logger(`network.protocol.task.reflected-settings-sync-task`);
        this._senderDeviceIdString = u64ToHexLe(senderDeviceId);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        // Validate the Protobuf message
        let validatedMessage;
        try {
            validatedMessage = d2d.SettingsSync.SCHEMA.parse(this._unvalidatedMessage);
        } catch (error) {
            this._log.error(
                `Discarding reflected SettingsSync message from ${this._senderDeviceIdString} due to validation error: ${error}`,
            );
            return;
        }

        this._log.info(
            `Received reflected SettingsSync message from ${this._senderDeviceIdString}`,
        );

        this._processPrivacySettings(validatedMessage.update.settings);
        this._processCallsSettings(validatedMessage.update.settings);
    }

    private _processPrivacySettings(settingsUpdate: validate.sync.Settings.Type): void {
        const {
            contactSyncPolicy,
            unknownContactPolicy,
            readReceiptPolicy,
            typingIndicatorPolicy,
            screenshotPolicy,
            keyboardDataCollectionPolicy,
            blockedIdentities,
            excludeFromSyncIdentities,
        } = settingsUpdate;
        this._services.model.user.privacySettings.get().controller.update(
            filterUndefinedProperties({
                contactSyncPolicy,
                unknownContactPolicy,
                readReceiptPolicy,
                typingIndicatorPolicy,
                screenshotPolicy,
                keyboardDataCollectionPolicy,
                blockedIdentities,
                excludeFromSyncIdentities,
            } as const),
        );
    }

    private _processCallsSettings(settingsUpdate: validate.sync.Settings.Type): void {
        const {callPolicy, callConnectionPolicy} = settingsUpdate;
        this._services.model.user.callsSettings.get().controller.update(
            filterUndefinedProperties({
                callPolicy,
                callConnectionPolicy,
            } as const),
        );
    }
}
