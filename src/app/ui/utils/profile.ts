import type {AppServices} from '~/app/types';

/**
 * Unlink and delete the device data and restart the application.
 */
export async function resetProfile(services: AppServices): Promise<void> {
    // First, unlink from mediator
    await services.backend.selfKickFromMediator();

    // Then, request deletion of profile directory and app restart
    window.app.deleteProfileAndRestartApp({createBackup: true});
}
