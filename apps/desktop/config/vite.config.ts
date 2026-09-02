import * as fs from 'node:fs';
import {builtinModules} from 'node:module';
import * as process from 'node:process';

import * as v from '@badrap/valita';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import type {u53} from '@threema/ts-utils/integer/u53';
import {unreachable} from '@threema/ts-utils/meta/unreachable';
import cjsExternals from '@threema/vite-plugin-commonjs-externals';
import {subresourceIntegrityPlugin} from '@threema/vite-plugin-subresource-integrity';
import type {ConfigEnv as ViteConfigEnv, UserConfig, LibraryOptions, Rollup} from 'vite';
import istanbulPlugin from 'vite-plugin-istanbul';
import tsconfigPaths from 'vite-tsconfig-paths';

// Imports cannot be absolute in this file.
import {KiB, MiB} from '../src/common/types';

import {
    BUILD_ENTRIES,
    BUILD_MODES,
    BUILD_TARGETS,
    BUILD_ENVIRONMENTS,
    BUILD_VARIANTS,
    type BuildEntry,
    type BuildMode,
    type BuildTarget,
    type BuildFlavor,
    type BuildEnvironment,
    type BuildVariant,
    determineAppName,
    determineDeepLinkScheme,
    determineMobileAppName,
    isBuildFlavor,
} from './base';
import {readCustomConfig} from './custom-config.mjs';

/**
 * Minimal package.json schema, extracting some components we need.
 */
const PACKAGE_JSON_SCHEMA = v
    .object({
        version: v.string(),
        versionCode: v.number(),
        electron: v
            .object({
                external: v.array(v.string()),
            })
            .rest(v.unknown()),
    })
    .rest(v.unknown());

type PackageJson = Readonly<v.Infer<typeof PACKAGE_JSON_SCHEMA>>;

interface ConfigEnv {
    command: ViteConfigEnv['command'];
    mode: BuildMode;
    target: BuildTarget;
    entry: BuildEntry;
    variant: BuildVariant;
    environment: BuildEnvironment;
    devServerPort: u53;
}

// Note: Safe because we do not use .text or .exec
// eslint-disable-next-line threema/ban-stateful-regex-flags
const escapeRegexRe = /[/\\^$*+?.()|[\]{}]/gu;

function escapeRegex(value: string): string {
    return value.replace(escapeRegexRe, '\\$&');
}

/**
 * Read the mock OPPF public signing key produced by `tools/build-electron.mjs`. The matching
 * private key is held by the Playwright OPPF mock server so it can sign mock OPPFs at runtime.
 * Baking this public key into the build makes those signatures pass verification.
 *
 * Path is kept in sync with
 * `apps/desktop/src/test/playwright/mocks/onprem-provisioning-server/signing.ts`.
 */
function readOppfTestPublicKey(): string {
    const pubKeyPath = './.temp/playwright/oppf-signature-key.pub';

    try {
        return fs.readFileSync(pubKeyPath, 'utf8').trim();
    } catch (error) {
        throw new Error(
            `Failed to read mock OPPF public signing key at ${pubKeyPath}. Did you run a build first? Error: ${error}`,
        );
    }
}

/**
 * Determine the {@link BuildFlavor} based on {@link BuildVariant} and {@link BuildEnvironment}.
 *
 * @throws {Error} if an invalid combination is found (e.g. consumer-onprem).
 */
function determineBuildFlavor(variant: BuildVariant, environment: BuildEnvironment): BuildFlavor {
    const flavor = `${variant}-${environment}`;
    if (isBuildFlavor(flavor)) {
        return flavor;
    }
    throw new Error(`Unsupported build flavor: ${flavor}`);
}

/**
 * Create build config depending on the environment (either sandbox or live).
 */
function makeBuildConfig(environment: BuildEnvironment): BuildConfig {
    switch (environment) {
        case 'live':
            return {
                // prettier-ignore
                CHAT_SERVER_KEY: [
                    0x45, 0x0b, 0x97, 0x57, 0x35, 0x27, 0x9f, 0xde,
                    0xcb, 0x33, 0x13, 0x64, 0x8f, 0x5f, 0xc6, 0xee,
                    0x9f, 0xf4, 0x36, 0x0e, 0xa9, 0x2a, 0x8c, 0x17,
                    0x51, 0xc6, 0x61, 0xe4, 0xc0, 0xd8, 0xc9, 0x09,
                ],
                // TODO(DESK-821): Implement support for alternative server key
                MEDIATOR_SERVER_URL:
                    'wss://mediator-{deviceGroupIdPrefix4}.threema.ch/{deviceGroupIdPrefix8}/',
                DIRECTORY_SERVER_URL: 'https://ds-apip.threema.ch/',
                BLOB_SERVER_URL:
                    'https://blob-mirror-{deviceGroupIdPrefix4}.threema.ch/{deviceGroupIdPrefix8}/',
                SAFE_SERVER_URL: 'https://safe-{backupIdPrefix8}.threema.ch/',
                RENDEZVOUS_SERVER_URL:
                    'wss://rendezvous-{rendezvousPathPrefix4}.threema.ch/{rendezvousPathPrefix8}/',
                WORK_SERVER_LEGACY_URL: 'https://ds-apip-work.threema.ch/',
                WORK_SERVER_URL: 'https://work.threema.ch/',
                UPDATE_SERVER_URL: 'https://releases.threema.ch/desktop/',

                // We don't do any automatic crash reporting for our live (consumer) builds
                SENTRY_DSN: undefined,
                MINIDUMP_ENDPOINT: undefined,
            };
        case 'sandbox':
            return {
                // prettier-ignore
                CHAT_SERVER_KEY: [
                    0x5a, 0x98, 0xf2, 0x3d, 0xe6, 0x56, 0x05, 0xd0,
                    0x50, 0xdc, 0x00, 0x64, 0xbe, 0x07, 0xdd, 0xdd,
                    0x81, 0x1d, 0xa1, 0x16, 0xa5, 0x43, 0xce, 0x43,
                    0xaa, 0x26, 0x87, 0xd1, 0x9f, 0x20, 0xaf, 0x3c,
                ],
                MEDIATOR_SERVER_URL:
                    'wss://mediator-{deviceGroupIdPrefix4}.test.threema.ch/{deviceGroupIdPrefix8}/',
                DIRECTORY_SERVER_URL: 'https://ds-apip.test.threema.ch/',
                BLOB_SERVER_URL:
                    'https://blob-mirror-{deviceGroupIdPrefix4}.test.threema.ch/{deviceGroupIdPrefix8}/',
                SAFE_SERVER_URL: 'https://safe-{backupIdPrefix8}.threema.ch/', // Does not have a sandboxed version
                RENDEZVOUS_SERVER_URL:
                    'wss://rendezvous-{rendezvousPathPrefix4}.test.threema.ch/{rendezvousPathPrefix8}/',
                WORK_SERVER_LEGACY_URL: 'https://ds-apip-work.test.threema.ch/',
                WORK_SERVER_URL: 'https://work.test.threema.ch/',
                UPDATE_SERVER_URL: 'https://releases.threema.ch/desktop/',

                // Only enabled for internal test builds on sandbox, if set through env variable
                SENTRY_DSN: process.env.SENTRY_DSN,
                MINIDUMP_ENDPOINT: process.env.MINIDUMP_ENDPOINT,
            };

        // These will be loaded from an .oppf file while initializing the backend
        case 'onprem':
            return {
                CHAT_SERVER_KEY: undefined,
                MEDIATOR_SERVER_URL: undefined,
                DIRECTORY_SERVER_URL: undefined,
                BLOB_SERVER_URL: undefined,
                SAFE_SERVER_URL: undefined,
                RENDEZVOUS_SERVER_URL: undefined,
                WORK_SERVER_LEGACY_URL: undefined,
                WORK_SERVER_URL: undefined,
                UPDATE_SERVER_URL: 'https://releases.threema.ch/desktop/',

                // We don't do any automatic crash reporting for our on premise builds
                SENTRY_DSN: undefined,
                MINIDUMP_ENDPOINT: undefined,
            };
        default:
            return unreachable(environment);
    }
}

function determineUrls(
    buildFlavor: BuildFlavor,
    presetOppfUrl: {readonly full: string} | undefined,
): ImportMeta['env']['URLS'] {
    let downloadAndInfoShort;
    let downloadAndInfoForOtherVariantShort;
    let overviewFull;
    let support;
    switch (buildFlavor) {
        case 'consumer-live':
        case 'consumer-sandbox':
            downloadAndInfoShort = 'three.ma/md';
            downloadAndInfoForOtherVariantShort = 'three.ma/mdw';
            overviewFull = 'https://threema.ch/faq/md_overview';
            support = {full: 'https://threema.com/support-request'};
            break;

        case 'work-live':
        case 'work-sandbox':
            downloadAndInfoShort = 'three.ma/mdw';
            downloadAndInfoForOtherVariantShort = 'three.ma/md';
            overviewFull = 'https://threema.ch/work/support/mdw_overview';
            support = 'hidden' as const;
            break;

        case 'work-onprem':
            downloadAndInfoShort = 'three.ma/mdo';
            downloadAndInfoForOtherVariantShort = 'three.ma/md';
            overviewFull = 'https://threema.ch/work/support#onprem';
            support = 'hidden' as const;
            break;

        case 'custom-onprem':
            return {
                downloadAndInfo: 'hidden',
                downloadAndInfoForOtherVariant: 'hidden',
                overview: 'hidden',
                limitations: 'hidden',
                forgotPassword: 'hidden',
                resetProfile: 'hidden',
                presetOppfUrl,
                support: 'hidden',
            };

        default:
            unreachable(buildFlavor);
    }
    return {
        downloadAndInfo: {short: downloadAndInfoShort, full: `https://${downloadAndInfoShort}`},
        downloadAndInfoForOtherVariant: {
            short: downloadAndInfoForOtherVariantShort,
            full: `https://${downloadAndInfoForOtherVariantShort}`,
        },
        overview: {full: overviewFull},
        limitations: {full: 'https://threema.ch/faq/md_limit'},
        forgotPassword: {full: 'https://threema.ch/faq/md_password'},
        resetProfile: {full: 'https://threema.ch/faq/md_reset'},
        presetOppfUrl: undefined,
        support,
    };
}

function makeConfig(pkg: PackageJson, env: ConfigEnv): Omit<ImportMeta['env'], 'BASE_URL'> {
    const buildFlavor = determineBuildFlavor(env.variant, env.environment);

    let shortAppName;
    let appName;
    let deepLink: string | undefined = undefined;
    let presetOppfUrl: {readonly full: string} | undefined = undefined;
    if (buildFlavor === 'custom-onprem') {
        const currentConfigOrError = readCustomConfig();
        if (currentConfigOrError instanceof Error) {
            console.error('Failed to process `custom-onprem` config: ', currentConfigOrError);
            process.exit(1);
        }
        const currentConfig = currentConfigOrError;

        appName = currentConfig.appName;
        shortAppName = currentConfig.localizedAppName ?? currentConfig.appName;
        deepLink = determineDeepLinkScheme(buildFlavor, currentConfig.deepLinkScheme);
        presetOppfUrl =
            currentConfig.presetOppfUrl === undefined
                ? undefined
                : {full: currentConfig.presetOppfUrl};
    } else {
        shortAppName = 'Threema';
        deepLink = determineDeepLinkScheme(buildFlavor);
        appName = determineAppName(buildFlavor, 'Threema');
    }

    let buildPlatform: ImportMeta['env']['BUILD_PLATFORM'];
    switch (process.platform) {
        case 'darwin':
            buildPlatform = 'macos';
            break;
        case 'linux':
            buildPlatform = 'linux';
            break;
        case 'win32':
            buildPlatform = 'windows';
            break;
        default:
            throw new Error(`Build platform ${process.platform} is not supported`);
    }

    // In testing builds, an ephemeral OPPF signing keypair is generated by `build-electron.mjs` and
    // persisted to `.temp/playwright/oppf-signature-key{,.pub}`. The mock server signs OPPFs with
    // the private key. The public key below is baked into the build as a trusted signing key so
    // that signatures produced by the mock server pass verification at runtime.
    const ONPREM_CONFIG_TEST_PUBLIC_KEY = env.mode === 'testing' ? [readOppfTestPublicKey()] : [];

    // Trusted OnPrem config public signature keys
    const ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS = [
        'ek1qBp4DyRmLL9J5sCmsKSfwbsiGNB4veDAODjkwe/k=',
        'Hrk8aCjwKkXySubI7CZ3y9Sx+oToEHjNkGw98WSRneU=',
        '5pEn1T/5bhecNWrp9NgUQweRfgVtu/I8gRb3VxGP7k4=',
    ];

    return {
        // Dev
        DEV_SERVER_PORT: env.devServerPort,

        // Debug
        DEBUG: env.mode === 'development',
        // Debug-only override of the directory-provided SFU token, e.g. to authenticate against a
        // local SFU whose shared secret does not match the directory's.
        SFU_TOKEN: env.mode === 'development' ? process.env.SFU_TOKEN : undefined,

        // Build variables
        BUILD_PLATFORM: buildPlatform,
        BUILD_MODE: env.mode,
        BUILD_TARGET: env.target,
        BUILD_VERSION: pkg.version,
        BUILD_VERSION_CODE: pkg.versionCode,
        BUILD_VARIANT: env.variant,
        BUILD_ENVIRONMENT: env.environment,
        BUILD_FLAVOR: buildFlavor,
        SHORT_APP_NAME: shortAppName,
        APP_NAME: appName,
        MOBILE_APP_NAME: determineMobileAppName(buildFlavor, shortAppName),
        DEEP_LINK_SCHEME: deepLink,
        URLS: determineUrls(buildFlavor, presetOppfUrl),

        // Defaults
        /**
         * TODO(SE-266): Update (message) size limitation.
         */
        MAX_TEXT_MESSAGE_BYTES: 6000,
        MAX_FILE_MESSAGE_BYTES: 100 * MiB,
        MAX_FILE_MESSAGE_CAPTION_BYTES: 6000,

        // Version info
        GIT_REVISION: process.env.GIT_REVISION ?? '',
        BUILD_HASH: 'TODOTODOTODO', // TODO(DESK-154): Add build hash

        // Paths
        LOG_PATH: {
            MAIN_AND_APP: ['data', 'debug-app.log'],
            BACKEND_WORKER: ['data', 'debug-bw.log'],
        },
        DEPRECATED_KEY_STORAGE_PATH: ['data', 'keystorage.pb3'],
        KEY_STORAGE_PATH: ['data', 'keystorage.bin'],
        FILE_STORAGE_PATH: ['data', 'files'],
        DATABASE_PATH: ['data', 'threema.sqlite'],
        ELECTRON_SETTINGS_PATH: ['data', 'electron-settings.json'],
        ARGON2_MIN_MEMORY_BYTES: env.entry === 'mocha-tests' ? 100 * KiB : 128 * MiB,
        SAFE_STORAGE_PASSWORD_PATH: ['data', 'keystorage.password.bin'],

        // Trusted OnPrem config public signature keys
        ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS:
            env.mode === 'testing'
                ? [...ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS, ...ONPREM_CONFIG_TEST_PUBLIC_KEY]
                : [...ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS],

        // Public-key pins (HPKP)
        TLS_CERTIFICATE_PINS:
            env.environment !== 'onprem'
                ? [
                      {
                          fqdn: '*.threema.ch',
                          matchMode: 'include-subdomains',
                          spkis: [
                              'vGQZ8hm2h+km+q7rnJ7kF9S17BwSY0rbhwjz6nIupf0=',
                              '3L0bKTNfTwVUCjYqqhZXJIO03qC00bSnuxZFsb09OUo=',
                              'NN6Lb+2AE7CN3HWZKoWOe6mmHROOnywWoKZYWL1oHIU=',
                              'efJCZofFPR3oV/bBk0wmehqnhy3Vv+s9P+3sjhHem/E=',
                              '2Vpy8qUQCqc2+Lg6BgRO8G6e6vh7NmvVHTljfwP/Pfk=',
                              'KKBJHJn1PQSdNTmoAfhxqWTO61r8O8bPi/JeGtP/6gg=',
                          ].map((value) => ({
                              algorithm: 'sha256',
                              value,
                          })),
                      },
                      {
                          fqdn: '*.threema.com',
                          matchMode: 'include-subdomains',
                          spkis: [
                              'saKwtUPx8bCj9CW+c55nU2jb4aOpr0vBD8XMJveXq34=',
                              'nZWRY8rNSEqxjQDQjaunWlUL+YBOTK1xN5Bb0wMq/K0=',
                              '5AfgU7xFqhx5AS69cQZlAGv6JpmLm0A+Z6yBrLPOCP8=',
                              'GGSYKwkV3h6SRIY16Ixsh8LEKuGuhx3B4CamRde4xgY=',
                              'oD0JGdy32wZtoUT4n9ac3HLOgEosnx2kq+qaJnmtsQk=',
                              'j4n4RTr0MLfQ3gBmONIFreXDq5/Kkb2oquVTmq0n5pI=',
                          ].map((value) => ({
                              algorithm: 'sha256',
                              value,
                          })),
                      },
                      {
                          fqdn: '*.test.threema.ch',
                          matchMode: 'include-subdomains',
                          spkis: [
                              'Dvvb0s1E8Y2tG67GoyzIkmJNAebvOqQjz4TnPMq3yhI=',
                              'bmsGGaIGEs1HWAUIE082NSPYTURvChScDmE7PjL+5RQ=',
                          ].map((value) => ({
                              algorithm: 'sha256',
                              value,
                          })),
                      },
                      {
                          fqdn: '*.sfu.threema.ch',
                          matchMode: 'include-subdomains',
                          spkis: [
                              'useMPV2qPBEgxVucMPuqexG27L64zFAksHh9BehZpY0=',
                              '88JttF0tDWrGT6g8H9uEZ0T8xosvZtZwWlsZuD4NvHA=',
                              'F82gDLif130AsVx454ZsMxPGl9EpzB5LqY39CzVKWDQ=',
                              'Jo4Re5X+mksn/Ankgrnov07caZwkkT8NezJMQf1i8cI=',
                          ].map((value) => ({
                              algorithm: 'sha256',
                              value,
                          })),
                      },
                  ]
                : undefined,

        // Verbose debug logging
        VERBOSE_LOGGING: {
            CALLS: false,
            CALLS_MEDIA_CRYPTO: false,
            DB: false,
            ENDPOINT: false,
            EVENTS: false,
            HOTKEY: false,
            NETWORK: false,
            ROUTER: false,
            STORES: false,
        },

        // Feature flags
        FEATURES: {
            CONFERENCE_CALLS: env.environment === 'sandbox',
        },

        ALLOW_RTC_STATS_RECORDING: env.environment === 'sandbox',

        // Build config
        ...makeBuildConfig(env.environment),
    };
}

export default function defineConfig(viteEnv: ViteConfigEnv): UserConfig {
    const [target, entry, variant, environment] = process.env.VITE_MAKE?.split(',', 5) ?? [];
    if (!(BUILD_MODES as readonly string[]).includes(viteEnv.mode)) {
        console.error(
            `Expected one of the following modes (-m, --mode): ${BUILD_MODES.join(', ')}`,
        );
        console.error(`Got mode: ${viteEnv.mode}`);
        process.exit(1);
    }
    if (
        target === undefined ||
        entry === undefined ||
        variant === undefined ||
        environment === undefined ||
        !(BUILD_TARGETS as readonly string[]).includes(target) ||
        !(BUILD_ENTRIES as readonly string[]).includes(entry) ||
        !(BUILD_VARIANTS as readonly string[]).includes(variant) ||
        !(BUILD_ENVIRONMENTS as readonly string[]).includes(environment)
    ) {
        const usage =
            `VITE_MAKE=<${BUILD_TARGETS.join('|')}>,` +
            `<${BUILD_ENTRIES.join('|')}>,` +
            `<${BUILD_VARIANTS.join('|')}>,` +
            `<${BUILD_ENVIRONMENTS.join('|')}>`;
        console.error(`Expected environment variable ${usage}`);
        console.error(`Got VITE_MAKE=${process.env.VITE_MAKE ?? ''}`);
        process.exit(1);
    }
    const env: ConfigEnv = {
        command: viteEnv.command,
        mode: viteEnv.mode as BuildMode,
        target: target as BuildTarget,
        entry: entry as BuildEntry,
        variant: variant as BuildVariant,
        environment: environment as BuildEnvironment,
        devServerPort: 9988,
    };
    if (process.env.VITE_PORT !== undefined) {
        env.devServerPort = Number.parseInt(process.env.VITE_PORT, 10);
    } else {
        // Prevent conflicts when running multiple dev servers
        env.devServerPort =
            9000 +
            BUILD_TARGETS.indexOf(env.target) * 100 +
            BUILD_VARIANTS.indexOf(env.variant) * 10 +
            BUILD_ENVIRONMENTS.indexOf(env.environment);
    }

    // Load package.json
    const pkg = PACKAGE_JSON_SCHEMA.parse(
        JSON.parse(fs.readFileSync('./package.json', {encoding: 'utf8'})),
    );

    // Determine config
    const config = makeConfig(pkg, env);

    // External modules not to be bundled
    const external = [
        // Node builtin modules
        ...builtinModules.map((mod) => `node:${mod}`),
    ];

    // Determine plugins
    const plugins = {
        istanbul:
            env.entry === 'mocha-tests' || env.entry === 'karma-tests'
                ? istanbulPlugin({
                      nycrcPath:
                          env.entry === 'mocha-tests'
                              ? './.nycrc.mocha.json'
                              : './.nycrc.karma.json',
                      generatorOpts: {
                          sourceMaps: true,
                      },
                      forceBuildInstrument: true,
                  })
                : undefined,
        commonjsExternals: cjsExternals({
            externals: [
                ...external,
                // Electron externals
                ...pkg.electron.external,
            ].map((dependency: string) => new RegExp(`^${escapeRegex(dependency)}(\\/.+)?$`, 'u')),
        }),
        tsconfigPaths: tsconfigPaths({
            projects: [
                // Sources
                './app/tsconfig.json',
                './cli/tsconfig.json',
                './common/tsconfig.json',
                './common/enum/tsconfig.json',
                './common/dom/tsconfig.json',
                './common/node/tsconfig.json',
                './electron/tsconfig.json',
                './worker/backend/tsconfig.json',
                './worker/backend/electron/tsconfig.json',

                // Tests
                './test/common/tsconfig.json',
                './test/karma/tsconfig.json',
                './test/karma/app/tsconfig.json',
                './test/karma/common/tsconfig.json',
                './test/karma/common/dom/tsconfig.json',
                './test/karma/worker/backend/tsconfig.json',
                './test/mocha/tsconfig.json',
                './test/mocha/app/tsconfig.json',
                './test/mocha/common/tsconfig.json',
            ],
        }),
        // Tailwind CSS (used alongside the existing SCSS theme). Must come before the Svelte
        // plugin. Only relevant for the `app` entry, which is the only one that bundles CSS.
        tailwind: env.entry === 'app' ? tailwindcss() : undefined,
        svelte: env.entry === 'app' ? svelte({configFile: '../svelte.config.js'}) : undefined,
        // Calculates integrity hashes and adds them to `index.html` and `electron-main.cjs`.
        // Because the plugin transforms files that are written when the entry points `"app"` and
        // `"electron-main"` are built, it should run after the one of the two that is built the
        // last (so that integrity hashes are not added twice), which is `"electron-main"`.
        subresourceIntegrityPlugin:
            env.mode !== 'development' && env.entry === 'electron-main'
                ? subresourceIntegrityPlugin({
                      appOutDir: '../build/electron/app',
                      contentSecurityPolicyFile:
                          '../build/electron/electron-main/electron-main.cjs',
                      // Whitelist of files to add integrity hashes for. All files that are not
                      // matched by the following regexes will be blocked from executing at runtime.
                      // Note: The regexes must match the path of a file in the output bundle,
                      // relative to `appOutDir`.
                      htmlEntryPoints: /^(?:index|screenshare)\.html$/u,
                      scriptRegExp:
                          /^(?:cldr-.{8}|cldr-native-.{8}|data-.{8}|index-.{8}|messages-.{8})\.js$/u,
                      stylesheetRegExp: /^index-.{8}\.css$/u,
                      workerRegExp: /^(?:backend-worker-.{8}|media-crypto-worker-.{8})\.js$/u,
                      workerSrcBaseUrl: 'threemadesktop://app/',
                  })
                : undefined,
    } as const;

    // Determine rollup options
    let lib: LibraryOptions | undefined;
    const rollupOptions: {
        input?: Rollup.InputOption;
        output?: Rollup.OutputOptions;
    } = {};
    switch (env.entry) {
        case 'app':
            rollupOptions.input = {
                index: './src/index.html',
                screenshare: './src/screenshare.html',
            };
            break;
        case 'cli':
            lib = {
                entry: './cli/bin.ts',
                formats: ['cjs'],
            };
            rollupOptions.output = {
                entryFileNames: '[name].cjs',
            };
            break;
        case 'electron-main':
        case 'electron-preload':
        case 'screenshare-preload':
            lib = {
                entry: `./electron/${env.entry}.ts`,
                formats: ['cjs'],
            };
            rollupOptions.output = {
                entryFileNames: '[name].cjs',
            };
            break;
        case 'karma-tests':
            rollupOptions.input = './src/test/karma/run-specs.ts';
            rollupOptions.output = {
                entryFileNames: '[name].js',
                format: 'iife',
            };
            break;
        case 'mocha-tests':
            rollupOptions.input = './src/test/mocha/run-specs.ts';
            rollupOptions.output = {
                entryFileNames: '[name].cjs',
                format: 'iife',
            };
            break;
        default: // Nothing to do
    }

    // Common config
    return {
        root: './src',
        base: './',
        publicDir: env.entry === 'app' ? './public' : false,
        clearScreen: false,
        build: {
            target:
                // Highest bar is currently: FinalizationRegistry
                // https://caniuse.com/mdn-javascript_builtins_finalizationregistry
                ['chrome110', 'node22'],
            outDir: `../build/${env.target}/${env.entry}`,
            emptyOutDir: true,
            assetsDir: '',
            assetsInlineLimit: 0,
            lib,
            // TODO(DESK-781): Use: minify: env.mode === 'production',
            minify: false,
            reportCompressedSize: false,
            rollupOptions,
            sourcemap:
                env.entry === 'mocha-tests' || env.entry === 'karma-tests' ? 'inline' : false,
        },
        optimizeDeps: {
            exclude: [
                ...external,
                // Workaround for https://github.com/vitejs/vite/issues/8427
                '@threema/compose-area/web',
            ],
            force: true, // TODO(DESK-782)
        },
        define: {
            // Inject config into import.meta.env.*
            ...Object.fromEntries(
                Object.entries(config).map(([key, value]) => [
                    `import.meta.env.${key}`,
                    JSON.stringify(value),
                ]),
            ),
        },
        plugins: Object.values(plugins)
            .filter((plugin) => plugin !== undefined)
            .flat(),
        server: {
            port: env.devServerPort,
            strictPort: true,
            fs: {
                strict: true,
                allow: [
                    '.',
                    '../node_modules',
                    '../../../node_modules/',
                    '../../../packages/branding',
                    '../../../packages/libthreema-wasm/libs',
                ],
            },
            hmr: true,
        },
        worker: {
            format: 'iife',
            plugins: () =>
                Object.values(plugins)
                    .filter(
                        (plugin) =>
                            plugin !== undefined &&
                            plugin !== plugins.svelte &&
                            plugin !== plugins.tailwind,
                    )
                    .flat(),
        },
        experimental: {
            renderBuiltUrl: (filename) => {
                if (filename.startsWith('res/')) {
                    // DUCT-TAPE alarm! Vite is drunk and for some weird reason rewrites URLs in the
                    // post-css plugin to absolute paths even though `base` is relative and it should
                    // not do that.
                    return `./${filename}`;
                }

                // Default behaviour
                return undefined;
            },
        },
    };
}
