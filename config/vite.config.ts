import * as v from '@badrap/valita';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import * as fs from 'fs';
import {builtinModules} from 'module';
import {type RollupOptions} from 'rollup';
import {type ConfigEnv as ViteConfigEnv, type Plugin, type UserConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Imports cannot be absolute in this file.
import {KiB, MiB, type u53} from '../src/common/types';
import {assertUnreachable, unreachable} from '../src/common/utils/assert';
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
import {wasmPackPlugin} from './vite-plugins/wasm-pack';

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
                MEDIATOR_SERVER_URL: 'wss://mediator-{prefix4}.threema.ch/{prefix8}', // TODO(DESK-763): Production server
                DIRECTORY_SERVER_URL: 'https://ds-apip.threema.ch',
                BLOB_SERVER_URL: 'https://blob-mirror-{prefix4}.threema.ch/{prefix8}', // TODO(DESK-763): Production server
                UPDATE_SERVER_URL: 'https://releases.threema.ch/desktop/',
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
                MEDIATOR_SERVER_URL: 'wss://mediator-test.threema.ch',
                DIRECTORY_SERVER_URL: 'https://ds-apip.test.threema.ch',
                BLOB_SERVER_URL: 'https://blob-mirror-test.threema.ch',
                UPDATE_SERVER_URL: 'https://releases.threema.ch/desktop/',
            };
        default:
            return unreachable(environment);
    }
}

function determineAppName(env: ConfigEnv): string {
    let name = 'Threema';
    switch (`${env.variant}-${env.environment}`) {
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
            assertUnreachable(`Invalid flavor: ${env.variant}-${env.environment}`);
    }
    return `${name} Tech Preview`;
}

function makeConfig(
    pkg: PackageJson,
    env: ConfigEnv,
): Omit<ImportMeta['env'], 'BASE_URL' | 'MODE'> {
    return {
        // Dev
        DEV_SERVER_PORT: env.devServerPort,

        // Debug
        DEBUG: env.mode === 'development',

        // Build variables
        BUILD_TARGET: env.target,
        BUILD_VERSION: pkg.version,
        BUILD_VERSION_CODE: pkg.versionCode,
        BUILD_VARIANT: env.variant,
        BUILD_ENVIRONMENT: env.environment,
        APP_NAME: determineAppName(env),

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
    const [target, entry, variant, environment] = (process.env.VITE_MAKE?.split(',', 4) ??
        []) as readonly (string | undefined)[];

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
    if (!(BUILD_MODES as readonly string[]).includes(viteEnv.mode)) {
        console.error(`Unknown mode: ${viteEnv.mode}`);
        process.exit(1);
    }
    const env: ConfigEnv = {
        command: viteEnv.command,
        mode: viteEnv.mode as BuildMode,
        target: target as BuildTarget,
        entry: entry as BuildEntry,
        variant: variant as BuildVariant,
        environment: environment as BuildEnvironment,
        devServerPort: target === 'web' ? 9977 : 9988,
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
        ...builtinModules,
        ...builtinModules.map((mod) => `node:${mod}`),
    ];

    // Determine plugins
    const plugins: Record<string, Plugin | readonly Plugin[] | undefined> = {
        tsWorkerPlugin: env.entry === 'app' ? tsWorkerPlugin() : undefined,
        commonjsExternals:
            env.target === 'electron'
                ? cjsExternals({
                      externals: [
                          ...external,
                          // Electron externals
                          ...pkg.electron.external,
                      ].map(
                          (dependency: string) =>
                              new RegExp(`^${escapeRegex(dependency)}(\\/.+)?$`, 'u'),
                      ),
                  })
                : undefined,
        tsconfigPaths: tsconfigPaths({
            projects: [
                // Threema Svelte Components (#3sc)
                //
                // Note: We need to resolve the canonical path in order to avoid errors
                fs.realpathSync('./node_modules/threema-svelte-components/src/tsconfig.lib.json'),

                // Sources
                './app/tsconfig.json',
                './common/tsconfig.json',
                './common/dom/tsconfig.json',
                './common/node/tsconfig.json',
                './electron/tsconfig.json',
                './worker/backend/tsconfig.json',
                './worker/backend/electron/tsconfig.json',
                './worker/service/tsconfig.json',
                './service-worker-tsconfig.json',

                // Tests
                './test/common/tsconfig.json',
                './test/karma/tsconfig.json',
                './test/karma/app/tsconfig.json',
                './test/karma/common/tsconfig.json',
                './test/karma/common/dom/tsconfig.json',
                './test/karma/worker/backend/tsconfig.json',
                './test/karma/worker/service/tsconfig.json',
                './test/mocha/tsconfig.json',
                './test/mocha/app/tsconfig.json',
                './test/mocha/common/tsconfig.json',
            ],
        }),
        wasmPackPlugin: wasmPackPlugin(['@threema/compose-area/web']),
        svelte:
            env.entry === 'app'
                ? svelte({
                      configFile: '../svelte.config.js',
                  })
                : undefined,
    };

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

    // Common config
    return {
        root: './src',
        base: './',
        publicDir: env.entry === 'app' ? './public' : false,
        clearScreen: false,
        build: {
            target:
                env.target === 'web'
                    ? // Highest bar is currently: FinalizationRegistry
                      // https://caniuse.com/mdn-javascript_builtins_finalizationregistry
                      ['chrome84', 'firefox79']
                    : ['chrome96', 'node18'],
            outDir: `../build/${env.target}/${env.entry}`,
            emptyOutDir: true,
            assetsDir: '',
            assetsInlineLimit: 0,
            lib:
                env.entry === 'electron-main' || env.entry === 'electron-preload'
                    ? {
                          entry: `./electron/${env.entry}.ts`,
                          formats: ['es'],
                      }
                    : undefined,
            // TODO(DESK-781): Use: minify: env.mode === 'production',
            minify: false,
            rollupOptions,
        },
        optimizeDeps: {
            exclude: external,
        },
        define: {
            // Inject config into import.meta.env.*
            ...Object.fromEntries(
                Object.entries(config).map(([key, value]) => [
                    `import.meta.env.${key}`,
                    JSON.stringify(value),
                ]),
            ),

            // TODO(DESK-682): Inject output files from 'app' into 'service-worker via a plugin
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'import.meta.outputFiles': JSON.stringify([]),
        },
        plugins: Object.values(plugins)
            .filter((plugin) => plugin !== undefined)
            .flat(),
        server: {
            port: env.devServerPort,
            force: true, // TODO(DESK-782)
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
    };
}
