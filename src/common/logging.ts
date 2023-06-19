import {type ElectronIpc} from '~/common/electron-ipc';
import {type GroupId, type IdentityString} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Log function to log a record for a specific level.
 */
export type LogRecordFn = (...data: readonly unknown[]) => void;

/**
 * Log function to log an assertion in case `condition` is `false`.
 */
export type AssertLogRecordFn = (
    condition: boolean,
    ...data: readonly unknown[]
) => asserts condition;

/**
 * A generic logger interface.
 */
export interface Logger {
    /**
     * Tag and optional style.
     */
    readonly prefix: LogPrefix | undefined;

    // Log functions, compatible with `console`
    trace: LogRecordFn;
    debug: LogRecordFn;
    info: LogRecordFn;
    warn: LogRecordFn;
    error: LogRecordFn;
    assert: AssertLogRecordFn;
}

/**
 * A factory that initialies logging and hands out {@link Logger}
 * instances.
 */
export interface LoggerFactory<TTag extends string = string> {
    /**
     * Create a new logger instance with a specific tag that inherits
     * properties from the root logger.
     */
    logger: (tag: TTag, style?: string) => Logger;
}

/**
 * Log prefix: Tag and optional custom style.
 */
export type LogPrefix = [tag: string, style?: string];

// The global `console` exists in both Node and DOM, so we'll just assume it's
// available.
declare const console: Logger;

/**
 * Discards all log records.
 *
 * However, it does evaluate asserts and simply throws in case the assertion
 * fails.
 */
class NoopLogger implements Logger {
    public readonly prefix: undefined;
    public readonly trace = NoopLogger._noop;
    public readonly debug = NoopLogger._noop;
    public readonly info = NoopLogger._noop;
    public readonly warn = NoopLogger._noop;
    public readonly error = NoopLogger._noop;
    public readonly assert = NoopLogger._assert;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private static _noop(): void {}
    private static _assert(condition: boolean, ...data: readonly unknown[]): void {
        if (!condition) {
            throw new Error(`Assertion failed: ${data.join(' ')}`);
        }
    }
}
export const NOOP_LOGGER = new NoopLogger();

/**
 * Forwards all log records to the default `Console` logger.
 */
class ConsoleLogger implements Logger {
    public readonly prefix: undefined;
    public readonly debug = console.debug;
    public readonly trace = console.trace;
    public readonly info = console.info;
    public readonly warn = console.warn;
    public readonly error = console.error;

    /**
     * Works like {@link assert} but also logs a failed assertion to the
     * console.
     */
    public assert(condition: boolean, ...data: readonly unknown[]): asserts condition {
        if (!condition) {
            const message = `Assertion failed: ${data.join(' ')}`;
            this.error(message);
            throw new Error(message);
        }
    }
}
export const CONSOLE_LOGGER = new ConsoleLogger();

/**
 * Adds a prefix before forwarding log records to another logger. Optionally applies CSS styles to
 * the tag.
 */
export class TagLogger implements Logger {
    public readonly trace: LogRecordFn;
    public readonly debug: LogRecordFn;
    public readonly info: LogRecordFn;
    public readonly warn: LogRecordFn;
    public readonly error: LogRecordFn;
    public readonly assert: AssertLogRecordFn;

    public constructor(
        sink: Logger,
        display: {readonly tag: string; readonly style?: string},
        public readonly prefix: LogPrefix,
    ) {
        // Apply a tag to each log level type method of the logger
        if (display.style === undefined) {
            this.trace = sink.trace.bind(sink, display.tag);
            this.debug = sink.debug.bind(sink, display.tag);
            this.info = sink.info.bind(sink, display.tag);
            this.warn = sink.warn.bind(sink, display.tag);
            this.error = sink.error.bind(sink, display.tag);
            this.assert = (condition, ...data): void =>
                sink.assert(condition, display.tag, ...data);
        } else {
            const tag = `%c${display.tag}`;
            this.trace = sink.trace.bind(sink, tag, display.style);
            this.debug = sink.debug.bind(sink, tag, display.style);
            this.info = sink.info.bind(sink, tag, display.style);
            this.warn = sink.warn.bind(sink, tag, display.style);
            this.error = sink.error.bind(sink, tag, display.style);
            this.assert = (condition, ...data): void =>
                sink.assert(condition, tag, display.style, ...data);
        }
    }

    public static unstyled(sink: Logger, rootTag: string): LoggerFactory {
        return TagLogger._factory(sink, rootTag, undefined);
    }

    public static styled(sink: Logger, rootTag: string, defaultStyle: string): LoggerFactory {
        return TagLogger._factory(sink, rootTag, defaultStyle);
    }

    private static _factory(
        sink: Logger,
        rootTag: string,
        defaultStyle: string | undefined,
    ): LoggerFactory {
        return {
            logger: (tag, style) =>
                new TagLogger(
                    sink,
                    {
                        tag: `${rootTag}.${tag}`,
                        style: style ?? defaultStyle,
                    },
                    [tag, style],
                ),
        };
    }
}

/**
 * Forwards all log records to one or more loggers.
 */
export class TeeLogger implements Logger {
    public readonly trace: LogRecordFn = this._forward.bind(this, 'trace');
    public readonly debug: LogRecordFn = this._forward.bind(this, 'debug');
    public readonly info: LogRecordFn = this._forward.bind(this, 'info');
    public readonly warn: LogRecordFn = this._forward.bind(this, 'warn');
    public readonly error: LogRecordFn = this._forward.bind(this, 'error');

    public constructor(
        private readonly _sinks: readonly Logger[],
        public readonly prefix: LogPrefix,
    ) {}

    public static factory(factories: readonly LoggerFactory[]): LoggerFactory {
        return {
            logger: (tag, style) =>
                new TeeLogger(
                    factories.map((factory) => factory.logger(tag, style)),
                    [tag, style],
                ),
        };
    }

    /**
     * Works like {@link assert} but also forwards a failed assertion to the sink loggers.
     */
    public assert(condition: boolean, ...data: readonly unknown[]): asserts condition {
        if (!condition) {
            const message = `Assertion failed: ${data.join(' ')}`;
            try {
                this.error(message);
            } catch {
                // Ignore errors that are generated by the sinks, we will throw our own.
            }
            throw new Error(message);
        }
    }

    private _forward(
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
        ...data: readonly unknown[]
    ): void {
        for (const logger of this._sinks) {
            try {
                logger[level](...data);
            } catch {
                // We tried ¯\_(ツ)_/¯
            }
        }
    }
}

/**
 * TODO(DESK-684): Remove this. We already have an IPC abstraction.
 */
export class RemoteFileLogger implements Logger {
    public readonly prefix: undefined;
    public readonly trace: LogRecordFn = this._write.bind(this, 'trace');
    public readonly debug: LogRecordFn = this._write.bind(this, 'debug');
    public readonly info: LogRecordFn = this._write.bind(this, 'info');
    public readonly warn: LogRecordFn = this._write.bind(this, 'warn');
    public readonly error: LogRecordFn = this._write.bind(this, 'error');

    public constructor(private readonly _logToFile: ElectronIpc['logToFile']) {}

    /**
     * Works like {@link assert} but also logs a failed assertion to the file.
     */
    public assert(condition: boolean, ...data: readonly unknown[]): asserts condition {
        if (!condition) {
            const message = `Assertion failed: ${data.join(' ')}`;
            this.error(message);
            throw new Error(message);
        }
    }

    private _write(
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
        ...data: readonly unknown[]
    ): void {
        this._logToFile(level, data.map((item) => `${item}`).join(' ')).catch((error) => {
            CONSOLE_LOGGER.error('Unable to write log entry (via IPC):', error);
        });
    }
}

// TODO(DESK-607): replace occurences with groupDebugString
export function getGroupTag(identity: IdentityString, groupId: GroupId): string {
    return `group.${identity}.${u64ToHexLe(groupId)}`;
}

/**
 * Create a logger style with the specified background- and foreground-colors.
 */
export function createLoggerStyle(bg: string, fg: string): string {
    return `color: ${fg}; background-color: ${bg}; padding: .2em .3em; border-radius: 4px;`;
}
