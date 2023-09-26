import {TransferTag} from '~/common/enum';
import type {FileStorageErrorType} from '~/common/file-storage';
import {ensureError} from '~/common/utils/assert';
import {
    type RegisteredErrorTransferHandler,
    type RegisteredTransferHandler,
    registerErrorTransferHandler,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';

/**
 * Recursively extract the error message, including the message of the error cause.
 */
export function extractErrorMessage(error: Error, format: 'short' | 'long'): string {
    let msg = `${(error as object).constructor.name}: ${error.message}`;
    if (error.cause instanceof Error) {
        const separator = format === 'short' ? ' | ' : '\n  ';
        msg += `${separator}Caused by: ${extractErrorMessage(error.cause, format)}`;
    }
    return msg;
}

/**
 * Recursively extract the traceback of an error and its causes.
 */
export function extractErrorTraceback(error: Error): string {
    let msg = error.stack ?? `${(error as object).constructor.name}: ${error.message}`;
    if (error.cause instanceof Error) {
        msg += `\n\n${extractErrorTraceback(error.cause)}`;
    }
    return msg;
}

/**
 * Additional error options.
 */
export interface BaseErrorOptions {
    /**
     * Cause of the error. Will be mapped to an {@link Error} automatically.
     *
     * Note: This intentionally deviates from the property {@link Error.cause} in order to make the
     *       {@link Error} interface incompatible with this interface.
     */
    readonly from?: unknown;
}

/**
 * Common base class for errors.
 */
export abstract class BaseError extends Error {
    public abstract readonly [TRANSFER_HANDLER]: RegisteredTransferHandler<
        // Note: Would be great if we could constrain this in some way but it's tedious as hell.
        /* eslint-disable @typescript-eslint/no-explicit-any */
        any,
        any,
        any,
        any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        TransferTag
    >;

    public constructor(message: string, options?: BaseErrorOptions) {
        super(
            message,
            options?.from === undefined ? undefined : {cause: ensureError(options.from)},
        );
    }
}

/**
 * Type of the {@link ConnectionClosed}.
 *
 * - abort: The connection has been aborted by an abort signal.
 * - lost: The connection to the server has been lost.
 */
export type ConnectionClosedType = 'abort' | 'lost';

const CONNECTION_CLOSED_TRANSFER_HANDLER = registerErrorTransferHandler<
    ConnectionClosed,
    TransferTag.CONNECTION_CLOSED_ERROR,
    [type: ConnectionClosedType]
>({
    tag: TransferTag.CONNECTION_CLOSED_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new ConnectionClosed(type, message, {from: cause}),
});

/**
 * The connection has been closed or aborted.
 */
export class ConnectionClosed extends BaseError {
    public [TRANSFER_HANDLER] = CONNECTION_CLOSED_TRANSFER_HANDLER;
    public constructor(
        public readonly type: ConnectionClosedType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

const CRYPTO_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    CryptoError,
    TransferTag.CRYPTO_ERROR
>({
    tag: TransferTag.CRYPTO_ERROR,
    serialize: () => [],
    deserialize: (message, cause) => new CryptoError(message, {from: cause}),
});

/**
 * A general crypto-related error.
 */
export class CryptoError extends BaseError {
    public [TRANSFER_HANDLER] = CRYPTO_ERROR_TRANSFER_HANDLER;
}

/**
 * Type of the {@link ProtocolError}.
 *
 * - csp: An error occurred in the CSP protocol.
 * - d2m: An error occurred in the D2M protocol.
 * - d2d: An error occurred while processing a d2d message.
 */
export type ProtocolErrorType = 'csp' | 'd2m' | 'd2d';

/**
 * Recoverability of the {@link ProtocolError}.
 *
 * - recoverable-on-reconnect: Error needs reconnect to be recoverable.
 * - unrecoverable: Error is not recoverable and
 */
export type ProtocolErrorRecoverability =
    | 'recovery-not-needed'
    | 'recoverable-on-reconnect'
    | 'unrecoverable';

const PROTOCOL_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    ProtocolError<ProtocolErrorType>,
    TransferTag.PROTOCOL_ERROR,
    [type: ProtocolErrorType, recoverability: ProtocolErrorRecoverability]
>({
    tag: TransferTag.PROTOCOL_ERROR,
    serialize: (error) => [error.type, error.recoverability],
    deserialize: (message, cause, [type, recoverability]) =>
        new ProtocolError(type, message, recoverability, {from: cause}),
});

/**
 * A protocol error.
 *
 * Important: The message should NEVER contain confidential information since
 *            it may be transmitted to the mediator server for debugging
 *            purposes in development mode.
 */
export class ProtocolError<TType extends ProtocolErrorType> extends BaseError {
    public [TRANSFER_HANDLER]: RegisteredErrorTransferHandler<
        ProtocolError<ProtocolErrorType>,
        TransferTag.PROTOCOL_ERROR,
        [type: ProtocolErrorType, recoverability: ProtocolErrorRecoverability]
    > = PROTOCOL_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: TType,
        message: string,
        public readonly recoverability: ProtocolErrorRecoverability = 'recovery-not-needed',
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

const MIGRATION_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    MigrationError,
    TransferTag.MIGRATION_ERROR
>({
    tag: TransferTag.MIGRATION_ERROR,
    serialize: () => [],
    deserialize: (message, cause) => new MigrationError(message, {from: cause}),
});

/**
 * An error that occurs when applying migrations.
 */
export class MigrationError extends BaseError {
    public [TRANSFER_HANDLER] = MIGRATION_ERROR_TRANSFER_HANDLER;
}

type TypeTransformErrorDirection = 'encode' | 'decode';

const TYPE_TRANSFORM_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    TypeTransformError,
    TransferTag.TYPE_TRANSFORM_ERROR,
    [direction: TypeTransformErrorDirection]
>({
    tag: TransferTag.TYPE_TRANSFORM_ERROR,
    serialize: (error) => [error.direction],
    deserialize: (message, cause, [direction]) => new TypeTransformError(direction, message),
});

/**
 * An error that occurs when transforming values from/to database types.
 */
export class TypeTransformError extends BaseError {
    public [TRANSFER_HANDLER] = TYPE_TRANSFORM_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly direction: TypeTransformErrorDirection,
        message: string,
    ) {
        super(message);
    }

    public static forValue(
        direction: TypeTransformErrorDirection,
        value: unknown,
        targetType: string,
    ): TypeTransformError {
        const sourceType = Object.prototype.toString.call(value);
        let message;
        if (direction === 'encode') {
            message = `Cannot encode value of type ${sourceType} for database as ${targetType}: ${value}`;
        } else {
            message = `Cannot decode database value of type ${sourceType} as ${targetType}: ${value}`;
        }
        return new TypeTransformError(direction, message);
    }
}

/**
 * An error that occurs when something could not be parsed.
 */
export class ParseError extends BaseError {
    public [TRANSFER_HANDLER] = MIGRATION_ERROR_TRANSFER_HANDLER;
}

/**
 * Error types that can happen in connection with Threema Safe.
 *
 * - fetch: A HTTP request failed.
 * - not-found: Backup does not exist for the specified credentials.
 * - crypto: A cryptography related problem occurred.
 * - encoding: Bytes could not be decompressed or decoded.
 * - validation: The backup JSON does not pass validation.
 * - import: The backup could not be imported (most likely due to a data constraint error).
 */
export type SafeErrorType = 'fetch' | 'not-found' | 'crypto' | 'encoding' | 'validation' | 'import';

const SAFE_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    SafeError,
    TransferTag.SAFE_ERROR,
    [type: SafeErrorType]
>({
    tag: TransferTag.SAFE_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new SafeError(type, message, {from: cause}),
});

/**
 * Errors types that can happen in connection with the Threema Safe restore process.
 */
export class SafeError extends BaseError {
    public [TRANSFER_HANDLER] = SAFE_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: SafeErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/** A rendezvous connection close cause. */
export type RendezvousCloseCause = 'unknown' | 'closed' | 'timeout' | 'complete';

/** An error wrapping a {@link RendezvousCloseCause}. */
export class RendezvousCloseError extends Error {
    public constructor(
        public override readonly cause: RendezvousCloseCause,
        message?: string,
    ) {
        super(message ?? `Rendezvous connection closed, cause: '${cause}'`);
    }
}

/**
 * Error types that can happen in connection with the Device Join Protocol.
 *
 * - connection: The connection was closed or aborted.
 * - encoding: Bytes could not be decompressed or decoded.
 * - validation: Protobuf message does not pass validation.
 * - protocol: Aborted due to device join protocol violation.
 * - internal: An internal implementation error occurred.
 */
export type DeviceJoinErrorType =
    | {readonly kind: 'connection'; readonly cause: RendezvousCloseCause}
    | {readonly kind: 'encoding'}
    | {readonly kind: 'validation'}
    | {readonly kind: 'protocol'}
    | {readonly kind: 'internal'};

const DEVICE_JOIN_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    DeviceJoinError,
    TransferTag.DEVICE_JOIN_PROTOCOL_ERROR,
    [type: DeviceJoinErrorType]
>({
    tag: TransferTag.DEVICE_JOIN_PROTOCOL_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new DeviceJoinError(type, message, {from: cause}),
});

/**
 * Errors types that can happen in connection with the Threema Safe restore process.
 */
export class DeviceJoinError extends BaseError {
    public [TRANSFER_HANDLER] = DEVICE_JOIN_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: DeviceJoinErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/**
 * Error types that can happen when trying to fetch blob bytes.
 *
 * - file-storage-error: The file could not be read from or written to file storage.
 * - permanent-download-error: Downloading the blob failed and should not be retried. This is
 *   probably an expired blob download.
 * - temporary-download-error: Downloading the blob failed, it can be retried at a later stage.
 * - decryption-error: Decrypting the download failed.
 * - internal: An internal error, most probably a logic bug.
 */
export type BlobFetchErrorType =
    | {readonly kind: 'file-storage-error'; readonly cause?: FileStorageErrorType}
    | {readonly kind: 'permanent-download-error'; readonly cause?: Error}
    | {readonly kind: 'temporary-download-error'; readonly cause: Error}
    | {readonly kind: 'decryption-error'; readonly cause: Error}
    | {readonly kind: 'internal'};

const BLOB_FETCH_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    BlobFetchError,
    TransferTag.BLOB_FETCH_ERROR,
    [type: BlobFetchErrorType]
>({
    tag: TransferTag.BLOB_FETCH_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new BlobFetchError(type, message, {from: cause}),
});

export class BlobFetchError extends BaseError {
    public [TRANSFER_HANDLER] = BLOB_FETCH_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: BlobFetchErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}
