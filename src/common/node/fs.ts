/**
 * File-system related functionality.
 */

import {S_IRGRP, S_IRUSR, S_IWUSR, S_IXGRP, S_IXUSR} from 'node:constants';
import * as process from 'node:process';

// eslint-disable-next-line no-restricted-syntax
export type ModeOrEmpty = {mode: number} | Record<string, never>;

/**
 * Permission for potentially sensitive directories: 0750.
 *
 * Warning: Support on Windows is missing!
 */
const MODE_DIRECTORY_INTERNAL =
    // eslint-disable-next-line no-bitwise
    S_IRUSR | S_IWUSR | S_IXUSR | S_IRGRP | S_IXGRP;

/**
 * On a POSIX system, this will return an object with the `mode` set to
 * {@link MODE_DIRECTORY_INTERNAL}. On Windows, an empty object is returned.
 */
export function directoryModeInternalIfPosix(): ModeOrEmpty {
    return process.platform === 'win32' ? {} : {mode: MODE_DIRECTORY_INTERNAL};
}

/**
 * Permission for potentially sensitive files: 0600.
 *
 * Warning: Support on Windows is only partial, or missing completely!
 * See https://github.com/nodejs/node/pull/42757.
 */
// eslint-disable-next-line no-bitwise
const MODE_FILE_INTERNAL = S_IRUSR | S_IWUSR;

/**
 * On a POSIX system, this will return an object with the `mode` set to {@link MODE_FILE_INTERNAL}.
 * On Windows, an empty object is returned.
 */
export function fileModeInternalIfPosix(): ModeOrEmpty {
    return process.platform === 'win32' ? {} : {mode: MODE_FILE_INTERNAL};
}
