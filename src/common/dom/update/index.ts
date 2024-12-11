import * as v from '@badrap/valita';

import type {EarlyBackendServicesThatDontRequireConfig} from '~/common/backend';
import {STATIC_CONFIG} from '~/common/config';
import {adapter} from '~/common/dom/streams';
import type {Logger} from '~/common/logging';
import {isNodeError} from '~/common/node/utils';
import type {f64} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

import {
    determineAppIdentifier,
    determineInstallerName,
    isBuildFlavor,
} from '../../../../config/base';

const UPDATE_INFO_SCHEMA = v
    .object({
        latestVersion: v
            .object({
                version: v.string(),
                versionCode: v.number(),
            })
            .rest(v.unknown()),
    })
    .rest(v.unknown());

export type UpdateInfo = Pick<
    v.Infer<typeof UPDATE_INFO_SCHEMA>['latestVersion'],
    'version' | 'versionCode'
>;

export class Updater {
    protected readonly _log: Logger;

    public constructor(
        protected readonly _services: Pick<
            EarlyBackendServicesThatDontRequireConfig,
            'launcher' | 'logging' | 'systemDialog' | 'systemInfo' | 'tempFile'
        >,
    ) {
        this._log = _services.logging.logger(`updater`);
    }

    /**
     * Performs an update check and facilitates the update procedure if the user choses to do so,
     * and the OS supports auto-updates.
     */
    public async checkAndPerformUpdate({
        forceManualUpdate,
    }: {
        /**
         * Whether to always force the manual update dialog if an update is available and never
         * offer to auto-update, even if it would be supported on the respective OS.
         */
        forceManualUpdate: boolean;
    }): Promise<void> {
        const updateInfo = await this._check();
        if (updateInfo === undefined) {
            // Nothing to update.
            return;
        }

        // Show an update system dialog for platforms which don't support auto-updating.
        if (forceManualUpdate || process.platform === 'linux') {
            await this._services.systemDialog.open({
                type: 'manual-app-update',
                context: {
                    currentVersion: import.meta.env.BUILD_VERSION,
                    latestVersion: updateInfo.version,
                    systemInfo: {
                        arch: this._services.systemInfo.arch,
                        locale: this._services.systemInfo.locale,
                        os: this._services.systemInfo.os,
                    },
                },
            });
            return;
        }

        const promptDialogHandle = await this._services.systemDialog.open({
            type: 'auto-app-update-prompt',
            context: {
                currentVersion: import.meta.env.BUILD_VERSION,
                latestVersion: updateInfo.version,
            },
        });
        const promptAction = await promptDialogHandle.closed;
        switch (promptAction) {
            case 'confirmed':
                // Update was accepted. Continue update process.
                break;

            case 'dismissed':
                // Update was declined. Nothing more to do.
                return;

            default:
                unreachable(promptAction);
        }

        // Try download once until it's successful or the user chooses to stop.
        let retry = false;
        do {
            try {
                // Clear existing update subfolder before downloading any new files.
                await this._services.tempFile.clear('update');

                // Show auto update progress dialog.
                const downloadDialogHandle = await this._services.systemDialog.open({
                    type: 'auto-app-update-download',
                    context: {
                        latestVersion: updateInfo.version,
                    },
                });
                // eslint-disable-next-line func-style
                const onProgress = async (progress: f64): Promise<void> => {
                    // Only update up to 99% to use the last percent for the preparation step.
                    await downloadDialogHandle.setProgress(progress * 0.99);
                };

                await this._download(updateInfo, onProgress).catch((error: unknown) => {
                    throw new Error(`Download failed: ${error}`);
                });
                this._log.info(`Update ${updateInfo.version} was successfully downloaded`);

                await downloadDialogHandle.setProgress(1);
                await downloadDialogHandle.closed;
                await this._services.launcher.restartAndInstallUpdate();
            } catch (error) {
                this._log.error(`Auto-update failed: ${error}`);
                await this._services.systemDialog.closeAll();

                const errorDialogHandle = await this._services.systemDialog.open({
                    type: 'auto-app-update-failed',
                });
                const errorAction = await errorDialogHandle.closed;
                switch (errorAction) {
                    case 'confirmed':
                        // Retry was accepted. Continue retry loop.
                        retry = true;
                        continue;

                    case 'dismissed':
                        // Retry was declined. Nothing more to do.
                        break;

                    default:
                        unreachable(errorAction);
                }
            }
            retry = false;
        } while (retry);
    }

    /**
     * Fetch `UPDATE_SERVER_URL` to check whether an update is available, and download and validate
     * {@link UpdateInfo}.
     *
     * @returns `UpdateInfo` if an update is available, else `undefined`.
     */
    private async _check(): Promise<UpdateInfo | undefined> {
        if (this._services.systemInfo.os === 'other') {
            this._log.warn('Cannot check for updates: Unsupported OS');
            return undefined;
        }

        // Fetch update info JSON.
        let response: Response;
        try {
            response = await fetch(
                new URL(
                    `latest-version-${import.meta.env.BUILD_VARIANT}-${this._services.systemInfo.os}.json`,
                    STATIC_CONFIG.UPDATE_SERVER_URL,
                ),
                {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    headers: {
                        'user-agent': STATIC_CONFIG.USER_AGENT,
                        'accept': 'application/json',
                    },
                },
            );
        } catch (error) {
            this._log.error(`Update check request failed: ${error}`);
            return undefined;
        }

        // Continue only if response status is ok.
        if (response.status !== 200) {
            this._log.error(
                `Update check request returned HTTP ${response.status} (${response.statusText})`,
            );
            return undefined;
        }

        // Parse `UpdateInfo` from response.
        let updateInfo: UpdateInfo;
        try {
            const data = (await response.json()) as unknown;
            updateInfo = UPDATE_INFO_SCHEMA.parse(data).latestVersion;
        } catch (error) {
            this._log.error(`Could not parse update info JSON: ${error}`);
            return undefined;
        }

        // Return update info only if an update is available.
        if (updateInfo.versionCode > import.meta.env.BUILD_VERSION_CODE) {
            return updateInfo;
        }
        return undefined;
    }

    /**
     * Download the update with the version equal to the one in the provided {@link UpdateInfo}.
     */
    private async _download(
        updateInfo: UpdateInfo,
        onProgress?: (progress: f64) => Promise<void>,
    ): Promise<void> {
        const buildFlavor =
            `${import.meta.env.BUILD_VARIANT}-${import.meta.env.BUILD_ENVIRONMENT}` as const;
        if (!isBuildFlavor(buildFlavor)) {
            throw new Error(`Not a valid build flavor: ${buildFlavor}`);
        }
        const appId = determineAppIdentifier(buildFlavor);

        if (
            (process.platform !== 'darwin' && process.platform !== 'win32') ||
            (process.arch !== 'arm64' && process.arch !== 'x64')
        ) {
            throw new Error(`Unsupported OS or arch: ${process.platform}, ${process.arch}`);
        }
        const installerFileName = determineInstallerName(
            appId,
            process.arch,
            process.platform,
            updateInfo.version,
        );

        const updateBinaryUrl = new URL(
            `${updateInfo.version}/${installerFileName}`,
            STATIC_CONFIG.UPDATE_SERVER_URL,
        );
        const updateBinaryDigestUrl = new URL(
            `${updateInfo.version}/${installerFileName}.sha256`,
            STATIC_CONFIG.UPDATE_SERVER_URL,
        );

        try {
            const binaryPath = ['update', installerFileName];
            const checksumPath = ['update', `${installerFileName}.sha256`];

            await this._downloadFile(updateBinaryUrl, binaryPath, onProgress);
            await this._downloadFile(updateBinaryDigestUrl, checksumPath);
        } catch (error) {
            throw new Error(`Update download failed: ${error}`);
        }
    }

    /**
     * Download a file from the given {@link url} to the given {@link relativePath} (i.e., a path
     * relative to the temp file directory).
     *
     * Note: If the file at the given {@link relativePath} already exists, nothing will be
     * downloaded, and `onProgress` will be called once with the value `1`.
     *
     * @param url The URL of the file to download.
     * @param relativePath The file path (relative to the temp directory) to download the file to
     *   (including file extension). Might be an array of partial paths that will be joined.
     * @param onProgress An optional callback which is called whenever the download progress
     *   changes.
     */
    private async _downloadFile(
        url: URL,
        relativePath: string | string[],
        onProgress?: (progress: f64) => Promise<void>,
    ): Promise<void> {
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                'user-agent': STATIC_CONFIG.USER_AGENT,
                'accept': 'application/octet-stream',
            },
        });
        if (response.body === null) {
            throw new Error('File fetch response body was null');
        }

        // Create `TransformStream` to measure current download progress and pass it to the
        // callback.
        const totalBytes = parseInt(response.headers.get('content-length') ?? '0', 10);
        let downloadedBytes = 0;
        const progressMeasurementTransformStream = new TransformStream<Uint8Array, Uint8Array>({
            async transform(chunk, controller) {
                downloadedBytes += chunk.byteLength;
                await onProgress?.(downloadedBytes / totalBytes);
                controller.enqueue(chunk);
            },
        });

        // Create `WritableStream` that writes to the temp file storage.
        const writeToTempFileStream = (await this._services.tempFile.createWritableStream(
            relativePath,
        )) as WritableStream<Uint8Array>;

        // Pipe the downloaded content to the file and measure progress.
        const wrappedResponseBody = adapter.createReadableStreamWrapper(ReadableStream)(
            response.body,
        ) as ReadableStream<Uint8Array>;
        await wrappedResponseBody
            .pipeThrough(progressMeasurementTransformStream)
            .pipeTo(writeToTempFileStream)
            .catch(async (error: unknown) => {
                if (isNodeError(error)) {
                    if (error.code === 'EEXIST') {
                        // File already exists, so we can just ignore the error and skip the
                        // download.
                        await onProgress?.(1);
                        return;
                    }
                }
                throw new Error(`Error in response-to-file pipe: ${error}`);
            });
    }
}
