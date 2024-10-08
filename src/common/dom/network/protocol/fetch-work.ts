import type {ServicesForBackend} from '~/common/backend';
import type {ThreemaWorkCredentials} from '~/common/device';
import {getBrowserInfo, makeCspClientInfo} from '~/common/dom/utils/browser';
import {TRANSFER_HANDLER} from '~/common/index';
import {
    WORK_CONTACTS_RESPONSE_SCHEMA,
    WORK_LICENSE_CHECK_RESPONSE_SCHEMA,
    WorkError,
    type WorkBackend,
    type WorkContacts,
    type WorkLicenseStatus,
} from '~/common/network/protocol/work';
import type {BaseUrl, IdentityString} from '~/common/network/types';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

/**
 * Work backend implementation based on the [Fetch API].
 *
 * [Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class FetchWorkBackend implements WorkBackend {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    private readonly _headers: Record<string, string>;

    public constructor(
        private readonly _services: Pick<ServicesForBackend, 'config' | 'logging' | 'systemInfo'>,
    ) {
        this._headers = {
            'accept': 'application/json',
            'user-agent': _services.config.USER_AGENT,
        };
    }

    public async contacts(
        {username, password}: ThreemaWorkCredentials,
        contacts: readonly IdentityString[],
    ): Promise<WorkContacts> {
        let response;
        try {
            response = await this._fetch('identities', this._services.config.WORK_SERVER_URL, {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password,
                    contacts,
                }),
            });
        } catch (error) {
            throw new WorkError('fetch', 'Fetch request to work contacts endpoint failed', {
                from: error,
            });
        }

        if (response.status === 401) {
            throw new WorkError(
                'invalid-credentials',
                `Work contacts endpoint request returned status ${response.status}. The work credentials are invalid.`,
            );
        }

        if (response.status === 429) {
            throw new WorkError(
                'rate-limit-exceeded',
                `Work contacts endpoint request returned status ${response.status}. The rate limit was exceeded.`,
            );
        }

        if (response.status !== 200) {
            throw new WorkError(
                'invalid-response',
                `Work contacts endpoint request returned status ${response.status}`,
            );
        }

        // Validate response JSON
        let body: unknown;
        try {
            body = await response.json();
        } catch (error) {
            throw new WorkError(
                'invalid-response',
                `Work contacts endpoint did not return a valid response body: ${error}`,
                {from: error},
            );
        }
        try {
            return WORK_CONTACTS_RESPONSE_SCHEMA.parse(body);
        } catch (error) {
            throw new WorkError(
                'invalid-response',
                `Work contacts endpoint response against schema failed`,
                {from: error},
            );
        }
    }

    /** @inheritdoc */
    public async checkLicense(credentials: ThreemaWorkCredentials): Promise<WorkLicenseStatus> {
        const browserInfo = getBrowserInfo(self.navigator.userAgent);
        const cspClientInfo = makeCspClientInfo(browserInfo, this._services.systemInfo);

        // Send request
        let response;
        try {
            response = await this._fetch(
                'check_license',
                this._services.config.DIRECTORY_SERVER_URL,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        licenseUsername: credentials.username,
                        licensePassword: credentials.password,
                        version: cspClientInfo,
                        arch: this._services.systemInfo.arch,
                    }),
                },
            );
        } catch (error) {
            throw new WorkError('fetch', 'Fetch request to license validation endpoint failed', {
                from: error,
            });
        }
        if (response.status !== 200) {
            throw new WorkError(
                'invalid-response',
                `Work license validation endpoint request returned status ${response.status}`,
            );
        }

        // Validate response JSON
        let body: unknown;
        try {
            body = await response.json();
        } catch (error) {
            throw new WorkError(
                'invalid-response',
                `Work license validation endpoint did not return a valid response body: ${error}`,
                {from: error},
            );
        }
        try {
            return WORK_LICENSE_CHECK_RESPONSE_SCHEMA.parse(body);
        } catch (error) {
            throw new WorkError(
                'invalid-response',
                `Work license validation response against schema failed`,
                {from: error},
            );
        }
    }

    // TODO(DESK-1211)
    /** @inheritdoc */
    // public async sync(credentials: ThreemaWorkCredentials): Promise<void> {
    //     let response;
    //     try {
    //         response = await this._fetch('fetch2', this._services.config.WORK_SERVER_URL, {
    //             method: 'POST',
    //             body: JSON.stringify({
    //                 contacts: [], // TODO(DESK-1211)
    //                 username: credentials.username,
    //                 password: credentials.password,
    //             }),
    //         });
    //     } catch (error) {
    //         // TODO(DESK-1211) throw
    //     }

    //     // TODO(DESK-1211): Validate status code

    //     /*
    //         TODO(DESK-1211): Finish implementation, validate with WORK_DATA_SYNC_RESPONSE_SCHEMA
    //         let unvalidatedBody;
    //         try {
    //             unvalidatedBody = await response.json();
    //         } catch (error) {
    //             log.error(`Work subscription sync failed: Could not extract JSON body: ${error}`);
    //             return; // TODO throw
    //         }
    //         log.info('XXX body', unvalidatedBody);
    //         */
    // }

    private async _fetch(path: string, base: BaseUrl, init: RequestInit): Promise<Response> {
        return await fetch(new URL(path, base), {
            ...init,
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                ...init.headers,
                ...this._headers,
            },
        });
    }
}
