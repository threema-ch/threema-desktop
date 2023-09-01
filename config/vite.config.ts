import * as fs from 'node:fs';
import {builtinModules} from 'node:module';
import * as process from 'node:process';

import * as v from '@badrap/valita';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import type {RollupOptions} from 'rollup';
import type {ConfigEnv as ViteConfigEnv, UserConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Imports cannot be absolute in this file.
import {KiB, MiB, type u53} from '../src/common/types';
import {unreachable} from '../src/common/utils/assert';

import {
    BUILD_ENTRIES,
    BUILD_ENVIRONMENTS,
    BUILD_MODES,
    BUILD_TARGETS,
    BUILD_VARIANTS,
    type BuildEntry,
    type BuildEnvironment,
    type BuildMode,
    type BuildTarget,
    type BuildVariant,
} from './build';
import cjsExternals from './vite-plugins/cjs-externals';
import {tsWorkerPlugin} from './vite-plugins/ts-worker';

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
                MEDIATOR_SERVER_URL: 'wss://mediator-{prefix4}.threema.ch/{prefix8}',
                DIRECTORY_SERVER_URL: 'https://ds-apip.threema.ch',
                BLOB_SERVER_URL: 'https://blob-mirror-{prefix4}.threema.ch/{prefix8}',
                RENDEZVOUS_SERVER_URL: 'wss://rendezvous-{prefix4}.threema.ch/{prefix8}',
                WORK_API_SERVER_URL: 'https://ds-apip-work.threema.ch',
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
                MEDIATOR_SERVER_URL: 'wss://mediator-{prefix4}.test.threema.ch/{prefix8}',
                DIRECTORY_SERVER_URL: 'https://ds-apip.test.threema.ch',
                BLOB_SERVER_URL: 'https://blob-mirror-{prefix4}.test.threema.ch/{prefix8}',
                RENDEZVOUS_SERVER_URL: 'wss://rendezvous-{prefix4}.test.threema.ch/{prefix8}',
                WORK_API_SERVER_URL: 'https://ds-apip-work.test.threema.ch',
                UPDATE_SERVER_URL: 'https://releases.threema.ch/desktop/',

                // Only enabled for internal test builds on sandbox, if set through env variable
                SENTRY_DSN: process.env.SENTRY_DSN,
                MINIDUMP_ENDPOINT: process.env.MINIDUMP_ENDPOINT,
            };
        default:
            return unreachable(environment);
    }
}

function determineAppName(env: ConfigEnv): string {
    let name = 'Threema';
    const combination: `${BuildVariant}-${BuildEnvironment}` = `${env.variant}-${env.environment}`;
    switch (combination) {
        case 'consumer-live':
            break;
        case 'consumer-sandbox':
            name += ' Sandbox';
            break;
        case 'work-live':
            name += ' Work';
            break;
        case 'work-sandbox':
            name += ' Red';
            break;
        default:
            unreachable(combination);
    }
    return `${name} Beta`;
}

function determineMobileAppName(env: ConfigEnv): string {
    let name = 'Threema';
    const combination: `${BuildVariant}-${BuildEnvironment}` = `${env.variant}-${env.environment}`;
    switch (combination) {
        case 'consumer-live':
            break;
        case 'consumer-sandbox':
            name += ' Red';
            break;
        case 'work-live':
            name += ' Work';
            break;
        case 'work-sandbox':
            name += ' Work Red';
            break;
        default:
            unreachable(combination);
    }
    return name;
}

function determineUrls(env: ConfigEnv): ImportMeta['env']['URLS'] {
    let downloadAndInfoShort;
    let downloadAndInfoForOtherVariantShort;
    let overviewFull;
    switch (env.variant) {
        case 'consumer':
            downloadAndInfoShort = 'three.ma/md';
            downloadAndInfoForOtherVariantShort = 'three.ma/mdw';
            overviewFull = 'https://threema.ch/faq/md_overview';
            break;
        case 'work':
            downloadAndInfoShort = 'three.ma/mdw';
            downloadAndInfoForOtherVariantShort = 'three.ma/md';
            overviewFull = 'https://threema.ch/work/support/mdw_overview';
            break;
        default:
            unreachable(env.variant);
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
    };
}

function makeConfig(pkg: PackageJson, env: ConfigEnv): Omit<ImportMeta['env'], 'BASE_URL'> {
    return {
        // Dev
        DEV_SERVER_PORT: env.devServerPort,

        // Debug
        DEBUG: env.mode === 'development',

        // Build variables
        BUILD_MODE: env.mode,
        BUILD_TARGET: env.target,
        BUILD_VERSION: pkg.version,
        BUILD_VERSION_CODE: pkg.versionCode,
        BUILD_VARIANT: env.variant,
        BUILD_ENVIRONMENT: env.environment,
        APP_NAME: determineAppName(env),
        MOBILE_APP_NAME: determineMobileAppName(env),
        URLS: determineUrls(env),

        // Defaults
        /**
         * TODO(SE-266): Update (message) size limitation.
         */
        MAX_TEXT_MESSAGE_BYTES: 7000,
        MAX_FILE_MESSAGE_BYTES: 100 * MiB,
        MAX_FILE_MESSAGE_CAPTION_BYTES: 1000,

        // Version info
        GIT_REVISION: process.env.GIT_REVISION ?? '',
        BUILD_HASH: 'TODOTODOTODO', // TODO(DESK-154): Add build hash

        // Paths
        LOG_PATH: {
            MAIN_AND_APP: ['data', 'debug-app.log'],
            BACKEND_WORKER: ['data', 'debug-bw.log'],
        },
        KEY_STORAGE_PATH: ['data', 'keystorage.pb3'],
        FILE_STORAGE_PATH: ['data', 'files'],
        DATABASE_PATH: ['data', 'threema.sqlite'],
        ARGON2_MIN_MEMORY_BYTES: env.entry === 'mocha-tests' ? 100 * KiB : 128 * MiB,

        // Public-key pins (HPKP)
        TLS_CERTIFICATE_PINS: [
            {
                domain: '*.threema.ch',
                fingerprints: [
                    '8kTK9HP1KHIP0sn6T2AFH3Bq+qq3wn2i/OJSMjewpFw=',
                    'KKBJHJn1PQSdNTmoAfhxqWTO61r8O8bPi/JeGtP/6gg=',
                    'h2gHawxPZyMCiZSkJN0dQ4RsDxowVuTmuiNQyjeU+Sk=',
                    'HXqz8rMr6nBDdUX3CdyIwln8ym3qFUBwv4QGyMN2uEg=',
                    '2Vpy8qUQCqc2+Lg6BgRO8G6e6vh7NmvVHTljfwP/Pfk=',
                    'vGQZ8hm2h+km+q7rnJ7kF9S17BwSY0rbhwjz6nIupf0=',
                    'jsQHAHKQ2oOf3rvMn9GJVIKslkhLpODGOMPSxgLeIyo=',
                ],
            },
            {
                domain: '*.test.threema.ch',
                fingerprints: [
                    'Dvvb0s1E8Y2tG67GoyzIkmJNAebvOqQjz4TnPMq3yhI=',
                    'bmsGGaIGEs1HWAUIE082NSPYTURvChScDmE7PjL+5RQ=',
                ],
            },
            {
                domain: '*.sfu.threema.ch',
                fingerprints: [
                    'useMPV2qPBEgxVucMPuqexG27L64zFAksHh9BehZpY0=',
                    '88JttF0tDWrGT6g8H9uEZ0T8xosvZtZwWlsZuD4NvHA=',
                    'F82gDLif130AsVx454ZsMxPGl9EpzB5LqY39CzVKWDQ=',
                    'Jo4Re5X+mksn/Ankgrnov07caZwkkT8NezJMQf1i8cI=',
                ],
            },
        ],

        // Verbose debug logging
        VERBOSE_LOGGING: {
            DB: false,
            STORES: false,
        },

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
        tsWorkerPlugin: env.entry === 'app' ? tsWorkerPlugin() : undefined,
        commonjsExternals: cjsExternals({
            externals: [
                ...external,
                // Electron externals
                ...pkg.electron.external,
            ].map((dependency: string) => new RegExp(`^${escapeRegex(dependency)}(\\/.+)?$`, 'u')),
        }),
        tsconfigPaths: tsconfigPaths({
            projects: [
                // Libs
                fs.realpathSync('./node_modules/threema-svelte-components/src/tsconfig.lib.json'),

                // Sources
                './app/tsconfig.json',
                './common/tsconfig.json',
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
        svelte:
            env.entry === 'app'
                ? svelte({
                      configFile: '../svelte.config.js',
                  })
                : undefined,
    } as const;

    // Determine rollup options
    const rollupOptions: RollupOptions = {};
    switch (env.entry) {
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
        case 'electron-main':
        case 'electron-preload':
            rollupOptions.output = {
                entryFileNames: '[name].cjs',
            };
            break;
        default: // Nothing to do
    }
    if (plugins.tsWorkerPlugin !== undefined) {
        const plugin = plugins.tsWorkerPlugin;
        rollupOptions.output = {
            ...rollupOptions.output,
            assetFileNames: (asset) => plugin.synchronizeAsset(asset),
        };
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
                ['chrome110', 'node18'],
            outDir: `../build/${env.target}/${env.entry}`,
            emptyOutDir: true,
            assetsDir: '',
            assetsInlineLimit: 0,
            lib:
                env.entry === 'electron-main' || env.entry === 'electron-preload'
                    ? {
                          entry: `./electron/${env.entry}.ts`,
                          formats: ['cjs'],
                      }
                    : undefined,
            // TODO(DESK-781): Use: minify: env.mode === 'production',
            minify: false,
            reportCompressedSize: false,
            rollupOptions,
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
            fs: {
                strict: true,
                allow: ['.', '../libs', '../node_modules'],
            },
        },
        worker: {
            format: 'iife',
            plugins: Object.values(plugins)
                .filter((plugin) => plugin !== undefined && plugin !== plugins.svelte)
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
