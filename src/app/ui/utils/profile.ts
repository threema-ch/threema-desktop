import type {AppServicesForSvelte} from '~/app/types';

/**
 * Unlink and restart the application creating a snapshot of the messages.
 */
export async function unlinkAndCreateBackup(
    services: Pick<AppServicesForSvelte, 'backend'>,
): Promise<void> {
    // First, unlink from mediator
    await services.backend.connectionManager.selfKickFromMediator();

    // Then, request deletion of profile directory and app restart
    window.app.deleteProfileAndRestartApp({createBackup: true});
}
