import * as fs from 'node:fs';
import * as path from 'node:path';

import {CONFIG} from '~/common/config';
import {type RawDatabaseKey, type ServicesForDatabaseFactory} from '~/common/db';
import {type ServicesForFileStorageFactory} from '~/common/file-storage';
import {type ServicesForKeyStorageFactory} from '~/common/key-storage';
import {CONSOLE_LOGGER, type Logger, TagLogger, TeeLogger} from '~/common/logging';
import {ZlibCompressor} from '~/common/node/compressor';
import {SqliteDatabaseBackend} from '~/common/node/db/sqlite';
import {FileSystemFileStorage} from '~/common/node/file-storage/system-file-storage';
import {directoryModeInternalObjectIfPosix} from '~/common/node/fs';
import {FileSystemKeyStorage} from '~/common/node/key-storage';
import {FileLogger} from '~/common/node/logging';
import {assert} from '~/common/utils/assert';
import {main} from '~/worker/backend/backend-worker';

export default async function run(): Promise<void> {
    // We need the app path before we can do anything.
    // Note: The path is sent from the app initialization code in src/app/app.ts
    const appPath: string = await new Promise((resolve) => {
        function appPathListener({data}: MessageEvent): void {
            assert(typeof data === 'string');
            self.removeEventListener('message', appPathListener);
            resolve(data);
        }
        self.addEventListener('message', appPathListener);
    });

    // Try to create a file logger.
    let fileLogger: FileLogger | undefined;
    const logPath = import.meta.env.LOG_PATH.BACKEND_WORKER;
    const logFilePath = path.join(appPath, ...logPath);
    if (import.meta.env.BUILD_ENVIRONMENT === 'sandbox') {
        try {
            fs.mkdirSync(path.dirname(logFilePath), {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
            fileLogger = await FileLogger.create(logFilePath);
        } catch (error) {
            CONSOLE_LOGGER.error(`Unable to create file logger (path: '${logFilePath}'):`, error);
        }
    }

    // Start backend worker for Electron
    main(CONFIG, {
        logging: (rootTag, defaultStyle) => {
            const tagLogging = TagLogger.styled(CONSOLE_LOGGER, rootTag, defaultStyle);
            if (fileLogger === undefined) {
                return tagLogging;
            }
            return TeeLogger.factory([tagLogging, TagLogger.unstyled(fileLogger, rootTag)]);
        },

        keyStorage: (services: ServicesForKeyStorageFactory, log: Logger) => {
            const {config} = services;
            const keyStoragePath = path.join(appPath, ...config.KEY_STORAGE_PATH);
            fs.mkdirSync(path.dirname(keyStoragePath), {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
            return new FileSystemKeyStorage(services, log, keyStoragePath);
        },

        fileStorage: (services: ServicesForFileStorageFactory, log: Logger) => {
            const {config} = services;
            const fileStoragePath = path.join(appPath, ...config.FILE_STORAGE_PATH);
            fs.mkdirSync(fileStoragePath, {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
            return new FileSystemFileStorage(services, log, fileStoragePath);
        },

        compressor: () => new ZlibCompressor(),

        db: (services: ServicesForDatabaseFactory, log: Logger, key: RawDatabaseKey) => {
            const {config} = services;

            // Instantiate backend
            const backend = SqliteDatabaseBackend.create(
                log,
                config.DATABASE_PATH === ':memory:'
                    ? config.DATABASE_PATH
                    : path.join(appPath, ...config.DATABASE_PATH),
                key,
            );

            // Run migrations
            backend.runMigrations();

            // Run a quick database self-test
            backend.selftest();

            return backend;
        },
    });

    // Let the app know that we're ready to initialise.
    //
    // Note: This is required because otherwise the app would race with our above `await` call and
    //       send us the initial data before the listener is even registered.
    self.postMessage(undefined);
}
