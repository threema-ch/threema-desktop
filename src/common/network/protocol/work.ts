import * as v from '@badrap/valita';

import {ensurePublicKey, type PublicKey} from '~/common/crypto';
import type {ThreemaWorkCredentials} from '~/common/device';
import {TransferTag} from '~/common/enum';
import {BaseError, type BaseErrorOptions} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import {ensureIdentityString, type IdentityString} from '~/common/network/types';
import {ensureU53} from '~/common/types';
import {base64ToU8a} from '~/common/utils/base64';
import {
    registerErrorTransferHandler,
    type ProxyMarked,
    PROXY_HANDLER,
} from '~/common/utils/endpoint';
import {nullEmptyStringOptional, nullOptional} from '~/common/utils/valita-helpers';

/**
 * Type of the {@link WorkError}.
 *
 * - non-work-build: The app has not been built to include Work functionality.
 * - fetch: An error occurred when fetching data from the server (e.g. a network connectivity error)
 * - invalid-response: We got an unexpected or invalid response from the server (e.g. an internal
 *   server error, an empty response or a response that does not validate against the schema)
 */
export type WorkErrorType = 'non-work-build' | 'fetch' | 'invalid-response';

const WORK_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    WorkError,
    TransferTag.WORK_ERROR,
    [type: WorkErrorType]
>({
    tag: TransferTag.WORK_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new WorkError(type, message, {from: cause}),
});

/**
 * Errors related to working with the Threema Work endpoint.
 */
export class WorkError extends BaseError {
    public [TRANSFER_HANDLER] = WORK_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: WorkErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

export type WorkLicenseStatus =
    | {readonly valid: true}
    | {readonly valid: false; readonly message: string};

export interface WorkContacts {
    readonly contacts: {
        readonly id: IdentityString;
        readonly pk: PublicKey;
        readonly first?: string;
        readonly last?: string;
    }[];
}

export const WORK_CONTACTS_RESPONSE_SCHEMA = v.object({
    contacts: v.array(
        v
            .object({
                id: v.string().map(ensureIdentityString),
                pk: v
                    .string()
                    .map((value) => base64ToU8a(value))
                    .map((value) => ensurePublicKey(value)),

                first: nullEmptyStringOptional(v.string()),
                last: nullEmptyStringOptional(v.string()),
            })
            .rest(v.unknown()),
    ),
});

export const WORK_LICENSE_CHECK_RESPONSE_SCHEMA = v
    .union(
        v
            .object({
                success: v.literal(true),
            })
            .rest(v.unknown()),
        v
            .object({
                success: v.literal(false),
                error: v.string().optional(),
            })
            .rest(v.unknown()),
    )
    .map<WorkLicenseStatus>((response) =>
        response.success
            ? {valid: true}
            : {valid: false, message: response.error ?? 'Unknown reason'},
    );

export const WORK_SYNC_RESPONSE_SCHEMA = v
    .object({
        checkInterval: v.number().map(ensureU53),
        contacts: v.array(
            v
                .object({
                    id: v.string().map(ensureIdentityString),
                    first: nullEmptyStringOptional(v.string()),
                    last: nullEmptyStringOptional(v.string()),
                    pk: v
                        .string()
                        .map((value) => base64ToU8a(value))
                        .map((value) => ensurePublicKey(value)),
                })
                .rest(v.unknown()),
        ),
        directory: v.union(
            v
                .object({
                    enabled: v.literal(false),
                })
                .rest(v.unknown()),
            v
                .object({
                    enabled: v.literal(true),
                    cat: v.record(v.string()).optional(),
                })
                .rest(v.unknown()),
        ),
        logo: v
            .object({
                light: nullOptional(v.string()),
                dark: nullOptional(v.string()),
            })
            .rest(v.unknown()),
        mdm: v
            .object({
                override: v.boolean(),
                params: v.record(v.union(v.string(), v.boolean())),
            })
            .rest(v.unknown()),
        org: v
            .object({
                name: nullOptional(v.string()),
            })
            .rest(v.unknown()),
        support: nullOptional(v.string()),
    })
    .rest(v.unknown());

/**
 * Exposes Work related endpoints.
 */
export type WorkBackend = {
    /**
     * Full sync of all data associated to the Work subscription.
     *
     * @returns The validated Work subscription data.
     * @throws {WorkError} if something went wrong during fetching of the data.
     *   See {@link WorkErrorType} for a list of possible error types.
     */
    // TODO(DESK-1211)
    // sync: () => Promise<void>;

    /**
     * Request properties associated to a contact of the same Work subscription.
     *
     * @param credentials Work credentials.
     * @param contacts A list of contacts (Threema IDs) to get additional Work properties for.
     * @returns Matching Work contacts in the same Work subscription.
     * @throws {WorkError} if something went wrong during fetching of the data. See
     *   {@link WorkErrorType} for a list of possible error types.
     */
    contacts: (
        credentials: ThreemaWorkCredentials,
        contacts: IdentityString[],
    ) => Promise<WorkContacts>;

    /**
     * Check the Work license.
     *
     * @param credentials Work credentials.
     * @throws {WorkError} if something went wrong during fetching of the data. See
     *   {@link WorkErrorType} for a list of possible error types.
     */
    checkLicense: (credentials: ThreemaWorkCredentials) => Promise<WorkLicenseStatus>;
} & ProxyMarked;

/**
 * Stub Work backend implementation for the Consumer build variant.
 */
export class StubWorkBackend implements WorkBackend {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    // eslint-disable-next-line @typescript-eslint/require-await
    public async contacts(): Promise<WorkContacts> {
        throw new WorkError(
            'non-work-build',
            `Cannot fetch work contacts in build variant '${import.meta.env.BUILD_VARIANT}'`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async checkLicense(): Promise<WorkLicenseStatus> {
        throw new WorkError(
            'non-work-build',
            `Cannot check license in build variant '${import.meta.env.BUILD_VARIANT}'`,
        );
    }
}
