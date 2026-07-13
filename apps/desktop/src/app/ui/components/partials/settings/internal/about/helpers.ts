import {ensureError} from '@threema/ts-utils/meta/ensure-error';

import {ROUTE_DEFINITIONS, type RouteInstanceFor} from '~/app/routing/routes';
import type {AppServicesForSvelte} from '~/app/types';
import {i18n} from '~/app/ui/i18n';
import {toast} from '~/app/ui/snackbar';
import {saveBlobAsFile} from '~/app/ui/utils/file-sync/helpers';
import {
    clearRtcStatsSessions,
    getRtcStatsSessionDump,
    listRtcStatsSessions,
    type RtcStatsSessionId,
    type RtcStatsSessionInfo,
} from '~/common/dom/webrtc/rtcstats/trace-indexeddb';
import {ReceiverType} from '~/common/enum';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {keys} from '~/common/utils/object';

type PreloadedFilesArray = NonNullable<
    RouteInstanceFor<'main', 'conversation'>['params']['preloadedFiles']
>;

export async function collectLogsAndComposeMessageToSupport(
    services: Pick<AppServicesForSvelte, 'backend' | 'electron' | 'router'>,
    log: Logger,
): Promise<void> {
    try {
        const logFiles = await services.electron.getGzippedLogFiles();

        const preloadedFiles: PreloadedFilesArray = keys(logFiles).flatMap((key) => {
            const bytes = logFiles[key];
            if (bytes === undefined) {
                return [];
            }

            return [
                {
                    bytes,
                    fileName: `desktop-log-${key}.txt.gz`,
                    mediaType: 'application/gzip',
                },
            ];
        });
        if (preloadedFiles.length === 0) {
            throw new Error('No log files available to send to support');
        }

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
                preloadedFiles,
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
            i18n
                .get()
                .t('settings--about.error--send-logs-to-support', 'Failed to send log files.'),
        );
    }
}

/**
 * List the stored rtcstats call statistics sessions (newest first).
 *
 * Failures are logged and result in an empty list.
 */
export async function loadRtcStatsSessions(log: Logger): Promise<readonly RtcStatsSessionInfo[]> {
    try {
        return (await listRtcStatsSessions()).toReversed();
    } catch (error) {
        log.error(
            `Listing call statistics sessions failed: ${extractErrorMessage(
                ensureError(error),
                'short',
            )}`,
        );
        return [];
    }
}

/**
 * Export the rtcstats call statistics session with the specified id as an `RTCStatsDump` JSONL
 * file.
 */
export async function exportRtcStatsSession(
    sessionId: RtcStatsSessionId,
    log: Logger,
): Promise<void> {
    try {
        const dump = await getRtcStatsSessionDump(sessionId);
        // Note: Legitimate session IDs are machine-generated ASCII, but they are read back from
        // the (unencrypted) trace database, so restrict the derived filename to a conservative
        // character set as defense in depth. This also replaces the colons of the ISO timestamp,
        // which are not valid in filenames on all platforms.
        let fileName = '';
        for (const char of sessionId) {
            fileName += /^[a-zA-Z0-9._-]$/u.test(char) ? char : '_';
        }
        saveBlobAsFile(dump, `threema-rtcstats-${fileName}.jsonl`);
    } catch (error) {
        log.error(
            `Exporting call statistics session failed: ${extractErrorMessage(
                ensureError(error),
                'short',
            )}`,
        );
        toast.addSimpleFailure(
            'Failed to export call statistics, see console log for more details.',
        );
    }
}

/** Delete all stored rtcstats call statistics sessions. */
export async function deleteRtcStatsSessions(log: Logger): Promise<void> {
    try {
        await clearRtcStatsSessions();
    } catch (error) {
        log.error(
            `Deleting call statistics sessions failed: ${extractErrorMessage(
                ensureError(error),
                'short',
            )}`,
        );
        toast.addSimpleFailure(
            'Failed to delete call statistics, see console log for more details.',
        );
    }
}
