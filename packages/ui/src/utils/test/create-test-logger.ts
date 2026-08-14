import type {LogRecordFn, Logger} from '@threema/ts-utils/logging/logger';
import {type Mock, vi} from 'vitest';

/** A {@link Logger} whose log calls can be asserted on. */
export type TestLogger = {readonly [TKey in keyof Logger]: Mock<LogRecordFn>};

/**
 * Creates a logger whose log calls can be asserted on, for use in tests of components which take a
 * `log` prop.
 *
 * @returns The logger, with each of its log functions being a separate mock.
 */
export function createTestLogger(): TestLogger {
    return {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}
