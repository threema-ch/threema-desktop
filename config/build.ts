import {type u8, type u53} from '~/common/types';

export const BUILD_ENTRIES = [
    'app',
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
 * - electron: Runs standalone
 * - web: Runs in the browser
 */
export const BUILD_TARGETS = ['electron', 'web'] as const;
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
 */
export const BUILD_ENVIRONMENTS = ['sandbox', 'live'] as const;
/** See {@link BUILD_ENVIRONMENTS}. */
export type BuildEnvironment = (typeof BUILD_ENVIRONMENTS)[u53];

export interface BuildConfig {
    readonly CHAT_SERVER_KEY: readonly u8[];
    readonly MEDIATOR_SERVER_URL: string;
    readonly DIRECTORY_SERVER_URL: string;
    readonly BLOB_SERVER_URL: string;
    readonly UPDATE_SERVER_URL: string;
}
