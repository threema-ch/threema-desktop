import type {NonceScope} from '@threema/protocol/enum';
import type {ReadonlyValueObject} from '@threema/ts-utils/object/value-object';

import type {Nonce, NonceHash} from './primitives.js';

/**
 * Wrapper around a nonce to provide helper functions to persist or discard the nonce.
 */
export interface INonceGuard {
    /**
     * The nonce that is guarded. Never use this nonce twice!
     *
     * @throws Error if the nonce is accessed after beeing marked as {@link processed}.
     */
    readonly nonce: Nonce;

    /**
     * Whether this nonce was either discarded/commited or not.
     */
    readonly processed: ReadonlyValueObject<boolean>;

    /**
     * Discard the nonce: The nonce may be used again at a later time.
     *
     * @throws Error if nonce was already processed.
     */
    readonly discard: () => void;

    /**
     * Commit the nonce to the nonce database.
     *
     * @throws Error if nonce was already processed.
     */
    readonly commit: () => void;
}

export const NONCE_REUSED = Symbol('nonce-reused');
export type NonceReused = typeof NONCE_REUSED;

export interface INonceService {
    /**
     * Check whether a nonce was used before and register it so it must be processed and cannot be
     * used again (or is discarded.)
     *
     * @returns the {@link INonceGuard} for the Nonce or {@link NONCE_REUSED} constant.
     */
    readonly checkAndRegisterNonce: (
        scope: NonceScope,
        nonce: Nonce,
        debugToken?: string,
    ) => INonceGuard | NonceReused;

    /**
     * Get a random nonce protected by a nonce guard.
     */
    readonly getRandomNonce: (scope: NonceScope, debugToken?: string) => INonceGuard;

    /**
     * Get a snapshot of all nonces currently stored for a specific {@link NonceScope}
     */
    readonly getAllPersistedNonces: (scope: NonceScope) => ReadonlySet<NonceHash>;

    /**
     * Import a set of nonce hashes into the database.
     *
     * @throws Error if the import failed.
     */
    readonly importNonces: (scope: NonceScope, hashes: ReadonlySet<NonceHash>) => void;
}
