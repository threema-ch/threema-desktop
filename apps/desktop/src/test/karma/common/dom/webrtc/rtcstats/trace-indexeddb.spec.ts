import {expect} from 'chai';

import {
    clearRtcStatsSessions,
    getRtcStatsSessionDump,
    IndexedDbTrace,
    listRtcStatsSessions,
    MAX_SESSIONS,
    removeRtcStatsSession,
    RTCSTATS_DATABASE_NAME,
    type RtcStatsSessionId,
} from '~/common/dom/webrtc/rtcstats/trace-indexeddb';
import {tag, type u53} from '~/common/types';
import {NoopLoggerFactory} from '~/test/common/logging';

/**
 * Tag a deterministic test session id (tests need fixed timestamps for ordering assertions, so
 * they cannot use `createRtcStatsSessionId`).
 */
function asSessionId(id: string): RtcStatsSessionId {
    return tag<RtcStatsSessionId>(id);
}

/**
 * Wait until the session with the specified id contains at least `entryCount` entries.
 */
async function waitForEntries(sessionId: string, entryCount: u53): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        const sessions = await listRtcStatsSessions();
        if ((sessions.find((s) => s.sessionId === sessionId)?.entryCount ?? 0) >= entryCount) {
            return;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 10);
        });
    }
    throw new Error(
        `Timeout while waiting for ${entryCount} trace entries in session '${sessionId}'`,
    );
}

/**
 * Wait until exactly the specified session IDs (in order) are stored.
 */
async function waitForSessions(sessionIds: readonly string[]): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        const sessions = await listRtcStatsSessions();
        if (
            sessions.length === sessionIds.length &&
            sessions.every((session, index) => session.sessionId === sessionIds[index])
        ) {
            return;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 10);
        });
    }
    throw new Error(`Timeout while waiting for sessions [${sessionIds.join(', ')}]`);
}

async function deleteDatabase(): Promise<void> {
    await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(RTCSTATS_DATABASE_NAME);
        request.onsuccess = resolve;
        request.onerror = () => reject(new Error('Deleting the rtcstats database failed'));
    });
}

/**
 * Tests for the rtcstats IndexedDB trace backend.
 */
export function run(): void {
    describe('IndexedDbTrace', function () {
        const logging = new NoopLoggerFactory();
        let trace: IndexedDbTrace;

        this.beforeEach(async function () {
            trace = await IndexedDbTrace.create(logging.logger('rtcstats'));
        });

        this.afterEach(async function () {
            trace.close();
            await deleteDatabase();
        });

        it('drops entries traced without a session', async function () {
            trace.trace('createOffer', 'PC_0', undefined);
            trace.startSession(asSessionId('2024-01-01T00:00:00.000Z_test'));
            await waitForEntries('2024-01-01T00:00:00.000Z_test', 1);
            const sessions = await listRtcStatsSessions();
            expect(sessions.map((s) => s.sessionId)).to.deep.equal([
                '2024-01-01T00:00:00.000Z_test',
            ]);
        });

        it('exports a session as a valid RTCStatsDump', async function () {
            const sessionId = asSessionId('2024-01-01T00:00:00.000Z_test');
            const before = Date.now();
            trace.startSession(sessionId);
            trace.trace('createOffer', 'PC_0', {iceRestart: true}, 'co-0');
            trace.trace('onicecandidate', 'PC_0', null);
            await waitForEntries(sessionId, 3);

            const dump = await getRtcStatsSessionDump(sessionId);
            expect(dump.type).to.equal('application/jsonl');
            const lines = (await dump.text()).split('\n');
            expect(lines).to.have.length(5);

            // Header
            expect(lines[0]).to.equal('RTCStatsDump');
            const metadata: unknown = JSON.parse(lines[1] ?? '');
            expect(metadata).to.have.property('fileFormat', 3);

            // The first entry must be the 'create' metadata entry, carrying an absolute
            // timestamp as its time delta (the dump reader accumulates deltas starting from 0).
            const createEntry = JSON.parse(lines[2] ?? '') as unknown[];
            expect(createEntry[0]).to.equal('create');
            expect(createEntry[createEntry.length - 1]).to.be.greaterThanOrEqual(before);

            // Subsequent entries retain all trace arguments, with a small delta appended.
            const offerEntry = JSON.parse(lines[3] ?? '') as unknown[];
            expect(offerEntry.slice(0, 4)).to.deep.equal([
                'createOffer',
                'PC_0',
                {iceRestart: true},
                'co-0',
            ]);
            expect(offerEntry[4]).to.be.lessThan(before);

            // `undefined` values are serialized as `null` (matching upstream behavior).
            const candidateEntry = JSON.parse(lines[4] ?? '') as unknown[];
            expect(candidateEntry.slice(0, 3)).to.deep.equal(['onicecandidate', 'PC_0', null]);
        });

        it('separates entries by session and supports removal', async function () {
            trace.startSession(asSessionId('2024-01-01T00:00:00.000Z_a'));
            trace.trace('first', 'PC_0', undefined);
            trace.startSession(asSessionId('2024-01-01T00:00:01.000Z_b'));
            trace.trace('second', 'PC_1', undefined);
            await waitForEntries('2024-01-01T00:00:00.000Z_a', 2);
            await waitForEntries('2024-01-01T00:00:01.000Z_b', 2);

            const dump = await getRtcStatsSessionDump(asSessionId('2024-01-01T00:00:01.000Z_b'));
            const entries = (await dump.text())
                .split('\n')
                .slice(2)
                .map((line) => JSON.parse(line) as unknown[]);
            expect(entries.map((entry) => entry[0])).to.deep.equal(['create', 'second']);

            await removeRtcStatsSession(asSessionId('2024-01-01T00:00:00.000Z_a'));
            await waitForSessions(['2024-01-01T00:00:01.000Z_b']);

            await clearRtcStatsSessions();
            await waitForSessions([]);
        });

        it(`prunes to the newest ${MAX_SESSIONS} sessions`, async function () {
            const sessionIds = [...Array(MAX_SESSIONS + 2).keys()].map((index) =>
                asSessionId(`2024-01-01T00:00:0${index}.000Z_test`),
            );
            for (const sessionId of sessionIds) {
                trace.startSession(sessionId);
                await waitForEntries(sessionId, 1);
            }
            await waitForSessions(sessionIds.slice(-MAX_SESSIONS));
        });
    });
}

run();
