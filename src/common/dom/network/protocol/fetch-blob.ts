import type {ServicesForBackend} from '~/common/backend';
import type {Config} from '~/common/config';
import type {EncryptedData} from '~/common/crypto';
import {
    type BlobBackend,
    BlobBackendError,
    type BlobDownloadResult,
    type BlobId,
    type BlobScope,
    isBlobId,
} from '~/common/network/protocol/blob';
import type {DirectoryBackend} from '~/common/network/protocol/directory';
import {unwrap} from '~/common/utils/assert';
import {bytesToHex, byteToHex, hexToBytes} from '~/common/utils/byte';
import {u64ToHexLe} from '~/common/utils/number';

type ServicesForBlobBackend = Pick<ServicesForBackend, 'config' | 'device' | 'directory'>;

/**
 * Blob API backend implementation based on the [Fetch API].
 *
 * [Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class FetchBlobBackend implements BlobBackend {
    private readonly _baseUrls: Config['BLOB_SERVER_URLS'];
    private readonly _requestInit: RequestInit;
    private readonly _deviceId: string;
    private readonly _deviceGroupId: string;
    private readonly _directoryBackend: DirectoryBackend;
    public constructor(services: ServicesForBlobBackend) {
        const prefix = byteToHex(unwrap(services.device.d2m.dgpk.public[0]));

        this._requestInit = {
            cache: 'no-store',
            headers: {
                'user-agent': services.config.USER_AGENT,
            },
        };

        this._deviceId = u64ToHexLe(services.device.d2m.deviceId);
        this._deviceGroupId = bytesToHex(services.device.d2m.dgpk.public);

        this._baseUrls = {
            uploadUrl: services.config.BLOB_SERVER_URLS.uploadUrl
                .replaceAll('{prefix4}', unwrap(prefix[0]))
                .replaceAll('{prefix8}', prefix),
            downloadUrl: services.config.BLOB_SERVER_URLS.downloadUrl
                .replaceAll('{prefix4}', unwrap(prefix[0]))
                .replaceAll('{prefix8}', prefix),
            doneUrl: services.config.BLOB_SERVER_URLS.doneUrl
                .replaceAll('{prefix4}', unwrap(prefix[0]))
                .replaceAll('{prefix8}', prefix),
        };

        this._directoryBackend = services.directory;
    }

    /** @inheritdoc */
    public async upload(scope: BlobScope, data: EncryptedData): Promise<BlobId> {
        const blob = new Blob([data]);
        const formData = new FormData();
        formData.append('blob', blob);

        let response: Response;

        const auth = await this._fetchAuthToken();
        try {
            response = await fetch(`${this._getUrl(this._baseUrls.uploadUrl, scope)}`, {
                ...this._requestInit,
                method: 'POST',
                headers: {
                    ...this._requestInit.headers,
                    accept: 'text/plain',
                    ...auth,
                },
                body: formData,
            });
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
        let response: Response;
        try {
            response = await fetch(
                `${this._getUrl(
                    this._baseUrls.downloadUrl.replace('{blobId}', bytesToHex(id)),
                    scope,
                )}`,
                {
                    ...this._requestInit,
                    method: 'GET',
                    headers: {
                        ...this._requestInit.headers,
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
                `Could not download blob ${bytesToHex(id)}, status: ${response.status}`,
            );
        }
        if (response.status !== 200) {
            throw new BlobBackendError(
                'fetch',
                `Could not download blob ${bytesToHex(id)}, status: ${response.status}`,
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
        let response: Response;
        try {
            response = await fetch(
                this._getUrl(this._baseUrls.doneUrl.replace('{blobId}', bytesToHex(id)), scope),
                {
                    ...this._requestInit,
                    method: 'POST',
                    headers: {},
                },
            );
        } catch (error) {
            throw new BlobBackendError('fetch', 'Fetch done request errored', {from: error});
        }
        if (response.status !== 204) {
            throw new BlobBackendError(
                'fetch',
                `Could not mark blob ${bytesToHex(id)} as done, status: ${response.status}`,
            );
        }
    }

    /**
     * Create a blob endpoint URL by adding required GET parameters to the {@link baseUrl}.
     */
    private _getUrl(baseUrl: string, scope: BlobScope): URL {
        return new URL(
            `${baseUrl}?deviceId=${this._deviceId}&deviceGroupId=${this._deviceGroupId}&scope=${scope}`,
        );
    }

    /*
     * Fetches an authentication token from the directory server if needed.
     */
    private async _fetchAuthToken(): Promise<{authorization: string} | Record<string, never>> {
        if (import.meta.env.BUILD_ENVIRONMENT !== 'onprem') {
            return {};
        }

        const token = await this._directoryBackend.authToken();
        return {authorization: `Token ${token}`};
    }
}
