import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import path from 'node:path';

import {
    type FileId,
    type FileStorage,
    type ServicesForFileStorage,
    FileStorageError,
    randomFileId,
} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {fileModeInternalIfPosix} from '~/common/node/fs';
import {isNodeError} from '~/common/node/utils';
import {type ReadonlyUint8Array} from '~/common/types';
import {AsyncWeakValueMap} from '~/common/utils/map';

/**
 * A file storage backed by the file system.
 *
 * Note: This storage is backed by a WeakRef based cache. That means that two concurrent calls to
 *       `load` will only result in a single value in memory (and a single file read call). A call
 *       to `load` following a call to `store` will return the cached value, as long as the value
 *       returned by `store` hasn't yet been garbage collected.
 */
export class FileSystemFileStorage implements FileStorage {
    private readonly _cache = new AsyncWeakValueMap();

    /**
     * Create a file storage backed by the file system.
     *
     * @param _storageDirPath An existing and writable directory path the key
     *   storage should read from / write to.
     */
    public constructor(
        private readonly _services: ServicesForFileStorage,
        private readonly _log: Logger,
        private readonly _storageDirPath: string,
    ) {
        // Ensure that the storage directory exists.
        if (!fs.existsSync(this._storageDirPath)) {
            throw new FileStorageError(
                'dir-not-found',
                `File storage directory ${this._storageDirPath} does not exist`,
            );
        }
        this._log.debug(`File storage path: ${this._storageDirPath}`);
    }

    /** @inheritdoc */
    public async load(fileId: FileId): Promise<ReadonlyUint8Array> {
        const filepath = this._getFilepath(fileId);
        return await this._cache.getOrCreate(fileId, async () => {
            try {
                return await fsPromises.readFile(filepath);
            } catch (error) {
                // If file was not found: Return a 'not-found' error
                if (isNodeError(error)) {
                    if (error.code === 'ENOENT') {
                        throw new FileStorageError(
                            'not-found',
                            `File with ID ${fileId} not found`,
                            {from: error},
                        );
                    }
                }

                // Other errors: Wrap and re-throw
                throw new FileStorageError('read-error', `Could not load file with ID ${fileId}`, {
                    from: error,
                });
            }
        });
    }

    /** @inheritdoc */
    public async store(data: ReadonlyUint8Array): Promise<FileId> {
        const fileId = randomFileId(this._services.crypto);
        const filepath = this._getFilepath(fileId);

        // Store data in file system
        try {
            // Note: Opening the file in `wx` mode will fail if the file already exists.
            await fsPromises.writeFile(filepath, data as Uint8Array, {
                flag: 'wx',
                ...fileModeInternalIfPosix(),
            });
        } catch (error) {
            let message = `Could not write file with ID ${fileId}`;
            if (isNodeError(error)) {
                if (error.code === 'EEXIST') {
                    message += ': File already exists';
                }
            }
            throw new FileStorageError('write-error', message, {from: error});
        }

        // Update cache
        // eslint-disable-next-line @typescript-eslint/require-await
        await this._cache.getOrCreate(fileId, async () => data);

        return fileId;
    }

    /**
     * Return the file path to the given file ID.
     */
    private _getFilepath(id: FileId): string {
        return path.join(this._storageDirPath, id);
    }
}
