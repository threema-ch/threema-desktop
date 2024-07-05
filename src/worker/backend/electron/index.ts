import * as fs from 'node:fs';
import * as path from 'node:path';

import initLibthreema, * as libthreema from 'libthreema';
import {STATIC_CONFIG} from '~/common/config';
import type {RawDatabaseKey, ServicesForDatabaseFactory} from '~/common/db';
import type {ServicesForFileStorageFactory} from '~/common/file-storage';
import type {ServicesForKeyStorageFactory} from '~/common/key-storage';
import {
    CONSOLE_LOGGER,
    createLoggerStyle,
    type Logger,
    type LoggerFactory,
    TagLogger,
    TeeLogger,
} from '~/common/logging';
import {ZlibCompressor} from '~/common/node/compressor';
import type {DbMigrationSupplements} from '~/common/node/db/migrations';
import {SqliteDatabaseBackend} from '~/common/node/db/sqlite';
import {loadElectronSettings} from '~/common/node/electron-settings';
import {FileSystemFileStorage} from '~/common/node/file-storage/system-file-storage';
import {directoryModeInternalObjectIfPosix} from '~/common/node/fs';
import {FileSystemKeyStorage} from '~/common/node/key-storage';
import {FileLogger} from '~/common/node/logging';
import {assert} from '~/common/utils/assert';
import {main} from '~/worker/backend/backend-worker';
import {BACKEND_WORKER_CONFIG} from '~/worker/backend/config';
import {INITIAL_MESSAGE_SCHEME, type InitialMessage} from '~/worker/backend/electron/types';

export async function run(): Promise<void> {
    // We need the app path before we can do anything.
    // Note: The path is sent from the app initialization code in src/app/app.ts
    const {appPath, oldProfilePath}: InitialMessage = await new Promise((resolve) => {
        function appPathListener({
            data,
        }: MessageEvent<{appPath: string; oldProfilePath: string | undefined}>): void {
            self.removeEventListener('message', appPathListener);

            // We make sure that the data received is of the correct type by assertions, since
            // the types specified above could fool us here.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const validatedMessage = INITIAL_MESSAGE_SCHEME.parse(data);
            resolve({
                appPath: validatedMessage.appPath,
                oldProfilePath: validatedMessage.oldProfilePath,
            });
        }
        self.addEventListener('message', appPathListener);
    });

    // Read electron settings
    const electronSettings = loadElectronSettings(appPath, {process: 'worker', log: undefined});

    // Try to create a file logger
    let fileLogger: FileLogger | undefined;
    if (electronSettings.logging.enabled) {
        const logPath = import.meta.env.LOG_PATH.BACKEND_WORKER;
        const logFilePath = path.join(appPath, ...logPath);
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

    function loggerFactory(rootTag: string, defaultStyle: string): LoggerFactory {
        const tagLogging = TagLogger.styled(CONSOLE_LOGGER, rootTag, defaultStyle);
        if (fileLogger === undefined) {
            return tagLogging;
        }
        return TeeLogger.factory([tagLogging, TagLogger.unstyled(fileLogger, rootTag)]);
    }

    // Local logger for initialization code
    const logging = loggerFactory('bw', BACKEND_WORKER_CONFIG.LOG_DEFAULT_STYLE);
    const initLog = logging.logger('init');
    initLog.info(`File logging is ${electronSettings.logging.enabled ? 'enabled' : 'disabled'}`);

    // Initialize WASM packages
    initLog.debug('Initializing WASM packages');
    await initLibthreema();
    const libthreemaLog = logging.logger('libthreema', createLoggerStyle('#5c2751', '#ffffff'));
    libthreema.initLogging(
        {
            debug: (message) => libthreemaLog.debug(message),
            info: (message) => libthreemaLog.info(message),
            warn: (message) => libthreemaLog.warn(message),
            error: (message) => libthreemaLog.error(message),
        },
        import.meta.env.DEBUG ? 'debug' : 'info',
    );
    // Start backend worker for Electron
    main({
        logging: loggerFactory,
        keyStorage: (
            services: ServicesForKeyStorageFactory,
            log: Logger,
            loadFromOldProfile?: boolean,
        ) => {
            const basePath = loadFromOldProfile === true ? oldProfilePath : appPath;
            assert(basePath !== undefined, 'Cannot create the key storage from an undefined path');
            const keyStoragePath = path.join(basePath, ...STATIC_CONFIG.KEY_STORAGE_PATH);
            fs.mkdirSync(path.dirname(keyStoragePath), {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
            return new FileSystemKeyStorage(services, log, keyStoragePath);
        },

        fileStorage: (
            services: ServicesForFileStorageFactory,
            log: Logger,
            loadFromOldProfile?: boolean,
        ) => {
            const basePath = loadFromOldProfile === true ? oldProfilePath : appPath;
            assert(basePath !== undefined, 'Cannot create the key storage from an undefined path');
            const fileStoragePath = path.join(basePath, ...STATIC_CONFIG.FILE_STORAGE_PATH);
            fs.mkdirSync(fileStoragePath, {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
            return new FileSystemFileStorage(services, log, fileStoragePath);
        },

        compressor: () => new ZlibCompressor(),

        db: (
            services: ServicesForDatabaseFactory,
            log: Logger,
            migrationSupplementaryInformation: DbMigrationSupplements,
            key: RawDatabaseKey,
            shouldExist: boolean,
            loadFromOldProfile?: boolean,
        ) => {
            const {config} = services;

            // Process database path
            let databasePath;
            if (config.DATABASE_PATH === ':memory:') {
                log.info('Using in-memory database');
                databasePath = ':memory:';
            } else {
                const basePath = loadFromOldProfile === true ? oldProfilePath : appPath;
                assert(
                    basePath !== undefined,
                    'Cannot create the key storage from an undefined path',
                );
                databasePath = path.join(basePath, ...config.DATABASE_PATH);
                if (!shouldExist) {
                    // Ensure that database does not exist. If necessary, remove leftover files from
                    // an incomplete join process.
                    fs.rmSync(databasePath, {force: true});
                } else {
                    // TODO(DESK-383): If `shouldExist` is true but DB does not exist, gracefully return to
                    // the UI, etc.
                }
            }

            // Instantiate backend
            const backend = SqliteDatabaseBackend.create(
                log,
                migrationSupplementaryInformation,
                databasePath,
                key,
            );

            // Run migrations
            backend.runMigrations();

            // Run a quick database self-test
            backend.checkIntegrity();

            return backend;
        },
    });

    // Let the app know that we're ready to initialise.
    //
    // Note: This is required because otherwise the app would race with our above `await` call and
    //       send us the initial data before the listener is even registered.
    self.postMessage(undefined);
}
