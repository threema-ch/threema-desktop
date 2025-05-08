import type {AppServicesForSvelte} from '~/app/types';

/**
 * Unlink and restart the application creating a snapshot of the messages.
 */
export async function unlinkAndCreateBackup(
    services: Pick<AppServicesForSvelte, 'backend' | 'electron'>,
): Promise<void> {
    // First, unlink from mediator.
    return await services.backend.connectionManager.selfKickFromMediator().then(() => {
        // Then, request deletion of profile directory and app restart.
        services.electron.deleteProfileAndRestartApp({createBackup: true});
    });
}
