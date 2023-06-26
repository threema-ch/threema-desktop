import * as v from '@badrap/valita';

import {type ServicesForBackend} from '~/common/backend';
import {ensurePublicKey} from '~/common/crypto';
import {hash} from '~/common/crypto/blake2b';
import {deriveDirectoryChallengeResponseKey} from '~/common/crypto/csp-keys';
import {ActivityState} from '~/common/enum';
import {
    type DirectoryBackend,
    DirectoryError,
    IDENTITY_PRIVATE_DATA_SCHEMA,
    type IdentityData,
    type IdentityPrivateData,
    VALID_IDENTITY_DATA_SCHEMA,
} from '~/common/network/protocol/directory';
import {type IdentityString} from '~/common/network/types';
import {type ClientKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array} from '~/common/types';
import {base64ToU8a, u8aToBase64} from '~/common/utils/base64';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

/**
 * Schema for the challenge payload returned by the directory server.
 *
 * This contains a binary token and an NaCl public key. To authenticate, the client calculates a
 * response by encrypting the token in an NaCl Box using the private key of its Threema ID, the
 * public key supplied by the server, and a random nonce.
 */
const CHALLENGE_PAYLOAD = v
    .object({
        token: v
            .string()
            .map(base64ToU8a)
            .map((a) => a as ReadonlyUint8Array),
        tokenRespKeyPub: v.string().map(base64ToU8a).map(ensurePublicKey),
    })
    .rest(v.unknown());

type ChallengePayload = v.Infer<typeof CHALLENGE_PAYLOAD>;

const BULK_IDENTITIES_SCHEMA = v
    .object({
        identities: v.array(VALID_IDENTITY_DATA_SCHEMA),
    })
    .rest(v.unknown());

/**
 * Directory backend implementation based on the [Fetch API].
 *
 * [Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class FetchDirectoryBackend implements DirectoryBackend {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    private readonly _base: string;
    private readonly _requestInit: RequestInit;

    public constructor(services: Pick<ServicesForBackend, 'config'>) {
        this._base = services.config.DIRECTORY_SERVER_URL;
        this._requestInit = {
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                'accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'user-agent': services.config.USER_AGENT,
            },
        };
    }

    /** @inheritdoc */
    public async identity(identity: IdentityString): Promise<IdentityData> {
        const responseData = await this._request(
            'Identity data',
            `identity/${identity}`,
            undefined,
            VALID_IDENTITY_DATA_SCHEMA,
        );
        return (
            responseData ?? {
                state: ActivityState.INVALID,
            }
        );
    }

    /** @inheritdoc */
    public async identities(
        identities: IdentityString[],
    ): Promise<Record<IdentityString, IdentityData>> {
        const responseData = await this._request(
            'Bulk identity data',
            `identity/fetch_bulk`,
            {identities},
            BULK_IDENTITIES_SCHEMA,
        );
        if (responseData === undefined) {
            throw new DirectoryError('invalid', `Bulk identity fetch request returned status 404`);
        }

        const missingIdentities = new Set(identities);
        const result: Record<IdentityString, IdentityData> = {};

        // Add valid identities
        for (const identity of responseData.identities) {
            missingIdentities.delete(identity.identity);
            result[identity.identity] = identity;
        }

        // All missing identities either do not exist or have been revoked
        for (const missingIdentity of missingIdentities) {
            result[missingIdentity] = {state: ActivityState.INVALID};
        }

        return result;
    }

    /** @inheritdoc */
    public async privateData(
        identity: IdentityString,
        ck: ClientKey,
    ): Promise<IdentityPrivateData> {
        const responseData = await this._authenticatedRequest(
            'Private data',
            'identity/fetch_priv',
            {
                identity,
            },
            ck,
            IDENTITY_PRIVATE_DATA_SCHEMA,
        );
        if (responseData === undefined) {
            throw new DirectoryError('invalid', `Private data fetch request returned status 404`);
        }
        return responseData;
    }

    /**
     * Send a non-authenticated GET request to the directory server and validate the response.
     *
     * @param description A description used in error messages. Example: "Identity".
     * @param requestPath The request path. Example: "identity/ECHOECHO".
     * @param requestPayload Optional object that will be encoded to JSON and used as body. If
     *   present, the request will use the POST method. Otherwise, the request will use the GET
     *   method.
     * @param schema The valita schema used to parse the response
     * @returns the response JSON validated against the provided schema, or `undefined` if the
     *   directory server returns a 404 response
     */
    private async _request<TSchema extends v.Type>(
        description: string,
        requestPath: string,
        requestPayload: Record<string, unknown> | undefined,
        schema: TSchema,
    ): Promise<v.Infer<TSchema> | undefined> {
        // Send request
        const url = `${new URL(requestPath, this._base)}`;
        let response: Response;

        let requestInit;

        if (requestPayload === undefined) {
            requestInit = {
                ...this._requestInit,
                method: 'GET',
            };
        } else {
            requestInit = {
                ...this._requestInit,
                method: 'POST',
                body: JSON.stringify(requestPayload),
            };
        }

        try {
            response = await fetch(url, requestInit);
        } catch (error) {
            throw new DirectoryError('fetch', `${description} fetch request errored`, {
                from: error,
            });
        }
        if (response.status === 404) {
            return undefined;
        }
        if (response.status !== 200) {
            throw new DirectoryError(
                'invalid',
                `${description} fetch request returned status ${response.status}`,
            );
        }

        // Validate response JSON
        let responsePayload: Record<string, unknown>;
        try {
            const body = await response.json();
            if (body === null || body === undefined) {
                throw new Error('Response body is null or undefined');
            }
            responsePayload = body;
        } catch (error) {
            throw new DirectoryError(
                'invalid',
                `${description} fetch request did not return a valid response body`,
                {from: error},
            );
        }
        try {
            return schema.parse(responsePayload);
        } catch (error) {
            throw new DirectoryError(
                'invalid',
                `${description} fetch request response body validation against schema failed`,
                {from: error},
            );
        }
    }

    /**
     * Send an authenticated POST request to the directory server and validate the response.
     *
     * @param description A description used in error messages. Example: "Private data".
     * @param requestPath The request path. Example: "identity/fetch_priv".
     * @param requestPayload The request payload. Warning: The payload record will be modified by
     *   this function!
     * @param ck The {@link ClientKey} to be used for authentication
     * @param schema The valita schema used to parse the response
     * @returns the response JSON validated against the provided schema, or `undefined` if the
     *   directory server returns a 404 response
     */
    private async _authenticatedRequest<TSchema extends v.Type>(
        description: string,
        requestPath: string,
        requestPayload: Record<string, unknown>,
        ck: ClientKey,
        schema: TSchema,
    ): Promise<v.Infer<TSchema> | undefined> {
        const url = `${new URL(requestPath, this._base)}`;

        // Fetch challenge payload
        let challengePayload;
        {
            let response: Response;
            try {
                response = await fetch(url, {
                    ...this._requestInit,
                    method: 'POST',
                    body: JSON.stringify(requestPayload),
                });
            } catch (error) {
                throw new DirectoryError(
                    'fetch',
                    `${description} authentication fetch request errored`,
                    {
                        from: error,
                    },
                );
            }
            if (response.status !== 200) {
                throw new DirectoryError(
                    'authentication',
                    `${description} authentication fetch request returned status ${response.status}`,
                );
            }
            try {
                challengePayload = CHALLENGE_PAYLOAD.parse(await response.json());
            } catch (error) {
                throw new DirectoryError(
                    'authentication',
                    `${description} authentication fetch request did not return a valid response body`,
                    {from: error},
                );
            }
        }

        // Encrypt token and add response to request payload
        const authenticatedRequestPayload = this._calculateResponse(
            challengePayload,
            requestPayload,
            ck,
        );

        // Send signed request
        let response: Response;
        try {
            response = await fetch(url, {
                ...this._requestInit,
                method: 'POST',
                body: JSON.stringify(authenticatedRequestPayload),
            });
        } catch (error) {
            throw new DirectoryError('fetch', `${description} fetch request errored`, {
                from: error,
            });
        }
        if (response.status === 404) {
            return undefined;
        }
        if (response.status !== 200) {
            throw new DirectoryError(
                'invalid',
                `${description} fetch request returned status ${response.status}`,
            );
        }

        // Validate response JSON
        let responsePayload: Record<string, unknown>;
        try {
            const body = await response.json();
            if (body === null || body === undefined) {
                throw new Error('Response body is null or undefined');
            }
            responsePayload = body;
        } catch (error) {
            throw new DirectoryError(
                'invalid',
                `${description} fetch request did not return a valid response body`,
                {from: error},
            );
        }
        if (responsePayload.success !== true) {
            throw new DirectoryError(
                'authentication',
                `${description} fetch authentication failed: ${responsePayload.error}`,
            );
        }
        try {
            return schema.parse(responsePayload);
        } catch (error) {
            throw new DirectoryError(
                'invalid',
                `${description} fetch request response body validation against schema failed`,
                {from: error},
            );
        }
    }

    /**
     * Calculate the response to the provided challenge and add it to the specified payload.
     *
     * @param challenge The challenge payload sent by the directory server
     * @param payload The request payload to be updated
     * @param ck The {@link ClientKey} to be used for authentication
     * @throws {DirectoryError} with type `authentication` in case the challenge validation fails
     */
    private _calculateResponse(
        challenge: ChallengePayload,
        payload: Record<string, unknown>,
        ck: ClientKey,
    ): {readonly [x: string]: unknown; readonly token: string; readonly response: string} {
        // Derive the challenge response key and create a MAC for the challenge token
        const responseKey = deriveDirectoryChallengeResponseKey(ck, challenge.tokenRespKeyPub);
        const response = hash(32, responseKey.asReadonly(), undefined)
            .update(challenge.token)
            .digest();
        responseKey.purge();

        // Add response to payload
        return {
            ...payload,
            token: u8aToBase64(challenge.token),
            response: u8aToBase64(response),
        };
    }
}
