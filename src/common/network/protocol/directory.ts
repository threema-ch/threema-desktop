import * as v from '@badrap/valita';

import {ensurePublicKey} from '~/common/crypto';
import {ActivityState, IdentityType, IdentityTypeUtils, TransferTag} from '~/common/enum';
import {type BaseErrorOptions, BaseError} from '~/common/error';
import {
    type IdentityString,
    ensureFeatureMask,
    ensureIdentityString,
    ensureServerGroup,
} from '~/common/network/types';
import {type ClientKey} from '~/common/network/types/keys';
import {base64ToU8a} from '~/common/utils/base64';
import {
    type ProxyMarked,
    registerErrorTransferHandler,
    TRANSFER_MARKER,
} from '~/common/utils/endpoint';

export const VALID_IDENTITY_DATA_SCHEMA = v
    .object({
        identity: v.string().map(ensureIdentityString),
        state: v.union(v.literal(ActivityState.ACTIVE), v.literal(ActivityState.INACTIVE)),
        publicKey: v.string().map(base64ToU8a).map(ensurePublicKey),
        featureMask: v.number().map(ensureFeatureMask),
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
} & ProxyMarked;

/**
 * Type of the {@link DirectoryError}.
 *
 * - fetch: An error occurred when fetching data from the server (e.g. a network connectivity error)
 * - authentication: An error occurred during authenticating against the server
 * - invalid: We got an unexpected or invalid response from the server (e.g. an internal server
 *   error, an empty response or a response that does not validate against the schema)
 */
export type DirectoryErrorType = 'fetch' | 'authentication' | 'invalid';

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
    public [TRANSFER_MARKER] = DIRECTORY_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: DirectoryErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}
