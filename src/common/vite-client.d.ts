/**
 * This is a modified version of Vite's exported client.d.ts and importMeta.d.ts
 * and must be kept in sync.
 *
 * When updating, diff with:
 *
 * - https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts
 * - https://github.com/vitejs/vite/blob/main/packages/vite/types/importMeta.d.ts
 */

/* eslint-disable jsdoc/no-bad-blocks */
/* eslint-disable
   capitalized-comments,
   no-restricted-syntax,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/consistent-type-imports,
   @typescript-eslint/member-ordering,
   @typescript-eslint/method-signature-style,
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/unified-signatures,
   import/no-default-export,
*/

/**
 * This section reflects importGlob.d.ts.
 *
 * - Remove all DOM references and strip `export`... sigh.
 */
interface ImportGlobOptions<Eager extends boolean, AsType extends string> {
    /**
     * Import type for the import url.
     */
    as?: AsType;
    /**
     * Import as static or dynamic
     *
     * @default false
     */
    eager?: Eager;
    /**
     * Import only the specific named export. Set to `default` to import the default export.
     */
    import?: string;
    /**
     * Custom queries
     */
    query?: string | Record<string, string | number | boolean>;
    /**
     * Search files also inside `node_modules/` and hidden directories (e.g. `.git/`). This might have impact on performance.
     *
     * @default false
     */
    exhaustive?: boolean;
}

type GeneralImportGlobOptions = ImportGlobOptions<boolean, string>;

interface KnownAsTypeMap {
    raw: string;
    url: string;
}

interface ImportGlobFunction {
    /**
     * Import a list of files with a glob pattern.
     *
     * Overload 1: No generic provided, infer the type from `eager` and `as`
     */
    <
        Eager extends boolean,
        As extends string,
        T = As extends keyof KnownAsTypeMap ? KnownAsTypeMap[As] : unknown,
    >(
        glob: string | string[],
        options?: ImportGlobOptions<Eager, As>,
    ): (Eager extends true ? true : false) extends true
        ? Record<string, T>
        : Record<string, () => Promise<T>>;
    /**
     * Import a list of files with a glob pattern.
     *
     * Overload 2: Module generic provided, infer the type from `eager: false`
     */
    <M>(
        glob: string | string[],
        options?: ImportGlobOptions<false, string>,
    ): Record<string, () => Promise<M>>;
    /**
     * Import a list of files with a glob pattern.
     *
     * Overload 3: Module generic provided, infer the type from `eager: true`
     */
    <M>(glob: string | string[], options: ImportGlobOptions<true, string>): Record<string, M>;
}

interface ImportGlobEagerFunction {
    /**
     * Eagerly import a list of files with a glob pattern.
     *
     * Overload 1: No generic provided, infer the type from `as`
     */
    <As extends string, T = As extends keyof KnownAsTypeMap ? KnownAsTypeMap[As] : unknown>(
        glob: string | string[],
        options?: Omit<ImportGlobOptions<boolean, As>, 'eager'>,
    ): Record<string, T>;
    /**
     * Eagerly import a list of files with a glob pattern.
     *
     * Overload 2: Module generic provided
     */
    <M>(
        glob: string | string[],
        options?: Omit<ImportGlobOptions<boolean, string>, 'eager'>,
    ): Record<string, M>;
}

/**
 * This section reflects importMeta.d.ts.
 *
 * - Rename `ImportMetaEnv` to `ViteDefaultImportMetaEnv` and strip all unnecessary properties.
 * - Rename `ImportMeta` to `ViteDefaultImportMeta` and strip all unnecessary properties.
 */
interface ViteDefaultImportMetaEnv {
    readonly BASE_URL: string;
}
interface ViteDefaultImportMeta {
    readonly url: string;
    readonly glob: ImportGlobFunction;
}

/**
 * This section reflects client.d.ts.
 *
 * - Move all CSS module declarations into the dom/vite-client.d.ts.
 * - Move WASM declarations into dom/vite-client.d.ts.
 * - Strip worker module declarations.
 */

// images
declare module '*.apng' {
    const src: string;
    export default src;
}
declare module '*.png' {
    const src: string;
    export default src;
}
declare module '*.jpg' {
    const src: string;
    export default src;
}
declare module '*.jpeg' {
    const src: string;
    export default src;
}
declare module '*.jfif' {
    const src: string;
    export default src;
}
declare module '*.pjpeg' {
    const src: string;
    export default src;
}
declare module '*.pjp' {
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

declare module '*.opus' {
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
/* eslint-enable
   capitalized-comments,
   no-restricted-syntax,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/member-ordering,
   @typescript-eslint/method-signature-style,
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/unified-signatures,
   import/no-default-export,
*/

/**
 * This section contains custom extensions provided by our own plugins and will
 * expand `ImportMetaEnv` and `ImportMeta`.
 */

// IMPORTANT: Keep these in sync with vite.config.ts and theme.ts
type BuildConfig = import('../../config/build').BuildConfig;
interface ImportMetaEnv extends ViteDefaultImportMetaEnv, BuildConfig {
    // Dev
    readonly DEV_SERVER_PORT: import('./types').u16;

    // Debug
    readonly DEBUG: boolean;

    // Build variables
    readonly BUILD_MODE: import('../../config/build').BuildMode;
    readonly BUILD_TARGET: import('../../config/build').BuildTarget;
    readonly BUILD_VERSION: string;
    // eslint-disable-next-line no-restricted-syntax
    readonly BUILD_VERSION_CODE: number;
    readonly BUILD_VARIANT: import('../../config/build').BuildVariant;
    readonly BUILD_ENVIRONMENT: import('../../config/build').BuildEnvironment;
    readonly BUILD_FLAVOR: import('../../config/build').BuildFlavor;

    // Names
    /** Name of the desktop app. */
    readonly APP_NAME: string;
    /** Name of the corresponding mobile app. */
    readonly MOBILE_APP_NAME: string;

    // URLs that can vary depending on build variant
    readonly URLS: {
        /** URL to the download and info page */
        readonly downloadAndInfo: {short: string; full: string};
        /**
         * URL to the download and info page for the *other* build variant (i.e. for consumer in a
         * work build, and vice versa)
         */
        readonly downloadAndInfoForOtherVariant: {short: string; full: string};
        /** URL to the overview page */
        readonly overview: {full: string};
        /** URL to the limitations FAQ page */
        readonly limitations: {full: string};
        /** URL to the "forgot password" FAQ page */
        readonly forgotPassword: {full: string};
        /** URL to the "reset profile" FAQ page */
        readonly resetProfile: {full: string};
    };

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
    readonly ELECTRON_SETTINGS_PATH: readonly string[];
    readonly ARGON2_MIN_MEMORY_BYTES: import('./types').u53;

    // Public-key pins (HPKP)
    readonly TLS_CERTIFICATE_PINS: import('./types').DomainCertificatePin[] | undefined;

    // Crash reporting (only used for internal test builds on sandbox)
    readonly SENTRY_DSN: string | undefined;
    readonly MINIDUMP_ENDPOINT: string | undefined;

    // Verbose debug logging
    readonly VERBOSE_LOGGING: {
        readonly ENDPOINT: boolean;
        readonly DB: boolean;
        readonly STORES: boolean;
        readonly EVENTS: boolean;
        readonly NETWORK: boolean;
        readonly ROUTER: boolean;
        readonly HOTKEY: boolean;
    };
}

interface ImportMeta extends ViteDefaultImportMeta {
    readonly env: ImportMetaEnv;
}
