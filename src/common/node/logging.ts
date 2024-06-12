import * as fs from 'node:fs/promises';

import {CONSOLE_LOGGER, type Logger, type LogRecordFn} from '~/common/logging';

/**
 * Writes log messages to a file on a best-effort basis.
 */
export class FileLogger implements Logger {
    public readonly prefix: undefined;
    public readonly trace: LogRecordFn = this._write.bind(this, 'trace');
    public readonly debug: LogRecordFn = this._write.bind(this, 'debug');
    public readonly info: LogRecordFn = this._write.bind(this, 'info');
    public readonly warn: LogRecordFn = this._write.bind(this, 'warn');
    public readonly error: LogRecordFn = this._write.bind(this, 'error');

    public constructor(private readonly _handle: fs.FileHandle) {
        process.on('beforeExit', () => {
            this._handle.close().catch((error: unknown) => {
                CONSOLE_LOGGER.error('Unable to close log file before exiting:', error);
            });
        });
    }

    public static async create(filePath: string): Promise<FileLogger> {
        return new FileLogger(await fs.open(filePath, 'a', 0o644));
    }

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
        const entry = `${new Date().toISOString()} ${level}: ${data
            .map((item) => `${item}`)
            .join(' ')}\n`;
        this._handle.write(entry).catch((error: unknown) => {
            CONSOLE_LOGGER.error('Unable to write log entry:', error);
        });
    }
}
