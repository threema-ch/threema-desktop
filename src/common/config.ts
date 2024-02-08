import type * as oppf from '~/common/dom/backend/onprem/oppf';
import {unwrap} from '~/common/utils/assert';

import {ensurePublicKey, type PublicKey} from './crypto';
import type {u16, u32, u53} from './types';

/**
 * General project configuration.
 */
export interface Config {
    /**
     * The chat server's public permanent key.
     */
    readonly CHAT_SERVER_KEY: PublicKey;

    /**
     * Mediator server URL.
     */
    readonly MEDIATOR_SERVER_URL: string;

    /**
     * Minimum byte length of a mediator frame (i.e. just the common header).
     */
    readonly MEDIATOR_FRAME_MIN_BYTE_LENGTH: u32;

    /**
     * Maximum byte length of a mediator frame (i.e. common header plus payload).
     */
    readonly MEDIATOR_FRAME_MAX_BYTE_LENGTH: u32;

    /**
     * Delay until a reconnection attempt towards the mediator server may be made.
     */
    readonly MEDIATOR_RECONNECTION_DELAY_S: u53;

    /**
     * Directory server URL.
     */
    readonly DIRECTORY_SERVER_URL: string;

    /**
     * Blob server URLs.
     */
    readonly BLOB_SERVER_URLS: {
        uploadUrl: string;
        downloadUrl: string;
        doneUrl: string;
    };

    /**
     * Rendezvous server URL.
     */
    readonly RENDEZVOUS_SERVER_URL: string;

    /**
     * Update server URL.
     */
    readonly UPDATE_SERVER_URL: string;

    /**
     * Work API server URL.
     */
    readonly WORK_API_SERVER_URL: string;

    /**
     * Maximum amount of packets to be displayed.
     */
    readonly DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: u16;

    /**
     * Key storage path (relative to the app's data directory).
     */
    readonly KEY_STORAGE_PATH: readonly string[];

    /**
     * File storage directory path (relative to the app's data directory).
     */
    readonly FILE_STORAGE_PATH: readonly string[];

    /**
     * Database path (relative to the app's data directory) or the magic string `:memory:` (creating
     * an in-memory database).
     */
    readonly DATABASE_PATH: readonly string[] | ':memory:';

    // Note: User agent will not currently be applied by Chromium when doing calls from the DOM
    //       context. Instead, the default Electron user agent will be used. See
    //       https://bugs.chromium.org/p/chromium/issues/detail?id=571722
    /**
     * User agent used for network requests.
     */
    readonly USER_AGENT: string;
}

/**
 * All config properties that are always statically set, no matter if OnPrem or not.
 */
export type StaticConfig = Pick<
    Config,
    | 'MEDIATOR_FRAME_MAX_BYTE_LENGTH'
    | 'MEDIATOR_FRAME_MIN_BYTE_LENGTH'
    | 'MEDIATOR_RECONNECTION_DELAY_S'
    | 'USER_AGENT'
    | 'DEBUG_PACKET_CAPTURE_HISTORY_LENGTH'
    | 'KEY_STORAGE_PATH'
    | 'FILE_STORAGE_PATH'
    | 'DATABASE_PATH'
    | 'UPDATE_SERVER_URL'
>;

export const STATIC_CONFIG: StaticConfig = {
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 5,
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: import.meta.env.KEY_STORAGE_PATH,
    FILE_STORAGE_PATH: import.meta.env.FILE_STORAGE_PATH,
    DATABASE_PATH: import.meta.env.DATABASE_PATH,
    USER_AGENT: `Threema Desktop/${import.meta.env.BUILD_VERSION} (${
        import.meta.env.BUILD_VARIANT
    }, ${import.meta.env.BUILD_TARGET})`,
    UPDATE_SERVER_URL: import.meta.env.UPDATE_SERVER_URL,
};

/**
 * Takes the static hardcoded `blobBaseUrl` and returns the three sub URLS
 * Note: This function should only be used in non-OnPrem environments
 */
function createBlobUrls(blobBaseUrl: string): Config['BLOB_SERVER_URLS'] {
    return {
        uploadUrl: blobBaseUrl.concat('/upload'),
        downloadUrl: blobBaseUrl.concat('/{blobId}'),
        doneUrl: blobBaseUrl.concat('/{blobId}/done'),
    };
}

/**
 * Return the config if it is statically configured.
 *
 * @throws an error if one of the config entries was not set during build time.
 * */
export function createDefaultConfig(): Config {
    return {
        ...STATIC_CONFIG,
        CHAT_SERVER_KEY: ensurePublicKey(
            unwrap(Uint8Array.from(unwrap(import.meta.env.CHAT_SERVER_KEY))),
        ),
        MEDIATOR_SERVER_URL: unwrap(import.meta.env.MEDIATOR_SERVER_URL),
        WORK_API_SERVER_URL: unwrap(import.meta.env.WORK_API_SERVER_URL),
        DIRECTORY_SERVER_URL: unwrap(import.meta.env.DIRECTORY_SERVER_URL),
        BLOB_SERVER_URLS: createBlobUrls(unwrap(import.meta.env.BLOB_SERVER_URL)),
        RENDEZVOUS_SERVER_URL: unwrap(import.meta.env.RENDEZVOUS_SERVER_URL),
    };
}

/**
 * Given an OnPrem Config, creates the corresponding app config.
 * Note: This function should only be called in OnPrem environments.
 */
export function createConfigFromOppf(onPremConfig: oppf.Type): Config {
    return {
        ...STATIC_CONFIG,
        CHAT_SERVER_KEY: onPremConfig.chat.publicKey,
        MEDIATOR_SERVER_URL: onPremConfig.mediator.url,
        WORK_API_SERVER_URL: onPremConfig.work.url,
        DIRECTORY_SERVER_URL: onPremConfig.directory.url,
        BLOB_SERVER_URLS: {
            doneUrl: onPremConfig.mediator.blob.doneUrl,
            downloadUrl: onPremConfig.mediator.blob.downloadUrl,
            uploadUrl: onPremConfig.mediator.blob.uploadUrl,
        },
        RENDEZVOUS_SERVER_URL: onPremConfig.rendezvous.url,
    };
}
