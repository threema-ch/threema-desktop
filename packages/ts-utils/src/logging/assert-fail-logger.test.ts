import {afterEach, describe, expect, it, vi} from 'vitest';

import {getAssertFailLogger, setAssertFailLogger} from './assert-fail-logger.js';

describe('assert fail logger', () => {
    afterEach(() => {
        // Note: The fail logger is module-level state, so clear it after every test.
        setAssertFailLogger(undefined);
    });

    it('returns undefined when no logger was set', () => {
        // Act & assert
        expect(getAssertFailLogger()).toBeUndefined();
    });

    it('returns the logger that was set', () => {
        // Arrange
        const logger = vi.fn();

        // Act
        setAssertFailLogger(logger);

        // Assert
        expect(getAssertFailLogger()).toBe(logger);
    });

    it('replaces a previously set logger', () => {
        // Arrange
        const first = vi.fn();
        const second = vi.fn();

        // Act
        setAssertFailLogger(first);
        setAssertFailLogger(second);

        // Assert
        expect(getAssertFailLogger()).toBe(second);
    });

    it('clears the logger when set to undefined', () => {
        // Arrange
        setAssertFailLogger(vi.fn());

        // Act
        setAssertFailLogger(undefined);

        // Assert
        expect(getAssertFailLogger()).toBeUndefined();
    });
});
