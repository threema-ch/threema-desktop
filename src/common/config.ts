import {type PublicKey} from './crypto';
import {type ReadonlyUint8Array, type u16, type u32, type u53} from './types';

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
     * Blob server URL.
     */
    readonly BLOB_SERVER_URL: string;

    /**
     * Update server URL.
     */
    readonly UPDATE_SERVER_URL: string;

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

    /**
     * User agent used for network requests.
     */
    readonly USER_AGENT: string;

    /**
     * Logging settings.
     */
    readonly LOGGING: {
        /**
         * Turn endpoint communication logging on/off.
         */
        readonly ENDPOINT_COMMUNICATION: boolean;
    };
}

/**
 * Default project configuration.
 *
 * Note: Only have the entrypoints import this in order to dynamically alter the configuration where
 *       needed.
 */
export const CONFIG: Config = {
    CHAT_SERVER_KEY: Uint8Array.from(
        import.meta.env.CHAT_SERVER_KEY,
    ) as ReadonlyUint8Array as PublicKey,
    MEDIATOR_SERVER_URL: import.meta.env.MEDIATOR_SERVER_URL,
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 5,
    DIRECTORY_SERVER_URL: import.meta.env.DIRECTORY_SERVER_URL,
    BLOB_SERVER_URL: import.meta.env.BLOB_SERVER_URL,
    UPDATE_SERVER_URL: import.meta.env.UPDATE_SERVER_URL,
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: import.meta.env.KEY_STORAGE_PATH,
    FILE_STORAGE_PATH: import.meta.env.FILE_STORAGE_PATH,
    DATABASE_PATH: import.meta.env.DATABASE_PATH,
    // Note: User agent will not currently be applied by Chromium when doing calls from the DOM
    //       context. Instead, the default Electron user agent will be used. See
    //       https://bugs.chromium.org/p/chromium/issues/detail?id=571722
    USER_AGENT: `Threema Desktop/${import.meta.env.BUILD_VERSION} (${
        import.meta.env.BUILD_VARIANT
    }, ${import.meta.env.BUILD_TARGET})`,
    LOGGING: {
        ENDPOINT_COMMUNICATION: false,
    },
};
