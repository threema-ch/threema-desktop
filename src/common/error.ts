import {TransferTag} from '~/common/enum';
import {ensureError} from '~/common/utils/assert';
import {
    type RegisteredErrorTransferHandler,
    type RegisteredTransferHandler,
    registerErrorTransferHandler,
    TRANSFER_MARKER,
} from '~/common/utils/endpoint';

import {CloseCode, type CloseInfo} from './network';
import {type u53} from './types';

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
    public abstract readonly [TRANSFER_MARKER]: RegisteredTransferHandler<
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
    public [TRANSFER_MARKER] = CONNECTION_CLOSED_TRANSFER_HANDLER;
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
    public [TRANSFER_MARKER] = CRYPTO_ERROR_TRANSFER_HANDLER;
}

/**
 * Type of the {@link ProtocolError}.
 *
 * - csp: An error occurred in the CSP protocol.
 * - d2m: An error occurred in the D2M protocol.
 */
export type ProtocolErrorType = 'csp' | 'd2m';

const PROTOCOL_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    ProtocolError<ProtocolErrorType>,
    TransferTag.PROTOCOL_ERROR,
    [type: ProtocolErrorType, info: CloseInfo]
>({
    tag: TransferTag.PROTOCOL_ERROR,
    serialize: (error) => [error.type, error.info],
    deserialize: (message, cause, [type, info]) =>
        new ProtocolError(type, message, info, {from: cause}),
} as const);

/**
 * A protocol error.
 *
 * Important: The message should NEVER contain confidential information since
 *            it may be transmitted to the mediator server for debugging
 *            purposes in development mode.
 */
export class ProtocolError<TType extends ProtocolErrorType> extends BaseError implements CloseInfo {
    public [TRANSFER_MARKER]: RegisteredErrorTransferHandler<
        ProtocolError<ProtocolErrorType>,
        TransferTag.PROTOCOL_ERROR,
        [type: ProtocolErrorType, info: CloseInfo]
    > = PROTOCOL_ERROR_TRANSFER_HANDLER;
    public readonly code: u53;
    public readonly reason?: string;
    public readonly clientInitiated: boolean | undefined;

    public constructor(
        public readonly type: TType,
        message: string,
        public readonly info: CloseInfo = {code: CloseCode.PROTOCOL_ERROR, clientInitiated: true},
        options?: BaseErrorOptions,
    ) {
        super(message, options);
        this.code = info.code;
        this.reason = info.reason;
        this.clientInitiated = info.clientInitiated;

        // In debug mode, use the message as fallback for the reason
        if (import.meta.env.DEBUG && this.reason === undefined) {
            this.reason = `threema-desktop ${import.meta.env.BUILD_VERSION}: ${message}`;
        }
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
    public [TRANSFER_MARKER] = MIGRATION_ERROR_TRANSFER_HANDLER;
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
    public [TRANSFER_MARKER] = TYPE_TRANSFORM_ERROR_TRANSFER_HANDLER;

    public constructor(public readonly direction: TypeTransformErrorDirection, message: string) {
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
    public [TRANSFER_MARKER] = MIGRATION_ERROR_TRANSFER_HANDLER;
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
    public [TRANSFER_MARKER] = SAFE_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: SafeErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}
