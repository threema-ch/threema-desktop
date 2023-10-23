/**
 * Represents the successful result of a file data sync.
 */
export interface SyncSuccess<TData> {
    readonly status: 'ok';
    readonly data: TData;
}

/**
 * Represents the failed result of a file data sync.
 */
export interface SyncFailure {
    readonly status: 'error';
    /** Translated, human-readable error message, that can be shown to the user in the UI. */
    readonly message: string;
    /** The raw error (e.g. for logging, etc.). */
    readonly error: Error;
}

/**
 * Represents the result of a file data sync.
 */
export type SyncResult<TData> = SyncSuccess<TData> | SyncFailure;
