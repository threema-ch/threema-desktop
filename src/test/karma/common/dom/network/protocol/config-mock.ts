import type {Config} from '~/common/config';
import {ensurePublicKey} from '~/common/crypto';
import {randomBytes} from '~/common/dom/crypto/random';
import {ensureBaseUrl} from '~/common/network/types';

export const UNCONNECTABLE_URL = 'https://127.0.0.1:99999';

/**
 * This is a copy of the test config in `backend-mocks.ts`
 */
export const MOCK_URL = ensureBaseUrl('https://127.0.0.1:9999/', 'https:');
export const TEST_CONFIG: Config = {
    CHAT_SERVER_KEY: ensurePublicKey(randomBytes(new Uint8Array(32))),
    mediatorServerUrl: () => MOCK_URL,
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 1,
    DIRECTORY_SERVER_URL: MOCK_URL,
    BLOB_SERVER_URLS: {
        upload: () => MOCK_URL,
        download: () => MOCK_URL,
        done: () => MOCK_URL,
    },
    safeServerUrl: () => MOCK_URL,
    rendezvousServerUrl: () => MOCK_URL,
    UPDATE_SERVER_URL: MOCK_URL,
    WORK_SERVER_URL: MOCK_URL,
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    FILE_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    DATABASE_PATH: ':memory:',
    USER_AGENT: 'Threema Desktop Mocha Tests',
};
