/**
 * A rtcstats trace backend that persists all trace entries into a local IndexedDB.
 *
 * In contrast to the upstream `WebSocketTrace` of `@rtcstats/rtcstats-js`, no data leaves the
 * device without user interaction: Entries are only written to a local database and can be exported
 * manually as an `RTCStatsDump` JSONL file, which is readable by the rtcstats tooling (e.g. the
 * dump importer).
 *
 * Ported to TypeScript from the (unmerged) upstream pull request
 * https://github.com/rtcstats/rtcstats/pull/72 (rtcstats, MIT license).
 */

import type {Logger} from '~/common/logging';
import {tag, type u53, type WeakOpaque} from '~/common/types';

/** Name of the IndexedDB database holding the rtcstats traces. */
export const RTCSTATS_DATABASE_NAME = 'threema-rtcstats';
/** Maximum number of sessions to retain. Older sessions are pruned when a new one starts. */
export const MAX_SESSIONS: u53 = 5;

const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'traces';
const SESSION_INDEX_NAME = 'sessionId';

/**
 * Number of consecutive failed writes after which tracing disables itself (to avoid pointlessly
 * hammering a broken database).
 */
const MAX_CONSECUTIVE_WRITE_FAILURES: u53 = 20;

/**
 * Identifier of a trace session, see {@link IndexedDbTrace.startSession}.
 *
 * Session IDs must be created through {@link createRtcStatsSessionId}, which prefixes them with
 * an ISO 8601 timestamp: Session pruning and (newest-first) listing rely on the lexicographic
 * order of session IDs matching their chronological order.
 */
export type RtcStatsSessionId = WeakOpaque<string, {readonly RtcStatsSessionId: unique symbol}>;

/**
 * Create a new {@link RtcStatsSessionId} from the current timestamp and the specified label.
 */
export function createRtcStatsSessionId(label: string): RtcStatsSessionId {
    return tag<RtcStatsSessionId>(`${new Date().toISOString()}_${label}`);
}

/**
 * A trace entry as stored in the database: The trace function arguments (method, peer connection
 * id, data, optional extras) plus the time delta to the preceding entry appended.
 *
 * Note: The first entry of a session carries an absolute timestamp instead of a delta, as required
 * by the `RTCStatsDump` format (the reader accumulates deltas starting from 0).
 */
type TraceEntry = readonly unknown[];

/**
 * A trace record ties a {@link TraceEntry} to a session ID.
 */
interface TraceRecord {
    readonly sessionId: RtcStatsSessionId;
    readonly entry: TraceEntry;
}

/**
 * Summary of a stored rtcstats session.
 */
export interface RtcStatsSessionInfo {
    readonly sessionId: RtcStatsSessionId;
    readonly entryCount: u53;
}

/**
 * Promisify an IndexedDB request.
 */
async function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(new Error('IndexedDB request failed', {cause: request.error}));
    });
}

/**
 * Promisify completion of an IndexedDB transaction.
 */
async function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
    return await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
            reject(new Error('IndexedDB transaction failed', {cause: transaction.error}));
        transaction.onabort = () =>
            reject(new Error('IndexedDB transaction aborted', {cause: transaction.error}));
    });
}

/**
 * Collect the distinct index key values (session IDs) without loading the entries.
 */
async function collectIndexKeys(index: IDBIndex): Promise<RtcStatsSessionId[]> {
    return await new Promise((resolve, reject) => {
        const keys = new Set<RtcStatsSessionId>();
        const request = index.openKeyCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor !== null) {
                if (typeof cursor.key === 'string') {
                    keys.add(tag<RtcStatsSessionId>(cursor.key));
                }
                cursor.continue();
            } else {
                resolve([...keys].sort());
            }
        };
        request.onerror = () =>
            reject(new Error('IndexedDB key cursor failed', {cause: request.error}));
    });
}

/**
 * Open (and, if necessary, create) the rtcstats trace database.
 */
async function openDatabase(): Promise<IDBDatabase> {
    return await new Promise((resolve, reject) => {
        const request = self.indexedDB.open(RTCSTATS_DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                const store = database.createObjectStore(OBJECT_STORE_NAME, {autoIncrement: true});
                store.createIndex(SESSION_INDEX_NAME, SESSION_INDEX_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(new Error('Opening the rtcstats IndexedDB failed', {cause: request.error}));
    });
}

/**
 * A rtcstats trace function backend which writes all entries into a local IndexedDB.
 *
 * Entries are grouped into sessions (one session per group call plus a session for app startup, see
 * {@link startSession}). Instances are created through the async {@link create} factory, which
 * guarantees that the database was opened successfully. The trace function is compatible with the
 * `@rtcstats/rtcstats-js` wrappers and never throws: Tracing disables itself after repeated write
 * failures, so that it can never interfere with the call itself.
 */
export class IndexedDbTrace {
    private _sessionId: RtcStatsSessionId | undefined = undefined;
    private _lastTimeMs: u53 = 0;
    private _enabled = true;
    private _closed = false;
    private _consecutiveWriteFailures: u53 = 0;

    private constructor(
        private readonly _log: Logger,
        private readonly _database: IDBDatabase,
    ) {}

    /**
     * Create an {@link IndexedDbTrace} with an opened trace database.
     *
     * @throws If opening the database fails.
     */
    public static async create(log: Logger): Promise<IndexedDbTrace> {
        return new IndexedDbTrace(log, await openDatabase());
    }

    /**
     * The trace function to be handed to the `@rtcstats/rtcstats-js` wrap functions.
     *
     * Never throws.
     */
    public readonly trace = (...args: unknown[]): void => {
        if (this._closed || !this._enabled || this._sessionId === undefined) {
            return;
        }
        try {
            const nowMs = Date.now();
            const timeDelta = nowMs - this._lastTimeMs;
            this._lastTimeMs = nowMs;

            // Ensure the entry is JSON-serializable (and thus structured-cloneable), matching the
            // upstream `WebSocketTrace` serialization behavior (e.g. `undefined` becomes `null`).
            const entry = JSON.parse(JSON.stringify([...args, timeDelta])) as TraceEntry;
            this._write({sessionId: this._sessionId, entry});
        } catch (error) {
            this._registerWriteFailure(error);
        }
    };

    /**
     * Start a new session: Subsequent trace entries are attributed to `sessionId`.
     *
     * Writes a `create` entry with device/screen metadata (mirroring the upstream trace
     * backends), and prunes the oldest sessions if there are more than {@link MAX_SESSIONS}.
     */
    public startSession(sessionId: RtcStatsSessionId): void {
        this._sessionId = sessionId;
        // The first entry of a session must carry an absolute timestamp (the dump reader
        // accumulates time deltas starting from 0).
        this._lastTimeMs = 0;
        this.trace('create', undefined, {
            hardwareConcurrency: navigator.hardwareConcurrency,
            userAgentData: (navigator as {userAgentData?: unknown}).userAgentData,
            deviceMemory: (navigator as {deviceMemory?: unknown}).deviceMemory,
            screen: {
                width: window.screen.availWidth,
                height: window.screen.availHeight,
                devicePixelRatio: window.devicePixelRatio,
            },
            window: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
        });
        this._pruneOldSessions().catch((error: unknown) => {
            this._log.warn('Pruning old rtcstats sessions failed', error);
        });
    }

    /**
     * Enable or disable recording of trace entries (e.g. when the user toggles the setting).
     */
    public setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        if (enabled) {
            this._consecutiveWriteFailures = 0;
        }
    }

    /**
     * Close the database. Subsequent trace entries are dropped.
     */
    public close(): void {
        this._closed = true;
        this._database.close();
    }

    private _write(record: TraceRecord): void {
        try {
            // Note: The transaction must be created synchronously so that entries are stored in
            // trace order.
            const transaction = this._database.transaction(OBJECT_STORE_NAME, 'readwrite');
            transaction.objectStore(OBJECT_STORE_NAME).add(record);
            promisifyTransaction(transaction)
                .then(() => {
                    this._consecutiveWriteFailures = 0;
                })
                .catch((error: unknown) => this._registerWriteFailure(error));
        } catch (error) {
            this._registerWriteFailure(error);
        }
    }

    /**
     * Register a database write failure.
     *
     * After {@link MAX_CONSECUTIVE_WRITE_FAILURES} attempts, the {@link IndexedDbTrace} class is
     * disabled and a warning is logged.
     */
    private _registerWriteFailure(error: unknown): void {
        if (!this._enabled) {
            return;
        }
        this._consecutiveWriteFailures += 1;
        if (this._consecutiveWriteFailures >= MAX_CONSECUTIVE_WRITE_FAILURES) {
            this._enabled = false;
            this._log.warn(
                `Disabling rtcstats tracing after ${this._consecutiveWriteFailures} consecutive write failures`,
                error,
            );
        }
    }

    private async _pruneOldSessions(): Promise<void> {
        if (this._closed) {
            return;
        }
        const transaction = this._database.transaction(OBJECT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        // Session IDs are prefixed with an ISO 8601 timestamp (see
        // {@link createRtcStatsSessionId}), so the lexicographic order returned by
        // `collectIndexKeys` is chronological.
        const sessionIds = await collectIndexKeys(store.index(SESSION_INDEX_NAME));
        for (const sessionId of sessionIds.slice(
            0,
            Math.max(sessionIds.length - MAX_SESSIONS, 0),
        )) {
            if (sessionId === this._sessionId) {
                continue;
            }
            const keys = await promisifyRequest(
                store.index(SESSION_INDEX_NAME).getAllKeys(IDBKeyRange.only(sessionId)),
            );
            for (const key of keys) {
                store.delete(key);
            }
        }
        await promisifyTransaction(transaction);
    }
}

/**
 * List all sessions currently stored in the rtcstats trace database (oldest first).
 */
export async function listRtcStatsSessions(): Promise<RtcStatsSessionInfo[]> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction(OBJECT_STORE_NAME, 'readonly');
        const index = transaction.objectStore(OBJECT_STORE_NAME).index(SESSION_INDEX_NAME);
        const sessionIds = await collectIndexKeys(index);
        return await Promise.all(
            sessionIds.map(async (sessionId) => ({
                sessionId,
                entryCount: await promisifyRequest(index.count(IDBKeyRange.only(sessionId))),
            })),
        );
    } finally {
        database.close();
    }
}

/**
 * Export all entries of a session as an `RTCStatsDump` JSONL blob (readable by the rtcstats
 * tooling).
 */
export async function getRtcStatsSessionDump(sessionId: RtcStatsSessionId): Promise<Blob> {
    const database = await openDatabase();
    let records: TraceRecord[];
    try {
        const transaction = database.transaction(OBJECT_STORE_NAME, 'readonly');
        const index = transaction.objectStore(OBJECT_STORE_NAME).index(SESSION_INDEX_NAME);
        // Note: `getAll` returns the records ordered by their (auto-incremented) primary key,
        // i.e. in insertion order.
        records = (await promisifyRequest(
            index.getAll(IDBKeyRange.only(sessionId)) as IDBRequest<unknown[]>,
        )) as TraceRecord[];
    } finally {
        database.close();
    }
    const entries = records.map((record) => JSON.stringify(record.entry)).join('\n');
    return new Blob(
        [
            'RTCStatsDump\n',
            `${JSON.stringify({
                fileFormat: 3,
                origin: window.location.origin,
                url: window.location.pathname,
            })}\n`,
            entries,
        ],
        {type: 'application/jsonl'},
    );
}

/**
 * Remove all entries of the session with the specified id.
 */
export async function removeRtcStatsSession(sessionId: RtcStatsSessionId): Promise<void> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction(OBJECT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const keys = await promisifyRequest(
            store.index(SESSION_INDEX_NAME).getAllKeys(IDBKeyRange.only(sessionId)),
        );
        for (const key of keys) {
            store.delete(key);
        }
        await promisifyTransaction(transaction);
    } finally {
        database.close();
    }
}

/**
 * Remove all stored rtcstats trace entries.
 */
export async function clearRtcStatsSessions(): Promise<void> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction(OBJECT_STORE_NAME, 'readwrite');
        transaction.objectStore(OBJECT_STORE_NAME).clear();
        await promisifyTransaction(transaction);
    } finally {
        database.close();
    }
}
