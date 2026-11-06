import * as fs from 'node:fs';

import {ensureError} from '@threema/ts-utils/meta/ensure-error';

import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {fileModeInternalObjectIfPosix} from '~/common/node/fs';
import {isNodeError} from '~/common/node/utils';

/**
 * Subset of the asynchronous `electron.safeStorage` API used to load and store the user password.
 *
 * Note: Only the asynchronous API is used, as the synchronous one is deprecated in Electron 45 and
 * removed in Electron 46.
 */
export interface UserPasswordSafeStorage {
    readonly isAsyncEncryptionAvailable: () => Promise<boolean>;
    readonly encryptStringAsync: (plainText: string) => Promise<Buffer>;
    readonly decryptStringAsync: (
        encrypted: Buffer,
    ) => Promise<{readonly shouldReEncrypt: boolean; readonly result: string}>;
    /**
     * Only meaningful on Linux.
     */
    readonly getSelectedStorageBackend: () => string;
}

export interface UserPasswordContext {
    readonly safeStorage: UserPasswordSafeStorage;
    readonly platform: NodeJS.Platform;
    /**
     * Path to the password file, see `getSafeStoragePasswordPath`.
     */
    readonly passwordFilePath: string;
    readonly log: Logger;
}

/**
 * Ciphertext prefix used by Chromium's OSCrypt on Linux when no secret store is available and the
 * data is encrypted with a hardcoded key (i.e. effectively plaintext).
 *
 * Note: On macOS and Windows, `v10` is the regular (secure) prefix, so this must only be checked on
 * Linux.
 */
const LINUX_INSECURE_PREFIX = 'v10';

/**
 * Returns the OSCrypt version prefix of the ciphertext (e.g. `v11`) for logging purposes. Never
 * returns anything other than the prefix, so that no ciphertext bytes end up in the log.
 */
function describePrefix(encrypted: Buffer): string {
    const prefix = encrypted.subarray(0, 3).toString('latin1');
    return /^v\d\d$/u.test(prefix) ? prefix : 'unknown';
}

function hasInsecurePrefix(context: UserPasswordContext, encrypted: Buffer): boolean {
    return context.platform === 'linux' && describePrefix(encrypted) === LINUX_INSECURE_PREFIX;
}

function describeBackend(context: UserPasswordContext): string {
    return context.platform === 'linux'
        ? `, backend=${context.safeStorage.getSelectedStorageBackend()}`
        : '';
}

function describeError(error: unknown): string {
    const code = isNodeError(error) && error.code !== undefined ? ` (${error.code})` : '';
    return `${extractErrorMessage(ensureError(error), 'short')}${code}`;
}

async function isAsyncEncryptionAvailable(context: UserPasswordContext): Promise<boolean> {
    try {
        return await context.safeStorage.isAsyncEncryptionAvailable();
    } catch (error) {
        context.log.warn(
            `Failed to determine safeStorage availability: ${describeError(error)}${describeBackend(context)}`,
        );
        return false;
    }
}

/**
 * Returns whether the password can be stored securely, i.e. whether async encryption is available
 * and does not use the insecure fallback with a hardcoded key.
 */
export async function isSecureStorageAvailable(context: UserPasswordContext): Promise<boolean> {
    if (!(await isAsyncEncryptionAvailable(context))) {
        return false;
    }

    // TODO(#82): `getSelectedStorageBackend` describes the legacy backend
    // selection. Once the `org.freedesktop.secrets` talk-name is removed from the Flatpak manifest,
    // it may report `basic_text` even though the secret portal encrypts securely. Re-evaluate this
    // check then (the ciphertext prefix check in `writeEncryptedPassword` may be the more robust
    // criterion).
    //
    // `basic_text` encrypts with a hardcoded key. `unknown` is only reported before the app is
    // ready, so refuse it defensively.
    if (context.platform === 'linux') {
        const backend = context.safeStorage.getSelectedStorageBackend();
        if (backend === 'basic_text' || backend === 'unknown') {
            return false;
        }
    }

    return true;
}

/**
 * Encrypts the password and atomically writes it to the password file (temporary file + rename).
 *
 * @returns the written ciphertext.
 * @throws if encryption fails, the insecure fallback was used, or the file cannot be written.
 */
async function writeEncryptedPassword(
    context: UserPasswordContext,
    password: string,
): Promise<Buffer> {
    const encrypted = await context.safeStorage.encryptStringAsync(password);
    if (hasInsecurePrefix(context, encrypted)) {
        throw new Error(
            `safeStorage used the insecure fallback (prefix ${LINUX_INSECURE_PREFIX}), refusing to write the password file`,
        );
    }

    const temporaryPath = `${context.passwordFilePath}.tmp`;
    try {
        // Remove a potential leftover first, so that the file mode is applied on creation
        fs.rmSync(temporaryPath, {force: true});
        fs.writeFileSync(temporaryPath, encrypted, fileModeInternalObjectIfPosix());
        fs.renameSync(temporaryPath, context.passwordFilePath);
    } catch (error) {
        fs.rmSync(temporaryPath, {force: true});
        throw error;
    }
    return encrypted;
}

/**
 * Loads and decrypts the user password from the password file.
 *
 * If the password was encrypted with an outdated key (e.g. with the legacy keyring key instead of
 * the secret portal key), it is re-encrypted and written back before returning. A failure to do so
 * is only logged.
 *
 * The password file is never deleted, even if it cannot be read or decrypted.
 *
 * @returns the password, or `undefined` if it is not available.
 */
export async function loadUserPassword(context: UserPasswordContext): Promise<string | undefined> {
    const {log, passwordFilePath, safeStorage} = context;

    if (!fs.existsSync(passwordFilePath)) {
        log.info('Password file not found, loading password skipped.');
        return undefined;
    }

    if (!(await isAsyncEncryptionAvailable(context))) {
        log.warn(
            `Electron safeStorage is not available (no password manager?), loading password skipped${describeBackend(context)}.`,
        );
        return undefined;
    }

    let encrypted: Buffer;
    try {
        encrypted = fs.readFileSync(passwordFilePath);
    } catch (error) {
        log.warn(`Failed to read the password file '${passwordFilePath}': ${describeError(error)}`);
        return undefined;
    }

    const prefix = describePrefix(encrypted);
    if (hasInsecurePrefix(context, encrypted)) {
        log.warn(
            `Password file is encrypted with the insecure fallback (prefix ${prefix}${describeBackend(context)})`,
        );
    }

    let decrypted: {readonly shouldReEncrypt: boolean; readonly result: string};
    try {
        // Note: Decrypt exactly once. `shouldReEncrypt` means that the ciphertext should be
        // re-encrypted and stored again, not that decryption should be repeated (the same
        // ciphertext would always yield the same flag). The `decryptStringAsync` typings in
        // Electron 45 wrongly suggest the latter, see the docs fix in
        // https://github.com/electron/electron/pull/55318.
        decrypted = await safeStorage.decryptStringAsync(encrypted);
    } catch (error) {
        log.warn(
            `Failed to decrypt the password (prefix ${prefix}${describeBackend(context)}): ${describeError(error)}`,
        );
        return undefined;
    }

    if (decrypted.shouldReEncrypt) {
        log.info(`Password should be re-encrypted (prefix ${prefix}), re-encrypting`);
        try {
            const reEncrypted = await writeEncryptedPassword(context, decrypted.result);
            log.info(`Password re-encrypted (prefix ${prefix} -> ${describePrefix(reEncrypted)})`);
        } catch (error) {
            log.warn(`Failed to re-encrypt the password: ${describeError(error)}`);
        }
    }

    return decrypted.result;
}

/**
 * Encrypts and stores the user password in the password file.
 *
 * @returns whether the password was stored.
 */
export async function storeUserPassword(
    context: UserPasswordContext,
    password: string,
): Promise<boolean> {
    if (!(await isSecureStorageAvailable(context))) {
        context.log.warn(
            `Secure safeStorage is not available (no password manager?), storing password skipped${describeBackend(context)}.`,
        );
        return false;
    }

    try {
        const encrypted = await writeEncryptedPassword(context, password);
        context.log.info(`Password stored (prefix ${describePrefix(encrypted)})`);
        return true;
    } catch (error) {
        context.log.error(`Failed to store or encrypt the password: ${describeError(error)}`);
        return false;
    }
}
