import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import path from 'node:path';
import {Writable} from 'node:stream';

import {adapter, WritableStream} from '~/common/dom/streams';
import {FileStorageError, type TempFileStorage} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import {directoryModeInternalObjectIfPosix, fileModeInternalIfPosix} from '~/common/node/fs';
import {isNodeError} from '~/common/node/utils';
import type {ReadonlyUint8Array} from '~/common/types';

/**
 * A temporary file storage, which is backed by the file system and is unencrypted (and therefore
 * assumed to be world-readable). Therefore, this should only be used for non-sensitive data, e.g.,
 * to store app update binaries.
 */
export class TempFileSystemFileStorage implements TempFileStorage {
    /**
     * Create a file storage backed by the file system.
     *
     * @param _storageDirPath An existing and writable directory path the temp storage should read
     *   from / write to.
     */
    public constructor(
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
    public async load(relativePath: string): Promise<ReadonlyUint8Array> {
        let filePath;
        try {
            filePath = await this.getFullFilePath(relativePath, {create: false});
        } catch (error) {
            throw new FileStorageError('read-error', `Could not get full file path`, {
                from: error,
            });
        }

        let file: fsPromises.FileHandle | undefined;
        let bytes: ReadonlyUint8Array;
        try {
            file = await fsPromises.open(filePath, 'r');
            bytes = new Uint8Array(await file.readFile());
        } catch (error) {
            // If file was not found: Return a 'not-found' error.
            if (isNodeError(error)) {
                if (error.code === 'ENOENT') {
                    throw new FileStorageError(
                        'not-found',
                        `File at path ${relativePath} not found`,
                        {from: error},
                    );
                }
            }

            // Other errors: Wrap and re-throw.
            throw new FileStorageError(
                'read-error',
                `Could not load file at path ${relativePath}: ${error}`,
                {
                    from: error,
                },
            );
        } finally {
            file
                ?.close()
                .catch((error: unknown) => this._log.warn(`Failed to close file: ${error}`));
        }

        this._log.debug(`Loaded file at path ${relativePath} (${bytes.byteLength} bytes)`);

        return bytes;
    }

    /** @inheritdoc */
    public async store(data: Uint8Array, relativePath: string): Promise<string> {
        let filePath;
        try {
            filePath = await this.getFullFilePath(relativePath, {create: true});
        } catch (error) {
            throw new FileStorageError('write-error', `Could not get full file path`, {
                from: error,
            });
        }

        // Open file for appending.
        let file: fsPromises.FileHandle | undefined;
        try {
            // Note: Opening the file in `wx` mode will fail if the file already exists.
            file = await fsPromises.open(filePath, 'wx', fileModeInternalIfPosix());
            await file.writeFile(data);
        } catch (openError) {
            let message = `Could not write file at path ${relativePath}`;
            if (isNodeError(openError)) {
                if (openError.code === 'EEXIST') {
                    message += ': File already exists';
                } else {
                    message += ` (${openError.code})`;
                }
            }
            throw new FileStorageError('write-error', message, {from: openError});
        } finally {
            file?.close().catch((closeError: unknown) => {
                throw new FileStorageError('write-error', `Failed to close file: ${closeError}`);
            });
        }

        return filePath;
    }

    /** @inheritdoc */
    public async createWritableStream(
        relativePath: string | string[],
    ): Promise<adapter.WritableStreamLike<Uint8Array>> {
        let filePath;
        try {
            filePath = await this.getFullFilePath(relativePath, {create: true});
        } catch (error) {
            throw new FileStorageError('write-error', `Could not get full file path`, {
                from: error,
            });
        }

        try {
            const writeStream = fs.createWriteStream(filePath, {
                autoClose: true,
                flags: 'wx',
                mode: fileModeInternalIfPosix(),
            });

            return adapter.createWritableStreamWrapper(
                WritableStream as adapter.WritableStreamLikeConstructor,
            )(Writable.toWeb(writeStream));
        } catch (error) {
            throw new FileStorageError(
                'write-error',
                `Could not create write stream for file at path ${relativePath}`,
                {from: error},
            );
        }
    }

    /** @inheritdoc */
    public async delete(relativePath: string): Promise<boolean> {
        let filePath;
        try {
            filePath = await this.getFullFilePath(relativePath, {create: false});
        } catch (error) {
            throw new FileStorageError('delete-error', `Could not get full file path`, {
                from: error,
            });
        }

        try {
            await fsPromises.unlink(filePath);
        } catch (error) {
            let message = `Could not delete file at path ${relativePath}`;
            if (isNodeError(error)) {
                if (error.code === 'ENOENT') {
                    // File does not exist.
                    return false;
                }
                message += ` (${error.code})`;
            }
            throw new FileStorageError('delete-error', message, {from: error});
        }

        this._log.debug(`Deleted file at path ${relativePath}`);
        return true;
    }

    /** @inheritdoc */
    public async clear(): Promise<void> {
        try {
            await this._removeDirectoryContents(this._storageDirPath);
        } catch (error: unknown) {
            throw new FileStorageError('delete-error', `Could not clear temp directory: ${error}`, {
                from: error,
            });
        }
    }

    /** @inheritdoc */
    public async getFullFilePath(
        relativePath: string | string[],
        options?: {create?: boolean},
    ): Promise<string> {
        const {create = false} = options ?? {};
        const filePath = path.join(
            this._storageDirPath,
            ...(Array.isArray(relativePath) ? relativePath : [relativePath]),
        );

        if (create) {
            const dir = path.dirname(filePath);
            this._log.debug(`Creating directory ${dir}`);
            await fsPromises.mkdir(dir, {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
        }

        return filePath;
    }

    /**
     * Removes all the contents (files and subdirectories) of the given directory.
     */
    private async _removeDirectoryContents(directoryPath: string): Promise<void> {
        const items = await fsPromises.readdir(directoryPath);

        for (const item of items) {
            const itemPath = path.join(directoryPath, item);
            const stats = await fsPromises.stat(itemPath);

            if (stats.isDirectory()) {
                await this._removeDirectoryContents(itemPath);
                await fsPromises.rmdir(itemPath);
            } else {
                await fsPromises.unlink(itemPath);
            }
        }
    }
}
