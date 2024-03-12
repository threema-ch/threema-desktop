import type {ServicesForBackend} from '~/common/backend';
import type {EncryptedData, PublicKey} from '~/common/crypto';
import {
    type BlobBackend,
    BlobBackendError,
    type BlobDownloadResult,
    type BlobId,
    type BlobScope,
    isBlobId,
    blobIdToString,
} from '~/common/network/protocol/blob';
import type {DirectoryBackend} from '~/common/network/protocol/directory';
import {bytesToHex, hexToBytes} from '~/common/utils/byte';
import {u64ToHexLe} from '~/common/utils/number';

type ServicesForBlobBackend = Pick<ServicesForBackend, 'config' | 'device' | 'directory'>;

/**
 * Blob API backend implementation based on the [Fetch API].
 *
 * [Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class FetchBlobBackend implements BlobBackend {
    private readonly _deviceId: string;
    private readonly _deviceGroupId: {
        readonly bytes: PublicKey;
        readonly hex: string;
    };
    private readonly _directoryBackend: DirectoryBackend;
    public constructor(private readonly _services: ServicesForBlobBackend) {
        this._deviceId = u64ToHexLe(_services.device.d2m.deviceId);
        this._deviceGroupId = {
            bytes: _services.device.d2m.dgpk.public,
            hex: bytesToHex(_services.device.d2m.dgpk.public),
        };
        this._directoryBackend = _services.directory;
    }

    /** @inheritdoc */
    public async upload(scope: BlobScope, data: EncryptedData): Promise<BlobId> {
        const blob = new Blob([data]);
        const formData = new FormData();
        formData.append('blob', blob);

        let response: Response;

        const auth = await this._fetchAuthToken();
        try {
            response = await this._fetch(
                this._services.config.BLOB_SERVER_URLS.upload(this._deviceGroupId.bytes),
                scope,
                {
                    method: 'POST',
                    headers: {
                        ...auth,
                        accept: 'text/plain',
                    },
                    body: formData,
                },
            );
        } catch (error) {
            throw new BlobBackendError('fetch', 'Fetch upload request errored', {from: error});
        }
        if (response.status !== 200) {
            throw new BlobBackendError(
                'fetch',
                `Could not upload blob, status: ${response.status}`,
            );
        }

        const blobId = hexToBytes((await response.text()).trim());
        if (!isBlobId(blobId)) {
            throw new BlobBackendError(
                'invalid-blob-id',
                `Could not upload blob, invalid blob id returned: ${blobId}`,
            );
        }
        return blobId;
    }

    /** @inheritdoc */
    public async download(scope: BlobScope, id: BlobId): Promise<BlobDownloadResult> {
        const idString = blobIdToString(id);
        let response: Response;
        try {
            response = await this._fetch(
                this._services.config.BLOB_SERVER_URLS.download(
                    this._deviceGroupId.bytes,
                    idString,
                ),
                scope,
                {
                    method: 'GET',
                    headers: {
                        accept: 'application/octet-stream',
                    },
                },
            );
        } catch (error) {
            throw new BlobBackendError('fetch', 'Fetch download request errored', {from: error});
        }
        if (response.status === 404) {
            throw new BlobBackendError(
                'not-found',
                `Could not download blob ${idString}, status: ${response.status}`,
            );
        }
        if (response.status !== 200) {
            throw new BlobBackendError(
                'fetch',
                `Could not download blob ${idString}, status: ${response.status}`,
            );
        }

        let arrayBuffer: ArrayBuffer;
        try {
            arrayBuffer = await response.arrayBuffer();
        } catch (error) {
            throw new BlobBackendError('fetch', 'Could not allocate blob content into buffer', {
                from: error,
            });
        }
        return {
            data: new Uint8Array(arrayBuffer) as EncryptedData,
            done: async (doneScope: BlobScope) => await this._done(id, doneScope),
        };
    }

    /**
     * Mark a blob as 'done' (i.e. eligible for removal once all devices have downloaded the blob).
     *
     * @throws {BlobBackendError} if an invalid device group or device id has been provided, in case
     *   the server could not be reached or had an internal error.
     */
    private async _done(id: BlobId, scope: BlobScope): Promise<void> {
        const idString = blobIdToString(id);
        let response: Response;
        try {
            response = await this._fetch(
                this._services.config.BLOB_SERVER_URLS.done(this._deviceGroupId.bytes, idString),
                scope,
                {
                    method: 'POST',
                },
            );
        } catch (error) {
            throw new BlobBackendError('fetch', 'Fetch done request errored', {from: error});
        }
        if (response.status !== 204) {
            throw new BlobBackendError(
                'fetch',
                `Could not mark blob ${idString} as done, status: ${response.status}`,
            );
        }
    }

    private async _fetch(url: URL, scope: BlobScope, init: RequestInit): Promise<Response> {
        // Apply URL search parameters and fetch
        url = new URL(url);
        url.search = new URLSearchParams({
            deviceId: this._deviceId,
            deviceGroupId: this._deviceGroupId.hex,
            scope,
        }).toString();
        return await fetch(url, {
            ...init,
            cache: 'no-store',
            headers: {
                ...init.headers,
                'user-agent': this._services.config.USER_AGENT,
            },
        });
    }

    /*
     * Fetches an authentication token from the directory server if needed.
     */
    private async _fetchAuthToken(): Promise<{readonly authorization?: string}> {
        if (import.meta.env.BUILD_ENVIRONMENT !== 'onprem') {
            return {};
        }

        const token = await this._directoryBackend.authToken();
        return {authorization: `Token ${token}`};
    }
}
