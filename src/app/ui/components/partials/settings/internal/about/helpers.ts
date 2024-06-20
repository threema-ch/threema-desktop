import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {AppServicesForSvelte} from '~/app/types';
import {toast} from '~/app/ui/snackbar';
import {ReceiverType} from '~/common/enum';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {ensureError} from '~/common/utils/assert';

export async function collectLogsAndComposeMessageToSupport(
    services: Pick<AppServicesForSvelte, 'backend' | 'router'>,
    log: Logger,
): Promise<void> {
    try {
        const logFiles = await window.app.getGzippedLogFiles();
        const supportContact = await services.backend.viewModel
            .settings()
            .then(
                async (viewModelBundle) =>
                    await viewModelBundle.viewModelController.getOrCreatePredefinedContact(
                        '*SUPPORT',
                    ),
            );
        services.router.goToConversation(
            {
                receiverLookup: {
                    type: ReceiverType.CONTACT,
                    uid: supportContact.ctx,
                },
                preloadedFiles: [
                    {
                        bytes: logFiles.app,
                        fileName: 'desktop-log-app.txt.gz',
                        mediaType: 'application/gzip',
                    },
                    {
                        bytes: logFiles.bw,
                        fileName: 'desktop-log-bw.txt.gz',
                        mediaType: 'application/gzip',
                    },
                ],
            },
            {
                nav: ROUTE_DEFINITIONS.nav.conversationList.withoutParams(),
            },
        );
    } catch (error) {
        log.error(
            `Sending logs to support was unsuccessful: ${extractErrorMessage(
                ensureError(error),
                'short',
            )}`,
        );
        toast.addSimpleFailure(
            `Failed to send log files to support, see console log for more details.`,
        );
    }
}
