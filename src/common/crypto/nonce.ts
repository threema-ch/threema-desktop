import * as sha256 from 'fast-sha256';

import type {ServicesForBackend} from '~/common/backend';
import {
    ensureNonce,
    ensureNonceHash,
    NACL_CONSTANTS,
    type Nonce,
    type NonceHash,
} from '~/common/crypto';
import type {NonceDatabaseBackend} from '~/common/db';
import type {NonceScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {bytesToHex} from '~/common/utils/byte';
import type {Identity} from '~/common/utils/identity';
import {WeakValueMap} from '~/common/utils/map';
import {type ReadonlyValueObject, ValueObject} from '~/common/utils/object';

/**
 * Hash a nonce before storing it. The nonce is hashed with the user's own identity as HMAC key.
 */
export function hashNonce(ownIdentity: Identity, nonce: Nonce): NonceHash {
    return ensureNonceHash(sha256.hmac(ownIdentity.bytes, nonce));
}

export type ServicesForNonceService = Pick<ServicesForBackend, 'crypto' | 'logging'> & {
    readonly db: NonceDatabaseBackend;
};

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

/** See {@link INonceGuard} */
export class NonceGuard implements INonceGuard {
    public constructor(
        private readonly _services: ServicesForNonceService,
        public readonly scope: NonceScope,
        private readonly _nonce: Nonce,
        private readonly _identity: Identity,
        private readonly _processed = new ValueObject(false),
    ) {}

    /** @inheritdoc */
    public get processed(): ReadonlyValueObject<boolean> {
        return this._processed;
    }

    /** @inheritdoc */
    public get nonce(): Nonce {
        if (this._processed.value) {
            throw new Error('Nonce was accessed after being marked as processed.');
        }

        return this._nonce;
    }

    /** @inheritdoc */
    public discard(): void {
        if (this._processed.value) {
            throw new Error('Nonce was already processed.');
        }

        this._processed.value = true;
    }

    /** @inheritdoc */
    public commit(): void {
        if (this._processed.value) {
            throw new Error('Nonce was already processed.');
        }

        this._processed.value = true;

        const {db} = this._services;
        db.addNonce(this.scope, hashNonce(this._identity, this._nonce));
    }
}

/**
 * String representation of the scope and nonce as a comparable map key.
 * Format: `${scope}-${bytesToHex(nonce))}`
 */
type ScopeAndNonceKey = `${NonceScope}-${string}`;

/**
 * Get a {@link ScopeAndNonceKey}.
 */
function getScopeAndNonceKey(scope: NonceScope, nonce: Nonce): ScopeAndNonceKey {
    return `${scope}-${bytesToHex(nonce)}`;
}

/**
 * Registers nonces in memory and make sure they have not been used before. This is done with the
 * help of wrapping nonces in a {@link NonceGuard}.
 */
export interface INonceRegistry {
    /**
     * Check if a nonce was used before, if yes return {@link NONCE_REUSED}, else register it and
     * return a nonce guard to commit/discard it.
     */
    checkAndRegisterNonce: (scope: NonceScope, nonce: Nonce) => INonceGuard | NonceReused;
}

/** See {@link INonceRegistry} */
export class NonceRegistry implements INonceRegistry {
    private readonly _log: Logger;

    private readonly _registeredNonceGuards = new WeakValueMap<ScopeAndNonceKey, NonceGuard>();

    private readonly _nonceGuardFinalizationRegistry = new FinalizationRegistry<
        ReadonlyValueObject<boolean>
    >((processed) => {
        if (!processed.value) {
            this._log.error('NonceGuard that was not yet processed was garbage collected!');
        }
    });

    public constructor(
        private readonly _services: ServicesForNonceService,
        private readonly _ownIdentity: Identity,
    ) {
        this._log = _services.logging.logger('nonce-service-registry');
    }

    /**
     * @inheritdoc
     */
    public checkAndRegisterNonce(scope: NonceScope, nonce: Nonce): INonceGuard | NonceReused {
        const {db} = this._services;
        if (this._registeredNonceGuards.get(getScopeAndNonceKey(scope, nonce)) !== undefined) {
            this._log.warn(`Nonce ${bytesToHex(nonce)} was already registered as used at runtime!`);
            return NONCE_REUSED;
        }

        if (db.hasNonce(scope, hashNonce(this._ownIdentity, nonce)) !== undefined) {
            this._log.warn(
                `Nonce ${bytesToHex(nonce)} was already registered as used in database!`,
            );
            return NONCE_REUSED;
        }

        return this._createAndRegisterNonceGuard(scope, nonce);
    }

    /**
     * Allocate an new nonce in the registry.
     *
     * Note: Nonces must be either be consumed or discarded or will stay registered in memory and
     * trigger an error when the {@link NonceGuard} is discarded!
     */
    private _createAndRegisterNonceGuard(scope: NonceScope, nonce: Nonce): INonceGuard {
        const key = getScopeAndNonceKey(scope, nonce);
        const deleteAllocatedNonce = (): void => {
            this._registeredNonceGuards.delete(key);
        };
        const processed = new ValueObject(false);

        // Overload the nonceguard to also allocate / deallocate nonces from the registry.
        const nonceGuard = new (class extends NonceGuard {
            /** @inheritdoc */
            public override discard(): void {
                super.discard();
                deleteAllocatedNonce();
            }

            /** @inheritdoc */
            public override commit(): void {
                super.commit();
                deleteAllocatedNonce();
            }
        })(this._services, scope, nonce, this._ownIdentity, processed);

        this._registeredNonceGuards.set(key, nonceGuard);
        this._nonceGuardFinalizationRegistry.register(nonceGuard, processed);

        return nonceGuard;
    }
}

export interface INonceService {
    /**
     * Check whether a nonce was used before and register it so it must be processed and cannot be
     * used again (or is discarded.)
     *
     * @returns the {@link NonceGuard} for the Nonce or {@link NONCE_REUSED} constant.
     */
    readonly checkAndRegisterNonce: (scope: NonceScope, nonce: Nonce) => INonceGuard | NonceReused;

    /**
     * Get a random nonce protected by a {@link NonceGuard}.
     */
    readonly getRandomNonce: (scope: NonceScope) => INonceGuard;

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

export const NONCE_REUSED = Symbol('nonce-reused');
export type NonceReused = typeof NONCE_REUSED;

export class NonceService implements INonceService {
    public constructor(
        private readonly _services: ServicesForNonceService,
        ownIdentity: Identity,
        private readonly _nonceRegistry: INonceRegistry = new NonceRegistry(_services, ownIdentity),
    ) {}

    /** @inheritdoc */
    public checkAndRegisterNonce(scope: NonceScope, nonce: Nonce): INonceGuard | NonceReused {
        return this._nonceRegistry.checkAndRegisterNonce(scope, nonce);
    }

    /** @inheritdoc */
    public getRandomNonce(scope: NonceScope): INonceGuard {
        const {crypto} = this._services;

        // Generate cryptographically secure random nonce
        const randomNonce = ensureNonce(
            crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
        );

        const guard = this.checkAndRegisterNonce(scope, randomNonce);
        if (guard === NONCE_REUSED) {
            // This case is very very improbable, so we throw an error since it could also mean
            // the numbers are not truely random.
            throw new Error(
                'The randomly generated nonce matches a preexisting nonce. Happy birthday! 🎂',
            );
        }

        return guard;
    }

    /** @inheritdoc */
    public getAllPersistedNonces(scope: NonceScope): ReadonlySet<NonceHash> {
        const {db} = this._services;
        const result = db.getAllNonces(scope);

        return new Set(result);
    }

    /** @inheritdoc */
    public importNonces(scope: NonceScope, hashes: ReadonlySet<NonceHash>): void {
        const {db} = this._services;
        db.addNonces(scope, [...hashes]);
    }
}
