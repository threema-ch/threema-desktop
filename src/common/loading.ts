import type {Logger} from '~/common/logging';
import type {u32, u53} from '~/common/types';
import {WritableStore} from '~/common/utils/store';

/**
 * This service is used to count received and acknowledge reflected messages.
 * Use {@link add()} while receiving messages and {@link remove()} after sending the corresponding ack.
 */
export class LoadingInfo {
    public readonly loadedStore = new WritableStore<u53>(0);

    private readonly _queue = new Set<u32>();

    public constructor(private readonly _log: Logger) {}

    public add(id: u32): void {
        this._queue.add(id);
    }

    public remove(id: u32): void {
        if (this._queue.has(id)) {
            this._queue.delete(id);
            this.loadedStore.set(this.loadedStore.get() + 1);
        } else {
            this._log.warn(`reflectedId '${id}' not found`);
        }
    }
}
