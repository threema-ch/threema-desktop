import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import path from 'node:path';
import {Writable} from 'node:stream';

import {adapter, WritableStream} from '~/common/dom/streams';
import {FileStorageError, type TempFileStorage} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import {directoryModeInternalObjectIfPosix, fileModeInternalIfPosix} from '~/common/node/fs';

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
    public async createWritableStream(
        relativePath: string | string[],
    ): Promise<adapter.WritableStreamLike<Uint8Array>> {
        let filePath;
        try {
            filePath = await this._getFullFilePath(relativePath, {create: true});
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
    public async clear(subdir?: string): Promise<void> {
        try {
            const dir =
                subdir === undefined
                    ? this._storageDirPath
                    : path.join(this._storageDirPath, subdir);
            await this._removeDirectoryContents(dir);
        } catch (error: unknown) {
            throw new FileStorageError('delete-error', `Could not clear temp directory: ${error}`, {
                from: error,
            });
        }
    }

    /**
     * Return the full file path.
     *
     * If `options.create` is `true`, then the parent directories will be created if they don't yet
     * exist. Defaults to `false`.
     */
    private async _getFullFilePath(
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
        if (!fs.existsSync(directoryPath)) {
            this._log.debug(`Directory '${directoryPath}' does not exist. Not removing!`);
            return;
        }

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
