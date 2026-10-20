// @ts-check

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {join, resolve} from 'node:path';
import process from 'node:process';
import url from 'node:url';

import * as v from '@badrap/valita';
import {flipFuses, FuseVersion, FuseV1Options} from '@electron/fuses';
import {GotDownloader} from '@electron/get';
import packager from '@electron/packager';
import {populateIgnoredPaths} from '@electron/packager/dist/copy-filter.js';
import debug from 'debug';
import fsExtra from 'fs-extra';

import {
    BUILD_FLAVORS,
    determineAppName,
    determineAppRdn,
    determineBinaryName,
    determineExtraBinaryName,
    isBuildPlatform,
} from '../config/base.js';
import {readCustomConfig} from '../config/custom-config.mjs';

import {BUILD_ENVIRONMENT_SCHEMA, BUILD_MODE_SCHEMA, BUILD_VARIANT_SCHEMA} from './common.mjs';

const log = debug('dist-electron');

const require = createRequire(import.meta.url);

/**
 * Print the given error message and exit the process.
 *
 * @param {string} message Error message to fail with.
 */
function fail(message) {
    console.error(message);
    process.exit(1);
}

/**
 * Allowlist matcher builder for `@electron/packager`. Returns a function which accepts a `path` and
 * tests whether it matches the given `directory` and `pattern`.
 *
 * @param {string} directory The base directory to match in.
 * @param {RegExp} pattern RegExp that should match the files and subdirectories to allow in
 *   `directory`.
 * @returns {(path: string) => "allow" | "continue" | "deny"} Matcher function.
 */
function allow(directory, pattern) {
    return (path) => {
        if (path === directory) {
            // It is the path itself; Continue walking recursively.
            return 'allow';
        }

        if (path.startsWith(directory)) {
            // It is within path; Continue walking recursively if allowed by the pattern.
            if (path.replace(directory, '').match(pattern)) {
                return 'allow';
            }
            return 'continue';
        }

        const parts = directory.split('/');
        for (const index of parts.keys()) {
            const sub = parts.slice(0, index + 1).join('/');
            if (path === sub) {
                // It is a sub-path of path; Continue walking recursively.
                return 'allow';
            }

            if (!path.startsWith(`${sub}/`)) {
                // It is either not a sub-path of path or a file not within path; Stop walking
                // recursively.
                return 'continue';
            }
        }

        // It is not within path; Stop walking recursively.
        return 'continue';
    };
}

/**
 * Set electron fuses to disable certain features in production builds, see
 * https://www.electronjs.org/docs/latest/tutorial/fuses.
 *
 * @param {string} binaryPath Path to the binary to set fuses for.
 * @param {import("../config/base").BuildMode} buildMode Build mode to set appropriate fuses for.
 */
async function setElectronFuses(binaryPath, buildMode) {
    console.log(`Setting electron fuses for ${binaryPath}`);
    await flipFuses(binaryPath, {
        version: FuseVersion.V1,
        // See: https://github.com/electron/fuses?tab=readme-ov-file#new-fuses.
        strictlyRequireAllFuses: true,
        resetAdHocDarwinSignature: process.platform === 'darwin' && process.arch === 'arm64',
        // Disable `ELECTRON_RUN_AS_NODE`.
        [FuseV1Options.RunAsNode]: false,
        // Enable cookie encryption. Note: Threema doesn't set any cookies, so this has no advantage.
        // On the other hand, it causes a keychain permission request to appear, which we don't want
        // if it has no benefit.
        [FuseV1Options.EnableCookieEncryption]: false,
        // Disable the `NODE_OPTIONS` environment variable.
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        // Disable the --inspect and --inspect-brk family of CLI options in non-testing builds.
        [FuseV1Options.EnableNodeCliInspectArguments]: buildMode === 'testing',
        // Enable validation of the app.asar archive on macOS.
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        // Enforce that Electron will only load your app from "app.asar" instead of its normal
        // search paths.
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
        // Load V8 Snapshot from `browser_v8_context_snapshot.bin` for the browser process
        // Note: Threema seems to crash on launch when setting this to true.
        [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
        // Changes whether pages loaded from the `file://` protocol are given privileges beyond what
        // they would receive in a traditional web browser.
        [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
    });
}

/**
 * A custom downloader for `@electron/get` that logs all requests.
 */
const LoggingDownloader = {
    /**
     * Download an artifact from an arbitrary URL to a file path on system.
     *
     * @param {string} sourceUrl URL of the file to download.
     * @param {string} targetFilePath Filesystem path to download the artifact to (including the
     *   file name.
     * @param {Partial<import('@electron/get').GotDownloaderOptions>} options Filesystem path to
     *   download the artifact to (including the file name).
     * @returns {Promise<void>}
     */
    download: (sourceUrl, targetFilePath, options) => {
        console.warn(
            `dist-electron.cjs: @electron/get is downloading artifact: url=${sourceUrl}, path=${targetFilePath}`,
        );

        return new GotDownloader().download(sourceUrl, targetFilePath, options);
    },
};

/**
 * Build and add an extra binary to the bundle. Note: The given path must contain a valid Rust
 * project.
 *
 * @param {string} baseAppName Name to use as the base for generating binary names, etc., e.g.
 *   "Threema".
 * @param {string[]} basePath The base path of the extra binary's Rust project.
 * @param {import("../config/base").BuildFlavor} flavor The app flavor.
 * @param {string} outputPath The output path to copy the extra binary to.
 * @param {string} outputName The name of the output binary without extension.
 * @param {string=} outputNameOverride Override for `outputName` when the binary is copied to the
 *   destination bundle.
 * @param {boolean} [isPrivilegedHelper=false] Whether the extra binary is a privileged helper.
 */
function buildAndBundleExtraBinary(
    baseAppName,
    basePath,
    flavor,
    outputPath,
    outputName,
    outputNameOverride,
    isPrivilegedHelper = false,
) {
    // Build binary.
    console.log(`🦀 Building extra binary ${outputName} for ${flavor} through cargo`);
    const buildResult = spawnSync('cargo build --release', {
        cwd: resolve(...basePath),
        encoding: 'utf8',
        shell: true,
        stdio: [null, 1, 2],
        env: {
            ...process.env,
            THREEMA_BUILD_FLAVOR: flavor,
        },
    });
    if (buildResult.status !== 0) {
        console.warn(buildResult);
        fail(`Building extra binary failed, exit code ${buildResult.status}`);
    }
    if (!isBuildPlatform(process.platform)) {
        fail(
            `Extra binary build error: Platform "${process.platform}" is not a valid build target`,
        );
        return;
    }

    // Copy extra binary into application dir.
    const extraBinaryPath = resolve(
        ...basePath,
        'target',
        'release',
        determineExtraBinaryName(process.platform, outputName),
    );
    if (!fs.existsSync(extraBinaryPath)) {
        fail(
            `Could not find extra binary after building, path\n    ${extraBinaryPath}\n    does not exist`,
        );
    }

    const extraBinaryDestinationName =
        outputNameOverride === undefined
            ? determineExtraBinaryName(process.platform, outputName)
            : determineExtraBinaryName(process.platform, outputNameOverride);
    const extraBinaryDestinationPath =
        // eslint-disable-next-line no-nested-ternary
        process.platform === 'darwin'
            ? !isPrivilegedHelper
                ? join(
                      outputPath,
                      determineBinaryName(flavor, process.platform, baseAppName),
                      'Contents',
                      'MacOS',
                      extraBinaryDestinationName,
                  )
                : join(
                      outputPath,
                      determineBinaryName(flavor, process.platform, baseAppName),
                      'Contents',
                      'Library',
                      'LaunchServices',
                      extraBinaryDestinationName,
                  )
            : join(outputPath, extraBinaryDestinationName);

    fsExtra.copySync(extraBinaryPath, extraBinaryDestinationPath, {
        errorOnExist: true,
        dereference: false,
        preserveTimestamps: false,
    });
    console.log(`Copied extra binary ${extraBinaryDestinationName} to output directory`);

    // On macOS, patch bundle executable in `Info.plist`.
    if (process.platform === 'darwin') {
        const appName = determineAppName(flavor, baseAppName);
        const plistPath = join(
            outputPath,
            determineBinaryName(flavor, process.platform, baseAppName),
            'Contents',
            'Info.plist',
        );
        const plist = fs
            .readFileSync(plistPath, 'utf8')
            .replace(
                /<key>CFBundleExecutable<\/key>(?<whitespace>[\s]+)<string>ThreemaDesktop<\/string>/u,
                `<key>CFBundleExecutable</key>$<whitespace><string>${extraBinaryDestinationName}</string>`,
            )
            // Typically, the `CFBundleDisplayName` is derived from the `executableName` provided to
            // `@electron/packager`. However, the display name is different to the name of the
            // executable in our case, so we need to override it.
            .replace(
                /<key>CFBundleDisplayName<\/key>(?<whitespace>[\s]+)<string>ThreemaDesktop<\/string>/u,
                `<key>CFBundleDisplayName</key>$<whitespace><string>${appName}</string>`,
            );
        fs.writeFileSync(plistPath, plist, 'utf8');
    }
}

/**
 * Package the application for the given parameters.
 *
 * @param {string} baseAppName Name to use as the base for generating binary names, etc., e.g.
 *   "Threema".
 * @param {import("../config/base").BuildEnvironment} environment The environment to build for.
 * @param {import("../config/base").BuildMode} mode Build mode to use.
 * @param {import("../config/base").BuildVariant} variant The app variant to build.
 */
async function packageApp(baseAppName, environment, mode, variant) {
    const appDir = resolve(import.meta.dirname, '..');

    // Determine app name.
    const flavor = /** @type {import("../config/base").BuildFlavor} */ (
        `${variant}-${environment}`
    );
    if (!BUILD_FLAVORS.includes(flavor)) {
        fail(`Packaging error: Unknown build flavor "${flavor}"`);
    }
    const appName = determineAppName(flavor, baseAppName);

    // Load package.json.
    const pkg = JSON.parse(fs.readFileSync(resolve(appDir, 'package.json'), 'utf-8'));

    /**
     * IMPORTANT: When using `pnpm` workspaces, dependencies are often hoisted to the repo root and
     * represented via symlinks. `@electron/packager`'s prune step (`flora-colossus`) expects a more
     * traditional `node_modules` layout *inside* the packaged directory.
     *
     * Therefore, we create a self-contained "deploy" directory with prod deps and point packager at
     * it.
     */
    const monorepoRootDir = resolve(appDir, '..', '..');
    const buildRootDir = resolve(monorepoRootDir, 'build', 'apps', 'desktop');
    const deployedAppDir = resolve(monorepoRootDir, 'temp');

    console.info(`📦 Preparing deploy directory via pnpm: ${deployedAppDir}`);
    fsExtra.removeSync(deployedAppDir);
    fsExtra.ensureDirSync(deployedAppDir);

    const deployResult = spawnSync(
        'pnpm',
        [
            '-C',
            monorepoRootDir,
            '--filter',
            pkg.name,
            '--prod',
            'deploy',
            deployedAppDir,
            '--ignore-scripts',
        ],
        {
            cwd: monorepoRootDir,
            encoding: 'utf8',
            env: {
                ...process.env,
                INIT_CWD: monorepoRootDir,
            },
            shell: true,
            stdio: [null, 1, 2],
        },
    );
    if (deployResult.status !== 0) {
        console.warn(deployResult);
        fail(`Packaging error: pnpm deploy failed, exit code ${deployResult.status}`);
    }

    // Rebuild native modules in the `deployedAppDir` for the Electron version we package with.
    const electronVersion = JSON.parse(
        fs.readFileSync(
            resolve(import.meta.dirname, '..', 'node_modules', 'electron', 'package.json'),
            'utf-8',
        ),
    ).version;

    console.info(`Rebuilding native modules for Electron ${electronVersion} in deploy directory`);

    const rebuildResult = spawnSync(
        'pnpm',
        [
            '-C',
            monorepoRootDir,
            '--filter',
            pkg.name,
            'exec',
            'electron-rebuild',
            '--module-dir',
            deployedAppDir,
            '--version',
            electronVersion,
        ],
        {
            cwd: monorepoRootDir,
            encoding: 'utf8',
            env: {
                ...process.env,
                INIT_CWD: monorepoRootDir,
            },
            shell: true,
            stdio: [null, 1, 2],
        },
    );
    if (rebuildResult.status !== 0) {
        console.warn(rebuildResult);
        fail(`Packaging error: electron-rebuild failed, exit code ${rebuildResult.status}`);
    }

    const options = /** @type {import('@electron/packager').Options} */ ({
        dir: deployedAppDir,
    });
    populateIgnoredPaths(options);

    // Build allow-list
    const allowances = Object.entries(pkg.electron.dist.include || {}).map(([directory, pattern]) =>
        allow(directory, new RegExp(pattern, 'u')),
    );
    log('#Rules:', allowances.length);

    if (!isBuildPlatform(process.platform)) {
        fail(`Packaging error: Platform "${process.platform}" is not a valid build target`);
        return;
    }

    // See: https://packages.electronjs.org/packager/v19.0.1/interfaces/Options.html#icon.
    let icon;
    let platformSpecificOptions = {};
    switch (process.platform) {
        case 'darwin': {
            const appBundleId = determineAppRdn(flavor, baseAppName);
            icon = resolve(
                import.meta.dirname,
                '..',
                'packaging',
                'assets',
                'icons',
                'mac',
                `${variant}-${environment}.icns`,
            );

            // Important: Keep this complementary to the `SMAuthorizedClients` value defined in the
            // helper's `Info.plist`.
            let smPrivilegedExecutables;
            switch (variant) {
                case 'consumer':
                    smPrivilegedExecutables = {
                        'ch.threema.threema-desktop-helper': `identifier "ch.threema.threema-desktop-helper" and anchor apple generic and certificate leaf[subject.OU] = ${process.env.APPLE_TEAM_ID} and certificate leaf[field.1.2.840.113635.100.6.1.13] /* exists */`,
                    };
                    break;

                case 'work':
                    smPrivilegedExecutables = {
                        'ch.threema.threema-work-desktop-helper': `identifier "ch.threema.threema-work-desktop-helper" and anchor apple generic and certificate leaf[subject.OU] = ${process.env.APPLE_TEAM_ID} and certificate leaf[field.1.2.840.113635.100.6.1.13] /* exists */`,
                    };
                    break;
                // TODO(DESK-1809): Derive identifiers from custom config.
                case 'custom':
                    smPrivilegedExecutables = {
                        'ch.threema.threema-work-desktop-helper': `identifier "ch.threema.threema-work-desktop-helper" and anchor apple generic and certificate leaf[subject.OU] = ${process.env.APPLE_TEAM_ID} and certificate leaf[field.1.2.840.113635.100.6.1.13] /* exists */`,
                    };
                    break;
                default:
                    throw new Error(
                        `SMPrivilegedExecutables cannot be determined for unknown variant: "${variant}"`,
                    );
            }

            platformSpecificOptions = {
                // Will be used as `CFBundleIdentifier` in Info.plist.
                appBundleId,
                // Will be used as `LSApplicationCategoryType` in Info.plist. See:
                // https://packages.electronjs.org/packager/v19.0.1/interfaces/Options.html#appCategoryType.
                appCategoryType: 'public.app-category.social-networking',
                darwinDarkModeSupport: true,
                extendInfo: {
                    LSFileQuarantineEnabled: true,
                    SMPrivilegedExecutables: smPrivilegedExecutables,
                },
            };
            break;
        }

        case 'win32': {
            icon = resolve(
                import.meta.dirname,
                '..',
                'packaging',
                'assets',
                'icons',
                'win',
                `${variant}-${environment}.ico`,
            );
            platformSpecificOptions = {
                // See: https://packages.electronjs.org/packager/v19.0.1/interfaces/Win32MetadataOptions.html.
                win32metadata: {
                    'CompanyName': pkg.author,
                    'ProductName': appName,
                    'InternalName': appName,
                    'FileDescription': pkg.description,
                    'requested-execution-level': 'asInvoker',
                },
            };
            break;
        }

        default:
            icon = undefined;
    }

    // Package app using `@electron/packager`.
    //
    // See: https://packages.electronjs.org/packager/v19.0.1/interfaces/Options.html.
    console.info('📦 Packaging application with @electron/packager');
    const [outputPath] = await packager({
        appCopyright: '© Threema AG – Released under the AGPL-3.0 license',
        name: appName,
        electronVersion,
        executableName: 'ThreemaDesktop',
        dir: deployedAppDir,
        out: resolve(buildRootDir, 'packaged'),
        asar: {
            // Exclude binary dependencies from the ASAR file, to avoid issues with code signing on
            // macOS.
            //
            // Context: If shared libraries are part of the ASAR file, they cannot be signed (only
            // the ASAR file as a whole is signed). macOS rejects the loading of unsigned native
            // libraries. By moving the libraries outside of the ASAR file, they can be signed.
            unpackDir: join('node_modules', '{better-sqlcipher,argon2}', `**`),
        },
        icon,
        extraResource: [
            resolve(
                import.meta.dirname,
                '..',
                'src',
                'public',
                'res',
                'icons',
                flavor,
                'icon-512.png',
            ),
            ...[16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256]
                .flatMap((size) => {
                    const base = `Square44x44Logo.targetsize-${size}`;
                    const modifiers = ['', '_altform-unplated', '_altform-lightunplated'];

                    return modifiers.map((mod) => `${base}${mod}.png`);
                })
                .concat(['StoreLogo.png', 'Square150x150Logo.png', 'Square44x44Logo.png'])
                .map((filename) =>
                    resolve(
                        import.meta.dirname,
                        '..',
                        'src',
                        'public',
                        'res',
                        'icons',
                        'msix',
                        flavor,
                        `${filename}`,
                    ),
                ),
        ],
        derefSymlinks: true,
        ignore: (path) => {
            // Deny: Default rules from `@electron/packager`.
            if (!Array.isArray(options.ignore)) {
                // `throw` is only used for type narrowing here, as `fail` will cause the script to
                // abort anyway.
                throw fail('Expected default ignore paths to be an array');
            }
            if (options.ignore?.some((rule) => path.match(rule))) {
                log(' !', path);
                return true;
            }

            // Deny: dotfiles.
            if (path.match(/\/\..+$/u)) {
                log(' !', path);
                return true;
            }

            // Go through rules list.
            for (const command of allowances) {
                switch (command(path)) {
                    case 'allow':
                        // Allowed: Continue walking recursively.
                        log(' +', path);
                        return false;
                    case 'deny':
                        // Denied: Stop walking recursively.
                        log(' -', path);
                        return true;
                    case 'continue':
                        // No decision: Continue traversing ruleset.
                        //
                        // log(' ?', path);
                        break;
                    default:
                        throw new Error('Unknown reply');
                }
            }

            // Default: Block.
            log('  ', path);
            return true;
        },
        overwrite: true,
        // The `deployedAppDir` is already a production-ready export, so no pruning necessary.
        prune: false,
        download: {
            // Use checksums provided by the electron package.
            checksums: JSON.parse(
                fs.readFileSync(require.resolve('electron/checksums.json'), 'utf-8'),
            ),
            // Override the downloader and log all download requests.
            downloader: LoggingDownloader,
        },
        ...platformSpecificOptions,
    });

    // Remove temporary deploy directory.
    fsExtra.removeSync(deployedAppDir);

    // Set electron fuses.
    const binaryPath = join(outputPath, determineBinaryName(flavor, process.platform, baseAppName));
    await setElectronFuses(binaryPath, mode);

    // Build launcher binary (unless the $SKIP_LAUNCHER_BINARY env var is set to "true").
    if (process.env.SKIP_LAUNCHER_BINARY !== 'true') {
        buildAndBundleExtraBinary(
            baseAppName,
            [import.meta.dirname, '..', 'src', 'rust', 'launcher'],
            flavor,
            outputPath,
            'ThreemaDesktopLauncher',
        );

        if (process.platform === 'darwin') {
            // On macOS, also bundle the privileged helper binary (required by the launcher binary
            // for updating).
            buildAndBundleExtraBinary(
                baseAppName,
                [import.meta.dirname, '..', 'src', 'rust', 'helper'],
                flavor,
                outputPath,
                'ThreemaDesktopHelper',
                `${determineAppRdn(flavor, baseAppName)}-helper`,
                true,
            );
        }
    }

    console.info(`Packaged: ${outputPath}`);
}

const TURBO_BUILD_ENV_SCHEMA = v
    .object({
        TURBO_BUILD_ENVIRONMENT: BUILD_ENVIRONMENT_SCHEMA,
        TURBO_BUILD_MODE: BUILD_MODE_SCHEMA.optional(() => 'production'),
        TURBO_BUILD_VARIANT: BUILD_VARIANT_SCHEMA,
    })
    .rest(v.union(v.string(), v.undefined()));

// TODO(DESK-2041): Replace with `import.meta.main` after upgrading to NodeJS 22.18.0 or higher.
if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    // Parse dist build environment switches.
    const config = TURBO_BUILD_ENV_SCHEMA.try(process.env, {mode: 'passthrough'});
    if (!config.ok) {
        console.error(`Failed to determine dist build configuration: ${config.message}`);
        process.exit(1);
    }
    const {
        TURBO_BUILD_ENVIRONMENT: environment,
        TURBO_BUILD_MODE: mode,
        TURBO_BUILD_VARIANT: variant,
    } = config.value;

    // Custom builds require a custom app name to be set.
    let customAppName;
    // Doesn't need to be whitelisted for `turbo`, as it's set by Vite.
    //
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    if (variant === 'custom' && process.env.APP_NAME === undefined) {
        const customConfigOrError = readCustomConfig();
        if (customConfigOrError instanceof Error) {
            console.error('Failed to process `custom-onprem` config: ', customConfigOrError);
            process.exit(1);
        }
        customAppName = customConfigOrError.appName;
    }
    const baseAppName = customAppName ?? 'Threema';

    await packageApp(baseAppName, environment, mode, variant).catch((error) => {
        fail(error);
    });
}
