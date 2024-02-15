import type {Config} from '~/common/config';
import {ensurePublicKey} from '~/common/crypto';

const MOCK_URL = 'https://127.0.0.1:9999';
/**
 * This is a copy of the test config in `backend-mock.ts`
 */
export const TEST_CONFIG = {
    /* eslint-disable @typescript-eslint/naming-convention */
    CHAT_SERVER_KEY: ensurePublicKey(new Uint8Array(32)),
    MEDIATOR_SERVER_URL: MOCK_URL,
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 1,
    DIRECTORY_SERVER_URL: MOCK_URL,
    BLOB_SERVER_URLS: {
        doneUrl: MOCK_URL,
        uploadUrl: MOCK_URL,
        downloadUrl: MOCK_URL,
    },
    RENDEZVOUS_SERVER_URL: MOCK_URL,
    UPDATE_SERVER_URL: MOCK_URL,
    WORK_API_SERVER_URL: MOCK_URL,
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    FILE_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    DATABASE_PATH: ':memory:',
    USER_AGENT: 'Threema Desktop Mocha Tests',
} as const satisfies Config;
