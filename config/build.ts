// Note: Because this file is imported from a lot of packaging code, avoid imports that access
// `import.meta.env` since that can lead to circular imports.
import type {u8} from '~/common/types';

export interface BuildConfig {
    readonly CHAT_SERVER_KEY: readonly u8[] | undefined;
    readonly MEDIATOR_SERVER_URL: string | undefined;
    readonly DIRECTORY_SERVER_URL: string | undefined;
    readonly BLOB_SERVER_URL: string | undefined;
    readonly SAFE_SERVER_URL: string | undefined;
    readonly RENDEZVOUS_SERVER_URL: string | undefined;
    readonly WORK_SERVER_URL: string | undefined;
    readonly UPDATE_SERVER_URL: string;
    readonly SENTRY_DSN: string | undefined;
    readonly MINIDUMP_ENDPOINT: string | undefined;
}
