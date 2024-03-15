import * as v from '@badrap/valita';

import {ensurePublicKey} from '~/common/crypto';
import {ActivityState, IdentityType, IdentityTypeUtils, TransferTag} from '~/common/enum';
import {BaseError, type BaseErrorOptions} from '~/common/error';
import {
    ensureFeatureMask,
    ensureIdentityString,
    ensureServerGroup,
    type IdentityString,
} from '~/common/network/types';
import type {ClientKey} from '~/common/network/types/keys';
import {base64ToU8a} from '~/common/utils/base64';
import {
    registerErrorTransferHandler,
    TRANSFER_HANDLER,
    type ProxyMarked,
} from '~/common/utils/endpoint';

export const VALID_IDENTITY_DATA_SCHEMA = v
    .object({
        identity: v.string().map(ensureIdentityString),
        // Note: In the case of OnPrem, the state fetched from the directory server will be undefined.
        state: v
            .union(v.literal(ActivityState.ACTIVE), v.literal(ActivityState.INACTIVE))
            .optional(),
        publicKey: v
            .string()
            .map((value) => base64ToU8a(value))
            .map((value) => ensurePublicKey(value)),
        featureMask: v.number().map(BigInt).map(ensureFeatureMask),
        type: v.number().map((type) => IdentityTypeUtils.fromNumber(type, IdentityType.REGULAR)),
    })
    .rest(v.unknown());

export type ValidIdentityData = Readonly<v.Infer<typeof VALID_IDENTITY_DATA_SCHEMA>>;

const INVALID_IDENTITY_DATA_SCHEMA = v
    .object({
        state: v.literal(ActivityState.INVALID),
    })
    .rest(v.unknown());
export type InvalidIdentityData = Readonly<v.Infer<typeof INVALID_IDENTITY_DATA_SCHEMA>>;

/**
 * Validation schema for identity data returned from the identity directory.
 *
 * @throws {Error} In case of an invalid property value or in case the identity has not been
 *   assigned or has been permanently deleted.
 * @throws {ValitaError} In case validation fails.
 */
export const IDENTITY_DATA_SCHEMA = v.union(
    VALID_IDENTITY_DATA_SCHEMA,
    INVALID_IDENTITY_DATA_SCHEMA,
);

/**
 * Validated identity data returned from the identity directory.
 */
export type IdentityData = Readonly<v.Infer<typeof IDENTITY_DATA_SCHEMA>>;

export const IDENTITY_PRIVATE_DATA_SCHEMA = v
    .object({
        identity: v.string().map(ensureIdentityString),
        serverGroup: v.string().map(ensureServerGroup),
        email: v.string().optional(),
        mobileNo: v.string().optional(),
    })
    .rest(v.unknown());

export const AUTH_TOKEN_SCHEMA = v
    .object({
        authToken: v.string(),
    })
    .rest(v.unknown());

/**
 * Validated identity data returned from the identity directory.
 */
export type IdentityPrivateData = Readonly<v.Infer<typeof IDENTITY_PRIVATE_DATA_SCHEMA>>;

export type DirectoryBackend = {
    /**
     * Fetch data for a single identity from the directory.
     *
     * @throws {DirectoryError} if something went wrong during fetching of the data.
     *   See {@link DirectoryErrorType} for a list of possible error types.
     */
    identity: (identity: IdentityString) => Promise<IdentityData>;

    /**
     * Fetch data for multiple identities from the directory.
     *
     * All identities passed to this function will have a corresponding entry in the resulting map
     * (but the state might be {@link ActivityState.INVALID}).
     *
     * @throws {DirectoryError} if something went wrong during fetching of the data.
     *   See {@link DirectoryErrorType} for a list of possible error types.
     */
    identities: (
        identities: IdentityString[],
    ) => Promise<Record<IdentityString, IdentityData | undefined>>;

    /**
     * Fetch identity private data from the directory.
     *
     * This call is used after restoring an ID, to retrieve the server group as well as the linked
     * email address and phone number (for display in the UI).
     *
     * @throws {DirectoryError} if something went wrong during fetching of the data.
     *   See {@link DirectoryErrorType} for a list of possible error types.
     */
    privateData: (identity: IdentityString, ck: ClientKey) => Promise<IdentityPrivateData>;

    /**
     * Fetch the current authentication token from the directory server.
     *
     * This function should only be called in OnPrem builds. This is asserted in the function.
     *
     * @throws {DirectoryError} if something is wrong during fetching of the token.
     * @throws {Error} if the current build environment is not OnPrem.
     */
    authToken: () => Promise<string>;
} & ProxyMarked;

/**
 * Type of the {@link DirectoryError}.
 *
 * - timeout: Fetching data timed out.
 * - fetch: An error occurred when fetching data from the server (e.g. a network connectivity error)
 * - authentication: An error occurred during authenticating against the server
 * - identity-transfer-prohibited: The user tried to fetch information for a Work identity from a
 *   consumer app, or vice versa
 * - invalid-identity: The identity is unknown or was revoked
 * - invalid-response: We got an unexpected or invalid response from the server (e.g. an internal
 *   server error, an empty response or a response that does not validate against the schema)
 */
export type DirectoryErrorType =
    | 'timeout'
    | 'fetch'
    | 'authentication'
    | 'identity-transfer-prohibited'
    | 'invalid-identity'
    | 'invalid-response';

const DIRECTORY_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    DirectoryError,
    TransferTag.DIRECTORY_ERROR,
    [type: DirectoryErrorType]
>({
    tag: TransferTag.DIRECTORY_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new DirectoryError(type, message, {from: cause}),
});

/**
 * Errors related to working with the identity directory.
 */
export class DirectoryError extends BaseError {
    public [TRANSFER_HANDLER] = DIRECTORY_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: DirectoryErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}
