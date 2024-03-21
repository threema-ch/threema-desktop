import type {AppServices} from '~/app/types';

/**
 * Unlink and delete the device data and restart the application.
 */
export async function resetProfile(services: AppServices): Promise<void> {
    // First, unlink from mediator
    await services.backend.selfKickFromMediator();

    const ipc = window.app;

    // Then, request deletion of profile directory and app restart
    ipc.deleteProfileAndRestartApp();
}
