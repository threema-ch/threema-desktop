/**
 * This is a slightly modified version of vite's exported client.d.ts
 * (https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts) and
 * should be kept in sync.
 */

// eslint-disable-next-line jsdoc/no-bad-blocks
/* eslint-disable
   capitalized-comments,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/consistent-type-imports,
   @typescript-eslint/member-ordering,
   @typescript-eslint/method-signature-style,
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/unified-signatures,
*/
interface GlobOptions {
    as?: string;
}

interface ViteDefaultImportMeta {
    url: string;

    readonly hot?: import('vite/types/hot').ViteHotContext;

    readonly env: ImportMetaEnv;

    glob<Module = {[key: string]: any}>(
        pattern: string,
        options?: GlobOptions,
    ): Record<string, () => Promise<Module>>;

    globEager<Module = {[key: string]: any}>(
        pattern: string,
        options?: GlobOptions,
    ): Record<string, Module>;
}

// Built-in asset types
// see `src/constants.ts`

// images
declare module '*.jpg' {
    const src: string;
    export default src;
}
declare module '*.jpeg' {
    const src: string;
    export default src;
}
declare module '*.png' {
    const src: string;
    export default src;
}
declare module '*.gif' {
    const src: string;
    export default src;
}
declare module '*.svg' {
    const src: string;
    export default src;
}
declare module '*.ico' {
    const src: string;
    export default src;
}
declare module '*.webp' {
    const src: string;
    export default src;
}
declare module '*.avif' {
    const src: string;
    export default src;
}

// media
declare module '*.mp4' {
    const src: string;
    export default src;
}
declare module '*.webm' {
    const src: string;
    export default src;
}
declare module '*.ogg' {
    const src: string;
    export default src;
}
declare module '*.mp3' {
    const src: string;
    export default src;
}
declare module '*.wav' {
    const src: string;
    export default src;
}
declare module '*.flac' {
    const src: string;
    export default src;
}
declare module '*.aac' {
    const src: string;
    export default src;
}

// fonts
declare module '*.woff' {
    const src: string;
    export default src;
}
declare module '*.woff2' {
    const src: string;
    export default src;
}
declare module '*.eot' {
    const src: string;
    export default src;
}
declare module '*.ttf' {
    const src: string;
    export default src;
}
declare module '*.otf' {
    const src: string;
    export default src;
}

// other
declare module '*.webmanifest' {
    const src: string;
    export default src;
}
declare module '*.pdf' {
    const src: string;
    export default src;
}
declare module '*.txt' {
    const src: string;
    export default src;
}

declare module '*?raw' {
    const src: string;
    export default src;
}

declare module '*?url' {
    const src: string;
    export default src;
}

declare module '*?inline' {
    const src: string;
    export default src;
}
// eslint-disable-next-line jsdoc/no-bad-blocks
/* eslint-enable
   capitalized-comments,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/member-ordering,
   @typescript-eslint/method-signature-style,
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/unified-signatures,
*/

/**
 * Custom extensions provided by our own plugins.
 */

type BuildConfig = import('../../config/build').BuildConfig;

// IMPORTANT: Keep these in sync with vite.config.ts and theme.ts
interface ImportMetaEnv extends BuildConfig {
    readonly BASE_URL: string;
    readonly MODE: string;

    // Dev
    readonly DEV_SERVER_PORT: import('./types').u16;

    // Debug
    readonly DEBUG: boolean;

    // Build variables
    readonly BUILD_TARGET: import('../../config/build').BuildTarget;
    readonly BUILD_VERSION: string;
    // eslint-disable-next-line no-restricted-syntax
    readonly BUILD_VERSION_CODE: number;
    readonly BUILD_VARIANT: import('../../config/build').BuildVariant;
    readonly BUILD_ENVIRONMENT: import('../../config/build').BuildEnvironment;
    readonly APP_NAME: string;

    // Defaults
    readonly MAX_TEXT_MESSAGE_BYTES: import('./types').u53;
    readonly MAX_FILE_MESSAGE_BYTES: import('./types').u53;
    readonly MAX_FILE_MESSAGE_CAPTION_BYTES: import('./types').u53;

    // Version info
    readonly GIT_REVISION: string;
    readonly BUILD_HASH: string;

    // Paths
    readonly LOG_PATH: {
        readonly MAIN_AND_APP: readonly string[];
        readonly BACKEND_WORKER: readonly string[];
    };
    readonly KEY_STORAGE_PATH: readonly string[];
    readonly FILE_STORAGE_PATH: readonly string[];
    readonly DATABASE_PATH: readonly string[] | ':memory:';
    readonly ARGON2_MIN_MEMORY_BYTES: import('./types').u53;

    // Public-key pins (HPKP)
    readonly TLS_CERTIFICATE_PINS: import('./types').DomainCertificatePin[];

    // Crash reporting (only used for internal test builds on sandbox)
    readonly SENTRY_DSN: string | undefined;
    readonly MINIDUMP_ENDPOINT: string | undefined;

    // Verbose debug logging
    readonly VERBOSE_LOGGING: {
        readonly DB: boolean;
        readonly STORES: boolean;
    };
}

interface ImportMeta extends ViteDefaultImportMeta {
    /**
     * Injects a list of all bundled files.
     */
    outputFiles?: readonly string[];

    /**
     * Available environment variables.
     */
    readonly env: ImportMetaEnv;
}
