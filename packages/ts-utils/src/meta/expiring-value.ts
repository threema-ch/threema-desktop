import {clamp} from '../integer/clamp.js';
import type {u53} from '../integer/u53.js';

/**
 * Cache for a value that expires at a specific date.
 */
export class ExpiringValue<T> {
    private _state: {readonly value: T; readonly expiresAtMs: u53} | undefined;

    /**
     * Return the value or `undefined` if it was not set or it expired.
     *
     * @param options.minRemainingValidityMs The minimum remaining validity the value must have to
     *   be returned. Defaults to `0`.
     */
    public get(options?: {readonly minRemainingValidityMs?: u53}): T | undefined {
        if (this._state === undefined) {
            return undefined;
        }
        const minRemainingValidityMs = options?.minRemainingValidityMs ?? 0;
        if (this._state.expiresAtMs - minRemainingValidityMs < new Date().getTime()) {
            // Do not clear the cached value: a stricter `minRemainingValidityMs` from one caller
            // must not evict a value that is still valid for another caller.
            return undefined;
        }
        return this._state.value;
    }

    /**
     * Update the value with an expiration date.
     *
     * @param value The value to be stored.
     * @param expiration The date when the value will expire.
     * @returns the value.
     */
    public set(value: T, expiration: Date): T {
        const nowMs = new Date().getTime();
        const deltaMs = Math.floor(clamp(expiration.getTime() - nowMs, {min: 0}));
        this._state = {value, expiresAtMs: nowMs + deltaMs};
        return value;
    }
}
