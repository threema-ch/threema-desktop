import {PakoCompressor} from '~/common/compressor/pako';
import {CONFIG} from '~/common/config';
import {type ServicesForDatabaseFactory} from '~/common/db';
import {InMemoryDatabaseBackend} from '~/common/db/in-memory';
import {InMemoryFileStorage, type ServicesForFileStorageFactory} from '~/common/file-storage';
import {CONSOLE_LOGGER, type Logger, TagLogger} from '~/common/logging';
import {main} from '~/worker/backend/backend-worker';

export default function run(): void {
    // Start backend worker for web
    main(CONFIG, {
        // eslint-disable-next-line @typescript-eslint/require-await
        logging: (rootTag, defaultStyle) => TagLogger.styled(CONSOLE_LOGGER, rootTag, defaultStyle),
        fileStorage: (services: ServicesForFileStorageFactory, log: Logger) =>
            new InMemoryFileStorage(services.crypto),
        compressor: () => new PakoCompressor(),
        db: (services: ServicesForDatabaseFactory, log: Logger) => new InMemoryDatabaseBackend(log),
    });
}
