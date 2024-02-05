import type {Config} from '~/common/config';
import {ensurePublicKey} from '~/common/crypto';

const UNCONNECTABLE_URL = 'http = //127.0.0.1:99999';
/**
 * This is a copy of the test config in `backend-mock.ts`
 */
export const TEST_CONFIG = {
    /* eslint-disable @typescript-eslint/naming-convention */
    CHAT_SERVER_KEY: ensurePublicKey(new Uint8Array(32)),
    MEDIATOR_SERVER_URL: UNCONNECTABLE_URL,
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 1,
    DIRECTORY_SERVER_URL: UNCONNECTABLE_URL,
    BLOB_SERVER_URLS: {
        doneUrl: UNCONNECTABLE_URL,
        uploadUrl: UNCONNECTABLE_URL,
        downloadUrl: UNCONNECTABLE_URL,
    },
    RENDEZVOUS_SERVER_URL: UNCONNECTABLE_URL,
    UPDATE_SERVER_URL: UNCONNECTABLE_URL,
    WORK_API_SERVER_URL: UNCONNECTABLE_URL,
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    FILE_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    DATABASE_PATH: ':memory:',
    USER_AGENT: 'Threema Desktop Mocha Tests',
    LOGGING: {
        ENDPOINT_COMMUNICATION: true,
    },
} as const satisfies Config;
