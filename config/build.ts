// Note: Because this file is imported from a lot of packaging code, avoid imports that access
// `import.meta.env` since that can lead to circular imports.
import type {u8, u53} from '~/common/types';

// Duplicate of the function in `assert.ts`. This is not an import, because that would lead to
// circular imports.
function unreachable(value: never, error?: Error): never {
    throw error ?? new Error('Unreachable code section!');
}

export const BUILD_ENTRIES = [
    'app',
    'cli',
    'electron-main',
    'electron-preload',
    'karma-tests',
    'mocha-tests',
] as const;
export type BuildEntry = (typeof BUILD_ENTRIES)[u53];

/**
 * Build modes:
 * - development: Used while developing
 * - production: Used for all release artifacts (including internal releases)
 */
export const BUILD_MODES = ['development', 'production'] as const;
/** See {@link BUILD_MODES}. */
export type BuildMode = (typeof BUILD_MODES)[u53];

/**
 * Build targets:
 * - cli: Builds the CLI
 * - electron: Builds the Electron-wrapped app
 */
export const BUILD_TARGETS = ['cli', 'electron'] as const;
/** See {@link BUILD_TARGETS}. */
export type BuildTarget = (typeof BUILD_TARGETS)[u53];

/**
 * Build variants:
 * - consumer: The regular Threema application for private end users
 * - work: Application for Threema Work customers
 */
export const BUILD_VARIANTS = ['consumer', 'work'] as const;
/** See {@link BUILD_VARIANTS}. */
export type BuildVariant = (typeof BUILD_VARIANTS)[u53];

/**
 * Build environments:
 * - sandbox: Connect to sandbox servers (only accessible from Threema-internal networks)
 * - live: Connect to live servers
 * - onprem: Connect to on-premises servers defined in the OPPF configuration file
 */
export const BUILD_ENVIRONMENTS = ['sandbox', 'live', 'onprem'] as const;
/** See {@link BUILD_ENVIRONMENTS}. */
export type BuildEnvironment = (typeof BUILD_ENVIRONMENTS)[u53];

/**
 * Build flavors: All valid combinations of build variant and build environment.
 */
export const BUILD_FLAVORS = [
    'consumer-sandbox',
    'consumer-live',
    'work-sandbox',
    'work-live',
    'work-onprem',
] as const satisfies `${BuildVariant}-${BuildEnvironment}`[];
/** See {@link BUILD_FLAVORS}. */
export type BuildFlavor = (typeof BUILD_FLAVORS)[u53];

/**
 * Return whether or not the specified string is a valid {@link BuildFlavor}.
 */
export function isValidBuildFlavor(flavor: string): flavor is BuildFlavor {
    return (BUILD_FLAVORS as unknown as string[]).includes(flavor);
}

/**
 * Determine the app name used for packaging.
 *
 * Note: Keep in sync with identical function in tools/dist-electron.cjs
 */
export function determineAppName(flavor: BuildFlavor): string {
    let name = 'Threema';
    switch (flavor) {
        case 'consumer-live':
            break;
        case 'consumer-sandbox':
            name += ' Green';
            break;
        case 'work-live':
            name += ' Work';
            break;
        case 'work-sandbox':
            name += ' Blue';
            break;
        case 'work-onprem':
            name += ' OnPrem';
            break;
        default:
            unreachable(flavor);
    }
    name += ' Beta';
    return name;
}

/**
 * Determine the name of the mobile app corresponding to this build flavor.
 */
export function determineMobileAppName(flavor: BuildFlavor): string {
    let name = 'Threema';
    switch (flavor) {
        case 'consumer-live':
            break;
        case 'consumer-sandbox':
            name += ' Green';
            break;
        case 'work-live':
            name += ' Work';
            break;
        case 'work-sandbox':
            name += ' Blue';
            break;
        case 'work-onprem':
            name += ' OnPrem';
            break;
        default:
            unreachable(flavor);
    }
    return name;
}

export interface BuildConfig {
    readonly CHAT_SERVER_KEY: readonly u8[] | undefined;
    readonly MEDIATOR_SERVER_URL: string | undefined;
    readonly DIRECTORY_SERVER_URL: string | undefined;
    readonly BLOB_SERVER_URL: string | undefined;
    readonly RENDEZVOUS_SERVER_URL: string | undefined;
    readonly WORK_API_SERVER_URL: string | undefined;
    readonly UPDATE_SERVER_URL: string;
    readonly SENTRY_DSN: string | undefined;
    readonly MINIDUMP_ENDPOINT: string | undefined;
}
