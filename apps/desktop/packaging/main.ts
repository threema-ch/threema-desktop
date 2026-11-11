/**
 * Prepare distribution packages.
 */

import {
    type ExecFileSyncOptionsWithStringEncoding,
    execFileSync,
    spawnSync,
} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import * as v from '@badrap/valita';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
import type {ElectronInstallerDMGOptions} from 'electron-installer-dmg';
import {ensureDirSync} from 'fs-extra/esm';

import {
    type BuildFlavor,
    determineAppIdentifier,
    determineAppName,
    determineAppRdn,
    determineMsixApplicationId,
    isBuildFlavor,
} from '../config/base.js';
import {readCustomConfig} from '../config/custom-config.mjs';
import {BUILD_ENVIRONMENT_SCHEMA, BUILD_VARIANT_SCHEMA} from '../tools/common.mjs';

// ANSI escape codes
const ANSI_GREEN = '\u001b[0;32m';
const ANSI_YELLOW = '\u001b[0;33m';
const ANSI_RED = '\u001b[0;31m';
const ANSI_RESET = '\u001b[0m';

// Platform info
const IS_WINDOWS = process.platform === 'win32';

/**
 * Required environment variables when building a binary package.
 */
const TURBO_PACKAGE_ENV_SCHEMA = v.object({
    TURBO_BUILD_ENVIRONMENT: BUILD_ENVIRONMENT_SCHEMA,
    TURBO_BUILD_VARIANT: BUILD_VARIANT_SCHEMA,
    TURBO_PACKAGE_SIGNATURE: v
        .union(v.literal('true'), v.literal('false'))
        .optional(() => 'false')
        .map((value) => {
            switch (value) {
                case 'true':
                    return true;
                case 'false':
                    return false;
                default:
                    return unreachable(value);
            }
        }),
});

/**
 * Logging.
 */
const log = {
    log: (logger: (msg: string) => void, color: string, prefix: string, msg: string) =>
        logger(`${color}${prefix} ${msg}${ANSI_RESET}`),
    major: (msg: string) => log.log(console.info, ANSI_GREEN, '==>', msg),
    minor: (msg: string) => log.log(console.info, ANSI_GREEN, '-->', msg),
    warning: (msg: string) => log.log(console.info, ANSI_YELLOW, '-->', msg),
    error: (msg: string) => log.log(console.error, ANSI_RED, '!!!', msg),
} as const;

/**
 * Error handling.
 */
function fail(errormsg: string): never {
    log.error(errormsg);
    process.exit(1);
}

function unreachable(value: never, message?: string): never {
    throw new Error(message ?? 'Unreachable code section!');
}

// eslint-disable-next-line @typescript-eslint/no-restricted-types
function unwrap<T>(value: T | null | undefined, message?: string): T {
    if (value === undefined || value === null) {
        fail(message ?? 'Unwrap failed');
    }
    return value;
}

/**
 * Run {@link execFileSync} and retry it up to `retries` times (with a fixed `delayMs` in between)
 * if it fails, e.g. due to transient network errors. Throws the last error if all attempts fail.
 */
function execFileSyncWithRetry(
    file: string,
    args: readonly string[],
    options: Parameters<typeof execFileSync>[2],
    {retries, delayMs}: {readonly retries: number; readonly delayMs: number},
): void {
    for (let attempt = 1; ; attempt++) {
        try {
            execFileSync(file, args, options);
            return;
        } catch (error) {
            if (attempt > retries) {
                throw error;
            }
            log.warning(
                `Command "${file} ${args.join(' ')}" failed (attempt ${attempt}/${retries + 1}), retrying in ${delayMs / 1000}s`,
            );
            TIMER.sleepSync(delayMs);
        }
    }
}

/**
 * Check if the specified binary is present on the $PATH.
 *
 * Unless running on CI, if a `required` command is not available, print a warning message.
 * Otherwise, if the command is not available, exit with an error message.
 */
function checkCommandAvailability(command: string, required = false): boolean {
    const exists =
        spawnSync(IS_WINDOWS ? 'where.exe' : 'which', [command], {shell: false}).status === 0;
    if (exists) {
        return true;
    }
    if (required || process.env.GITLAB_CI === 'true') {
        fail(`Binary '${command}' is required but cannot be found on your PATH`);
    } else {
        log.warning(
            `Binary '${command}' cannot be found on your PATH: some steps might be skipped`,
        );
    }
    return false;
}

/**
 * Ensure that the specified binary is present on the $PATH.
 *
 * If not, exit with an error message.
 */
function requireCommand(command: string): void {
    checkCommandAvailability(command, true);
}

/**
 * Minimal package.json schema, extracting some components we need.
 */
const PACKAGE_JSON_SCHEMA = v
    .object({
        version: v.string(),
        versionCode: v.number(),
        devDependencies: v
            .object({
                electron: v.string(),
            })
            .rest(v.unknown()),
    })
    .rest(v.unknown());

type PackageJson = Readonly<v.Infer<typeof PACKAGE_JSON_SCHEMA>>;

function readPackageJson(dirs: Directories): PackageJson {
    // Note: Theoretically it should be possible to import the package.json file directly, but I
    // couldn't get it to work
    const packageJson = fs.readFileSync(path.join(dirs.packageRoot, 'package.json'), {
        encoding: 'utf8',
    });
    return PACKAGE_JSON_SCHEMA.parse(JSON.parse(packageJson));
}

/**
 * Directory paths.
 */
interface Directories {
    readonly monorepoRoot: string;
    readonly packageRoot: string;
    readonly out: string;
    readonly temp: string;
}

/**
 * Print usage.
 */
function printUsage(errormsg?: string): void {
    if (errormsg !== undefined) {
        log.error(`Error: ${errormsg}`);
    }
    console.info('Usage: node . [flathub | flatpak-metadata <flavor> <out-dir>]');
    console.info('  (no command)        Build a package for the current platform');
    console.info('  flathub             Generate the files for a Flathub submission');
    console.info(
        '  flatpak-metadata    Generate the Flatpak metainfo and desktop files for <flavor> into',
    );
    console.info(
        '                      <out-dir> (relative to the repository root). Works offline, used',
    );
    console.info('                      during the Flatpak build.');
    console.info('');
    console.info('Available environment variables (when building a package):');
    console.info('  TURBO_BUILD_ENVIRONMENT=live|onprem|sandbox    Required');
    console.info('  TURBO_BUILD_VARIANT=consumer|custom|work       Required');
    console.info(
        '  TURBO_PACKAGE_SIGNATURE=true|false             Whether to sign the binary or package. Defaults to false.',
    );
}

/**
 * Clean up after packaging is complete.
 */
function cleanup(dirs: Directories): void {
    fs.rmSync(dirs.temp, {recursive: true, force: true});
}

function main(args: string[]): void {
    const rootDir = fs.realpathSync(path.join('..', '..', '..'));
    const dirs: Directories = {
        monorepoRoot: rootDir,
        packageRoot: path.join(rootDir, 'apps', 'desktop'),
        temp: path.join(rootDir, 'temp'),
        out: path.join(rootDir, 'build', 'out'),
    };

    // Subcommands that do not build a package.
    const [command, ...commandArgs] = args;
    switch (command) {
        case undefined:
            break;
        case 'flathub':
            generateFlathubFiles(dirs);
            return;
        case 'flatpak-metadata':
            generateFlatpakMetadataCommand(dirs, commandArgs);
            return;
        default:
            printUsage(`Unknown command: ${command}`);
            process.exit(1);
    }

    // Parse build environment switches.
    const config = TURBO_PACKAGE_ENV_SCHEMA.try(process.env, {mode: 'strip'});
    if (!config.ok) {
        printUsage(`Failed to determine package configuration: ${config.message}`);
        process.exit(1);
    }

    // Prepare build and output directories.
    if (fs.existsSync(dirs.temp)) {
        if (!fs.lstatSync(dirs.temp).isDirectory()) {
            fail(
                `Temporary directory ${dirs.temp} exists and is not a directory. Please remove it first.`,
            );
        }
        fs.rmSync(dirs.temp, {recursive: true, force: true});
    }
    ensureDirSync(dirs.temp);
    ensureDirSync(dirs.out);

    const flavor = `${config.value.TURBO_BUILD_VARIANT}-${config.value.TURBO_BUILD_ENVIRONMENT}`;
    if (!isBuildFlavor(flavor)) {
        fail(`Invalid build flavor configuration: ${flavor}`);
    }

    const appName = determineBaseAppName(flavor);

    switch (process.platform) {
        case 'darwin':
            buildDmgs(dirs, appName, config.value.TURBO_PACKAGE_SIGNATURE, flavor).catch(
                (error: unknown) => {
                    fail(`Building signed DMG failed: ${error}`);
                },
            );
            break;

        case 'linux':
            buildFlatpaks(dirs, appName, flavor);
            break;

        case 'win32':
            buildMsixs(dirs, appName, config.value.TURBO_PACKAGE_SIGNATURE, flavor);
            break;

        default:
            cleanup(dirs);
            fail(`Platform "${process.platform}" is not a supported packaging target`);
    }

    cleanup(dirs);
}

/**
 * Determine the base app name of the given {@link flavor}, i.e. "Threema", or the app name from
 * the custom config for the `custom-onprem` flavor.
 */
function determineBaseAppName(flavor: BuildFlavor): string {
    if (flavor !== 'custom-onprem') {
        return 'Threema';
    }
    const currentConfigOrError = readCustomConfig();
    if (currentConfigOrError instanceof Error) {
        fail(`Failed to process \`custom-onprem\` config: ${currentConfigOrError.message}`);
    }
    return currentConfigOrError.appName;
}

/**
 * Determines the output paths for the build Electron application binary.
 */
function determinePaths(
    dirs: Directories,
    appName: string,
    flavor: BuildFlavor,
): {
    binaryBasename: string;
    binaryDirPath: string;
} {
    // Determine paths
    const buildOutputDir = path.join(dirs.monorepoRoot, 'build', 'apps', 'desktop', 'packaged');
    const binaryBasename = determineAppName(flavor, appName);
    const binaryDir = `${binaryBasename}-${process.platform}-${process.arch}`;
    const binaryDirPath = path.join(buildOutputDir, binaryDir);

    if (!fs.existsSync(binaryDirPath)) {
        fail(
            `Could not find binary dir, path\n    ${binaryDirPath}\n    does not exist. Did the app build successfully?`,
        );
    }
    log.minor('Binary successfully built');

    return {binaryBasename, binaryDirPath};
}

/**
 * Sign a Windows Binary (.exe) or Package (.msix).
 */
function signWindowsBinaryOrPackage(
    pathToSign: string,
    appName: string,
    flavor: BuildFlavor,
): void {
    // For more information on how to determine some of the env variables below, and for
    // documentation on the syntax used, please refer to
    // https://stackoverflow.com/a/54439759/284318
    const signtoolPath = unwrap(
        process.env.WIN_SIGNTOOL_EXE_PATH,
        'Missing WIN_SIGNTOOL_EXE_PATH env var',
    );
    const certificatePath = unwrap(
        process.env.WIN_SIGN_CERT_PATH,
        'Missing WIN_SIGN_CERT_PATH env var',
    );
    const cryptographicProvider = unwrap(
        process.env.WIN_SIGN_CRYPTO_PROVIDER,
        'Missing WIN_SIGN_CRYPTO_PROVIDER env var',
    );
    const privateKeyContainerName = unwrap(
        process.env.WIN_SIGN_CONTAINER_NAME,
        'Missing WIN_SIGN_CONTAINER_NAME env var',
    );
    const tokenReader = unwrap(
        process.env.WIN_SIGN_TOKEN_READER,
        'Missing WIN_SIGN_TOKEN_READER env var',
    );
    const tokenPassword = unwrap(
        process.env.WIN_SIGN_TOKEN_PASSWORD,
        'Missing WIN_SIGN_TOKEN_PASSWORD env var',
    );
    const description = determineAppName(flavor, appName);
    const url = 'https://threema.ch/';
    const fileDigest = 'sha512';
    const timestampDigest = 'sha512';
    const timestampUrl = 'http://timestamp.sectigo.com';
    const keyContainer = `[${tokenReader}{{${tokenPassword}}}]=${privateKeyContainerName}`;
    const filename = path.basename(pathToSign);
    log.minor(
        `Signing binary "${filename}" with certificate "${privateKeyContainerName}" from reader "${tokenReader}"`,
    );
    execFileSync(
        signtoolPath,
        // prettier-ignore
        [
            'sign',
            '/d', description,
            '/du', url,
            '/fd', fileDigest,
            '/td', timestampDigest,
            '/tr', timestampUrl,
            '/f', certificatePath,
            '/csp', cryptographicProvider,
            '/kc', keyContainer,
            pathToSign,
        ],
        {encoding: 'utf8'},
    );
}

/**
 * Build multiple macOS DMGs.
 */
async function buildDmgs(
    dirs: Directories,
    appName: string,
    signed: boolean,
    flavor: BuildFlavor,
): Promise<void> {
    log.major(`Building ${signed ? 'signed' : 'unsigned'} macOS DMGs`);

    // Build flavor
    await buildDmg(dirs, appName, flavor, signed, signed);
}

/**
 * Build a concrete macOS DMG.
 *
 * Required env vars for signing or notarizing:
 *
 * - `APPLE_TEAM_ID`
 * - `APPLE_TEAM_NAME`
 * - `APPLE_KEYCHAIN`
 * - `APPLE_KEYCHAIN_PASSWORD`
 * - `APPLE_NOTARIZE_KEYCHAIN_PROFILE`
 */
async function buildDmg(
    dirs: Directories,
    appName: string,
    flavor: BuildFlavor,
    sign: boolean,
    notarize: boolean,
): Promise<void> {
    log.minor(`Building DMG: ${flavor}`);

    requireCommand('cargo');

    const hasChecksumBinaries =
        checkCommandAvailability('sha256sum') && checkCommandAvailability('b2sum');

    const {binaryDirPath, binaryBasename} = determinePaths(dirs, appName, flavor);

    // Variables depending on build flavor
    const fullAppName = determineAppName(flavor, appName);
    let dmgName;
    let installerBackgroundFilename;
    let iconFilename;
    switch (flavor) {
        case 'consumer-sandbox':
            dmgName = 'ThreemaGreen';
            installerBackgroundFilename = 'consumer.png';
            iconFilename = 'consumer-sandbox.icns';
            break;
        case 'consumer-live':
            dmgName = 'Threema';
            installerBackgroundFilename = 'consumer.png';
            iconFilename = 'consumer-live.icns';
            break;
        case 'work-sandbox':
            dmgName = 'ThreemaBlue';
            installerBackgroundFilename = 'work.png';
            iconFilename = 'work-sandbox.icns';
            break;
        case 'work-live':
            dmgName = 'ThreemaWork';
            installerBackgroundFilename = 'work.png';
            iconFilename = 'work-live.icns';
            break;
        case 'work-onprem':
            dmgName = 'ThreemaOnPrem';
            installerBackgroundFilename = 'onprem.png';
            iconFilename = 'work-onprem.icns';
            break;
        case 'custom-onprem':
            dmgName = fullAppName;
            installerBackgroundFilename = 'custom.png';
            iconFilename = 'custom-onprem.icns';
            break;
        default:
            unreachable(flavor);
    }

    // Determine paths
    const originalAppPath = `${binaryDirPath}/${binaryBasename}.app`;
    const appPath = `${binaryDirPath}/${fullAppName}.app`;
    const outPath = path.join(dirs.monorepoRoot, 'build', 'installers', 'mac');

    // Rename app directory
    fs.renameSync(originalAppPath, appPath);

    // Unlock keychain
    if (sign || notarize) {
        unlockKeychain();
    }

    // Sign
    if (sign) {
        const {sign: signAsync} = await import('@electron/osx-sign');
        log.minor(`Start signing at ${new Date().toLocaleTimeString()}`);
        // Docs: https://www.npmjs.com/package/@electron/osx-sign
        const appleTeamId = unwrap(process.env.APPLE_TEAM_ID, 'Missing APPLE_TEAM_ID env var');
        const appleTeamName = unwrap(
            process.env.APPLE_TEAM_NAME,
            'Missing APPLE_TEAM_NAME env var',
        );
        // The bundle's main executable is the launcher binary, which spawns the actual Electron
        // binary. By default, the Electron binary would therefore be signed with an identifier
        // derived from its filename. However, macOS requires the process that uses the
        // `UNUserNotification` API (used by Electron >= 42) to be identifiable as the signed app,
        // so we sign the Electron binary with the bundle identifier as well.
        const electronBinaryPath = path.join(appPath, 'Contents', 'MacOS', 'ThreemaDesktop');
        const appBundleId = determineAppRdn(flavor, appName);
        await signAsync({
            app: appPath,
            identity: `Developer ID Application: ${appleTeamName} (${appleTeamId})`,
            type: 'distribution',
            optionsForFile: (filePath: string) => {
                log.minor(`Determine signing options for file ${filePath}`);
                return {
                    additionalArguments:
                        path.resolve(filePath) === path.resolve(electronBinaryPath)
                            ? ['--identifier', appBundleId]
                            : [],
                    // For list of entitlements, see https://developer.apple.com/documentation/security/hardened_runtime
                    entitlements: [
                        // Allow execution of JIT-compiled code, required by Electron
                        // https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_cs_allow-jit
                        'com.apple.security.cs.allow-jit',
                        // Allow access to camera (for calls)
                        // https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_device_camera
                        'com.apple.security.device.camera',
                        // Allow access to microphone (for calls and for recording voice messages)
                        // https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_device_audio-input
                        'com.apple.security.device.audio-input',
                    ],
                    // Enable hardened runtime, see https://developer.apple.com/documentation/security/hardened_runtime
                    hardenedRuntime: true,
                    signatureFlags: [],
                };
            },
        });
    }

    // Notarize
    if (notarize) {
        const {notarize: notarizeAsync} = await import('@electron/notarize');
        log.minor(`Start signing at ${new Date().toLocaleTimeString()}`);
        // Docs: https://www.npmjs.com/package/@electron/notarize
        const keychain = unwrap(process.env.APPLE_KEYCHAIN, 'Missing APPLE_KEYCHAIN env var');
        const keychainProfile = unwrap(
            process.env.APPLE_NOTARIZE_KEYCHAIN_PROFILE,
            'Missing APPLE_NOTARIZE_KEYCHAIN_PROFILE env var',
        );
        await notarizeAsync({
            appPath,
            keychain,
            keychainProfile,
        });
    }

    // Re-lock keychain
    // TODO(DESK-856): Improve re-locking logic
    if (sign || notarize) {
        lockKeychain();
    }

    // Export DMG
    const options: ElectronInstallerDMGOptions = {
        appPath,
        out: outPath,
        name: dmgName,
        title: fullAppName,
        icon: path.join(dirs.packageRoot, 'packaging', 'assets', 'icons', 'mac', iconFilename),
        overwrite: true,
        background: path.join(
            dirs.packageRoot,
            'packaging',
            'assets',
            'installers',
            installerBackgroundFilename,
        ),
        contents: (opts: {appPath: string}) => [
            {x: 458, y: 211, type: 'link', path: '/Applications'},
            {x: 218, y: 211, type: 'file', path: opts.appPath},
        ],
    };
    log.minor('Exporting DMG');
    const createDmg = (await import('electron-installer-dmg')).createDMG;
    await createDmg(options);
    const dmgPath = path.join(outPath, `${dmgName}.dmg`);

    if (hasChecksumBinaries) {
        log.minor('Generating checksums');
        execFileSync(
            'bash',
            [path.join(dirs.packageRoot, 'packaging', 'generate-checksums.sh'), dmgPath],
            {
                cwd: dirs.monorepoRoot,
                encoding: 'utf8',
                shell: false,
            },
        );
    } else {
        log.minor('Skipping generating checksums');
    }

    log.major(`DMG installer successfully created at ${dmgPath}`);
}

function unlockKeychain(): void {
    const keychainPassword = unwrap(
        process.env.APPLE_KEYCHAIN_PASSWORD,
        'Missing APPLE_KEYCHAIN_PASSWORD env var',
    );
    const keychainPath = unwrap(process.env.APPLE_KEYCHAIN, 'Missing APPLE_KEYCHAIN env var');
    const result = spawnSync(
        'security',
        ['unlock-keychain', '-p', keychainPassword, keychainPath],
        {
            encoding: 'utf8',
            shell: false,
            stdio: [null, 1, 2], // Forward stdout/stderr
        },
    );
    if (result.status !== 0) {
        fail(`Unlocking keychain failed: ${result.output}`);
    }
}

function lockKeychain(): void {
    const keychainPath = unwrap(process.env.APPLE_KEYCHAIN, 'Missing APPLE_KEYCHAIN env var');
    const result = spawnSync('security', ['lock-keychain', keychainPath], {
        encoding: 'utf8',
        shell: false,
        stdio: [null, 1, 2], // Forward stdout/stderr
    });
    if (result.status !== 0) {
        fail(`Locking keychain failed: ${result.output}`);
    }
}

/**
 * Build multiple Windows MSIX package.
 */
function buildMsixs(
    dirs: Directories,
    appName: string,
    signed: boolean,
    flavor: BuildFlavor,
): void {
    log.major(`Building ${signed ? 'signed' : 'unsigned'} Windows MSIX packages`);

    // Build flavor
    buildMsix(dirs, appName, flavor, signed);
}

/**
 * Build a concrete Windows MSIX.
 */
function buildMsix(dirs: Directories, appName: string, flavor: BuildFlavor, sign: boolean): void {
    log.minor(`Building MSIX: ${flavor}`);

    requireCommand('cargo');

    // Look up required env variables
    const makeappxPath = unwrap(
        process.env.WIN_MAKEAPPX_EXE_PATH,
        'Missing WIN_MAKEAPPX_EXE_PATH env var',
    );
    const makepriPath = unwrap(
        process.env.WIN_MAKEPRI_EXE_PATH,
        'Missing WIN_MAKEPRI_EXE_PATH env var',
    );
    const certificateSubject = unwrap(
        process.env.WIN_SIGN_CERT_SUBJECT,
        'Missing WIN_SIGN_CERT_SUBJECT env var',
    );

    const {binaryDirPath} = determinePaths(dirs, appName, flavor);

    // Determine version
    //
    // Note: Windows validates the version, it must roughly match the format "1.2.3" or "1.2.3.4".
    // To see the full RegEx, run the Add-AppxPackage command with an invalid version (if you dare).
    const packageJson = readPackageJson(dirs);
    const appVersion = `${packageJson.version.replace(
        /^(?<majorMinor>[0-9]*\.[0-9]*).*/u,
        '$<majorMinor>',
    )}.${packageJson.versionCode}.0`;

    // Variables depending on build flavor
    const displayName = determineAppName(flavor, appName);
    const applicationId = determineMsixApplicationId(flavor, appName);
    const identityName = applicationId;

    // Write manifest file
    const manifestTemplate = fs.readFileSync('msix/AppxManifest.xml', {encoding: 'utf8'});
    const manifest = manifestTemplate
        .replaceAll('{{identityName}}', identityName.replaceAll(' ', ''))
        .replaceAll('{{identityVersion}}', appVersion)
        .replaceAll('{{identityPublisher}}', certificateSubject)
        .replaceAll('{{displayName}}', displayName)
        .replaceAll('{{applicationId}}', applicationId)
        .replaceAll('{{executionAlias}}', `${applicationId.replaceAll('.', '')}.exe`);
    const manifestPath = path.join(binaryDirPath, 'AppxManifest.xml');
    log.minor(`Writing Manifest to ${manifestPath}`);
    fs.writeFileSync(manifestPath, manifest, {encoding: 'utf8'});

    // Subprocess options
    const options = {
        cwd: dirs.monorepoRoot,
        encoding: 'utf8' as const,
        shell: false,
    };

    // Generate package resource index (PRI) config
    const priConfigPath = path.join(binaryDirPath, `priconfig.xml`);
    log.minor(`Writing PRI config file to ${priConfigPath}`);
    execFileSync(
        makepriPath,
        // prettier-ignore
        [
            'createconfig',
            '/ConfigXml', priConfigPath,
            '/Default', 'en-US'
        ],
        options,
    );

    const priPath = path.join(binaryDirPath, `resources.pri`);
    log.minor(`Writing PRI resources file to ${priPath}`);
    execFileSync(
        makepriPath,
        // prettier-ignore
        [
            'new',
            '/ConfigXml', priConfigPath,
            '/ProjectRoot', binaryDirPath,
            '/Manifest', manifestPath,
            '/OutputFile', priPath
        ],
        options,
    );

    // Generate unsigned .msix file
    const appId = determineAppIdentifier(flavor, appName);
    const msixOutPath = path.join(dirs.out, `${appId}-windows-${process.arch}.msix`);
    log.minor(`Writing MSIX file to ${msixOutPath}`);
    if (sign) {
        for (const exe of ['ThreemaDesktop.exe', 'ThreemaDesktopLauncher.exe']) {
            signWindowsBinaryOrPackage(path.join(binaryDirPath, exe), appName, flavor);
        }
    }
    execFileSync(
        makeappxPath,
        // prettier-ignore
        [
            'pack',
            '/v',
            '/h', 'SHA512',
            '/o',
            '/d', binaryDirPath,
            '/p', msixOutPath,
        ],
        options,
    );
    // Sign
    if (sign) {
        signWindowsBinaryOrPackage(msixOutPath, appName, flavor);
    }

    // Generate checksums
    log.minor('Generating checksums');
    execFileSync(
        'powershell.exe',
        [
            path.join(dirs.packageRoot, 'packaging', 'generate-checksums.ps1'),
            '-filepath',
            `"${msixOutPath}"`,
        ],
        options,
    );

    log.major(`Done, wrote ${msixOutPath}`);
}

/**
 * App ID used in the metadata templates in `packaging/metadata/`.
 */
const METADATA_TEMPLATE_APP_ID = 'ch.threema.threema-desktop';

/**
 * Replace all occurrences of {@link search} in {@link content}. Fails if there is no occurrence, so
 * that changes to the template cannot silently break the generated output.
 */
function replaceAllOrFail(content: string, search: string, replacement: string): string {
    if (!content.includes(search)) {
        fail(`Could not find "${search}" in template`);
    }
    return content.replaceAll(search, replacement);
}

/**
 * Git repository of the project, used as the source in the Flatpak manifest for Flathub
 * deployments.
 */
const GITHUB_URL = 'https://github.com/threema-ch/threema-desktop.git';

/**
 * Determine the hash of the commit that {@link tag} points to in the remote repository at
 * {@link url}, or `undefined` if the tag does not exist.
 */
function resolveRemoteTagCommit(url: string, tag: string): string | undefined {
    const output = execFileSync('git', ['ls-remote', '--tags', url, tag], {
        encoding: 'utf8',
        shell: false,
    });
    const commit = output.split('\t')[0]?.trim();
    return commit === '' ? undefined : commit;
}

/**
 * Generate the Flatpak manifest for the given app ID from `packaging/flatpak/manifest-template.yml`
 * and write it into {@link outDir}.
 *
 * If {@link flathubTag} is set, the project source is fetched from GitHub at the given tag instead
 * of from the local repository path, and the commit is resolved from the tag on GitHub instead of
 * using the local `HEAD`.
 */
function generateFlatpakManifest(
    dirs: Directories,
    outDir: string,
    appId: string,
    flavor: BuildFlavor,
    runtimeVersion: string,
    flathubTag: string | undefined,
): {readonly manifestFilename: string} {
    const manifestFilename = `${appId}.yml`;
    const gitCommit =
        flathubTag === undefined
            ? execFileSync('git', ['rev-parse', 'HEAD'], {
                  cwd: dirs.monorepoRoot,
                  encoding: 'utf8',
                  shell: false,
              }).trim()
            : unwrap(
                  resolveRemoteTagCommit(GITHUB_URL, flathubTag),
                  `Could not find tag "${flathubTag}" in remote repository ${GITHUB_URL}`,
              );
    const electronVersion = readPackageJson(dirs).devDependencies.electron;

    let manifest = fs.readFileSync(
        path.join(dirs.packageRoot, 'packaging', 'flatpak', 'manifest-template.yml'),
        {encoding: 'utf8'},
    );
    if (flathubTag !== undefined) {
        manifest = replaceAllOrFail(manifest, 'path: ../../../..', `url: ${GITHUB_URL}`);
        manifest = replaceAllOrFail(
            manifest,
            "        commit: '{{git-commit}}'\n",
            `        commit: '{{git-commit}}'\n        tag: ${flathubTag}\n`,
        );
    }
    manifest = replaceAllOrFail(manifest, '{{app-id}}', appId);
    manifest = replaceAllOrFail(manifest, '{{flavor}}', flavor);
    manifest = replaceAllOrFail(manifest, '{{runtime-version}}', runtimeVersion);
    manifest = replaceAllOrFail(manifest, '{{git-commit}}', gitCommit);
    manifest = replaceAllOrFail(manifest, '{{electron-version}}', electronVersion);
    const unknownPlaceholder = /\{\{[^}]*\}\}/u.exec(manifest);
    if (unknownPlaceholder !== null) {
        fail(`Unknown placeholder "${unknownPlaceholder[0]}" in manifest template`);
    }
    fs.writeFileSync(path.join(outDir, manifestFilename), manifest, {encoding: 'utf8'});

    return {manifestFilename};
}

/**
 * Base URL of raw files in the GitHub repository of the project (see {@link GITHUB_URL}).
 */
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/threema-ch/threema-desktop';

/**
 * Placeholder for the base URL of the screenshots in the metainfo template.
 */
const METAINFO_SCREENSHOTS_BASE_URL_PLACEHOLDER = '{{screenshots-base-url}}';

/**
 * The `<screenshots>` element in the metainfo template, including its preceding comments.
 */
const METAINFO_SCREENSHOTS_ELEMENT =
    /^(?:[ \t]*<!--[\s\S]*?-->\n)*[ \t]*<screenshots>[\s\S]*?<\/screenshots>\n/mu;

/**
 * Directory of the Flatpak screenshots of the given {@link flavor}.
 */
function flatpakScreenshotsDir(dirs: Directories, flavor: BuildFlavor): string {
    return path.join(dirs.packageRoot, 'packaging', 'flatpak', 'screenshots', flavor);
}

/**
 * Point the screenshots in the {@link metainfo} to the directory of the given {@link flavor} in
 * `packaging/flatpak/screenshots/` on GitHub at {@link gitTag}, so that the URLs are stable.
 *
 * Flathub mirrors the images during the build (see `--mirror-screenshots-url` of
 * `flatpak-builder`), so they only need to be reachable at build time.
 */
function replaceFlatpakScreenshotsBaseUrl(
    dirs: Directories,
    metainfo: string,
    flavor: BuildFlavor,
    gitTag: string,
): string {
    const screenshotsDir = flatpakScreenshotsDir(dirs, flavor);

    // Ensure that all referenced images exist, because Flathub fails to fetch missing images.
    for (const reference of metainfo
        .split(`${METAINFO_SCREENSHOTS_BASE_URL_PLACEHOLDER}/`)
        .slice(1)) {
        const filename = reference.slice(0, reference.indexOf('<')).trim();
        if (!fs.existsSync(path.join(screenshotsDir, filename))) {
            fail(
                `Screenshot "${filename}" of flavor ${flavor} does not exist in ${screenshotsDir}`,
            );
        }
    }

    const relativeDir = path
        .relative(dirs.monorepoRoot, screenshotsDir)
        .split(path.sep)
        .join(path.posix.sep);
    return replaceAllOrFail(
        metainfo,
        METAINFO_SCREENSHOTS_BASE_URL_PLACEHOLDER,
        `${GITHUB_RAW_BASE_URL}/${gitTag}/${relativeDir}`,
    );
}

/**
 * Generate the AppStream metainfo and the desktop entry file for the given app ID from the
 * templates in `packaging/metadata/`, and write them into {@link outDir}.
 *
 * If the given {@link flavor} has screenshots in `packaging/flatpak/screenshots/<flavor>/`, they
 * are included in the metainfo (pointing to {@link gitTag} on GitHub). Otherwise, the metainfo
 * contains no screenshots.
 */
function generateFlatpakMetadata(
    dirs: Directories,
    outDir: string,
    appId: string,
    displayName: string,
    flavor: BuildFlavor,
    gitTag: string,
): {readonly metainfoFilename: string; readonly desktopFilename: string} {
    const metadataDir = path.join(dirs.packageRoot, 'packaging', 'metadata');
    const metainfoFilename = `${appId}.metainfo.xml`;
    const desktopFilename = `${appId}.desktop`;

    let metainfo = fs.readFileSync(
        path.join(metadataDir, `${METADATA_TEMPLATE_APP_ID}.metainfo.xml`),
        {encoding: 'utf8'},
    );
    metainfo = replaceAllOrFail(metainfo, METADATA_TEMPLATE_APP_ID, appId);
    metainfo = replaceAllOrFail(metainfo, '<name>Threema</name>', `<name>${displayName}</name>`);
    // If no screenshots exist for the passed flavor we remove the screenshots element from the metainfo
    if (!fs.existsSync(flatpakScreenshotsDir(dirs, flavor))) {
        const withoutScreenshots = metainfo.replace(METAINFO_SCREENSHOTS_ELEMENT, '');
        if (withoutScreenshots === metainfo) {
            fail('Could not find the <screenshots> element in template');
        }
        metainfo = withoutScreenshots;
    } else {
        metainfo = replaceFlatpakScreenshotsBaseUrl(dirs, metainfo, flavor, gitTag);
    }
    fs.writeFileSync(path.join(outDir, metainfoFilename), metainfo, {encoding: 'utf8'});

    let desktop = fs.readFileSync(path.join(metadataDir, `${METADATA_TEMPLATE_APP_ID}.desktop`), {
        encoding: 'utf8',
    });
    desktop = replaceAllOrFail(desktop, METADATA_TEMPLATE_APP_ID, appId);
    desktop = replaceAllOrFail(desktop, 'Name=Threema', `Name=${displayName}`);
    desktop = replaceAllOrFail(desktop, 'StartupWMClass=Threema', `StartupWMClass=${displayName}`);
    fs.writeFileSync(path.join(outDir, desktopFilename), desktop, {encoding: 'utf8'});

    return {metainfoFilename, desktopFilename};
}

/**
 * Git tag of the current version (`v<version>` from `apps/desktop/package.json`), which Flathub
 * builds are based on and the screenshot URLs point to.
 */
function releaseGitTag(dirs: Directories): string {
    return `v${readPackageJson(dirs).version}`;
}

/**
 * Handle the `flatpak-metadata <flavor> <out-dir>` subcommand, which generates the
 * metainfo and desktop files for the given flavor (see {@link generateFlatpakMetadata}).
 *
 * This runs inside the Flatpak build sandbox (see `packaging/flatpak/manifest-template.yml`), so it
 * must not require network access, git or any other tools that are not available there.
 */
function generateFlatpakMetadataCommand(dirs: Directories, args: readonly string[]): void {
    const [flavor, outDir] = args;
    if (args.length !== 2 || flavor === undefined || outDir === undefined) {
        printUsage('flatpak-metadata requires exactly the arguments <flavor> and <out-dir>');
        process.exit(1);
    }
    if (!isBuildFlavor(flavor)) {
        printUsage(`Invalid build flavor: ${flavor}`);
        process.exit(1);
    }

    const appName = determineBaseAppName(flavor);
    const appId = determineAppRdn(flavor, appName);
    const resolvedOutDir = path.resolve(dirs.monorepoRoot, outDir);
    log.major(`Generating Flatpak metadata files for ${appId} in ${resolvedOutDir}`);
    ensureDirSync(resolvedOutDir);
    generateFlatpakMetadata(
        dirs,
        resolvedOutDir,
        appId,
        determineAppName(flavor, appName),
        flavor,
        releaseGitTag(dirs),
    );
}

/**
 * Flathub repository, used to install the layer dependencies from.
 */
const FLATHUB_REPO_URL = 'https://flathub.org/repo/flathub.flatpakrepo';

/**
 * Version of the Flatpak runtime and layer dependencies.
 */
const FLATPAK_RUNTIME_VERSION = '26.08';

/**
 * Flavors that are published on Flathub.
 */
const FLATHUB_FLAVORS = ['consumer-live', 'work-live'] as const satisfies readonly BuildFlavor[];

/**
 * Return the Flatpak packaging directory and the options to run child processes in it.
 */
function flatpakDirAndOptions(dirs: Directories): {
    readonly flatpakDir: string;
    readonly options: ExecFileSyncOptionsWithStringEncoding;
} {
    const flatpakDir = path.join(dirs.packageRoot, 'packaging', 'flatpak');
    return {
        flatpakDir,
        options: {
            cwd: flatpakDir,
            encoding: 'utf8',
            shell: false,
            stdio: [null, 1, 2], // Forward stdout/stderr
        },
    };
}

/**
 * Run the Flatpak source generators, which write the `generated-*-sources.json` files to the
 * Flatpak packaging directory. These files are independent of the flavor.
 */
function generateFlatpakSources(dirs: Directories): void {
    const {options} = flatpakDirAndOptions(dirs);

    log.minor('Generate pnpm source JSON');
    execFileSync(
        'python3',
        [
            '-m',
            'flatpak-builder-tools.flatpak_node_generator',
            'pnpm',
            '--electron-node-headers',
            '--no-playwright-browsers',
            '--pnpm-store-version',
            'v11',
            '-o',
            'generated-pnpm-sources.json',
            '../../../../pnpm-lock.yaml',
        ],
        options,
    );

    log.minor('Generate cargo source JSON');
    execFileSync(
        'python3',
        [
            '-m',
            'flatpak-builder-tools.flatpak-cargo-generator',
            '-o',
            'generated-cargo-sources.json',
            '../../src/rust/launcher/Cargo.lock',
        ],
        options,
    );

    const libthreemaCargoLockPath = path.join(
        dirs.monorepoRoot,
        'packages',
        'libthreema-wasm',
        'libs',
        'libthreema',
        'Cargo.lock',
    );
    log.minor('Generate libthreema cargo source JSON');
    execFileSync(
        'python3',
        [
            '-m',
            'flatpak-builder-tools.flatpak-cargo-generator',
            '-o',
            'generated-libthreema-cargo-sources.json',
            libthreemaCargoLockPath,
        ],
        options,
    );

    log.minor('Generate build tool source JSON');
    execFileSync(
        'python3',
        ['generate-tool-sources.py', '-o', 'generated-tool-sources.json'],
        options,
    );
}

/**
 * Generate the files required for a Flathub submission (manifest, generated sources and run
 * wrapper) into `packaging/flatpak/flathub/<flavor>/`, for all flavors published on Flathub.
 *
 * The manifests fetch the project source from GitHub at the tag of the current version. The
 * metainfo and desktop files are not part of the
 * submission, they are generated during the build from the project source (see
 * {@link generateFlatpakMetadataCommand}).
 *
 * Note: This does not build the Flatpak, that is done by Flathub itself.
 *
 * Requirements:
 *
 * - git
 * - python3 (with `aiohttp`, `tomlkit` and `yaml`)
 */
function generateFlathubFiles(dirs: Directories): void {
    log.major('Generating Flathub files');

    requireCommand('git');
    requireCommand('python3');

    const {flatpakDir} = flatpakDirAndOptions(dirs);
    const flathubRootDir = path.join(flatpakDir, 'flathub');
    fs.rmSync(flathubRootDir, {recursive: true, force: true});

    generateFlatpakSources(dirs);
    const sharedFiles = fs
        .readdirSync(flatpakDir)
        .filter(
            (filename) =>
                /^generated-.*-sources\.json$/u.test(filename) || filename === 'run-wrapper.sh',
        );

    const gitTag = releaseGitTag(dirs);
    for (const flavor of FLATHUB_FLAVORS) {
        const appId = determineAppRdn(flavor, determineBaseAppName(flavor));
        const flathubDir = path.join(flathubRootDir, flavor);
        log.minor(`Generating Flathub files for ${appId} in ${flathubDir}`);
        ensureDirSync(flathubDir);

        generateFlatpakManifest(dirs, flathubDir, appId, flavor, FLATPAK_RUNTIME_VERSION, gitTag);
        for (const filename of sharedFiles) {
            fs.copyFileSync(path.join(flatpakDir, filename), path.join(flathubDir, filename));
        }
    }

    log.major(`Done, Flathub files are in ${flathubRootDir}`);
}

/**
 * Build a Linux Flatpak.
 *
 * Requirements:
 *
 * - flatpak
 * - flatpak-builder
 * - git
 * - python3
 *
 * Note: By default, this will build into a local repository without any GPG
 * verification. To customize this process, the following env vars can be used:
 *
 * - `THREEMADESKTOP_FLATPAK_REPO_PATH`: Path to flatpak repository, relative
 *   to `packaging/flatpak` or absolute.
 * - `THREEMADESKTOP_FLATPAK_GPG_KEY`: ID of the GPG Key used for Flatpak signing.
 * - `THREEMADESKTOP_FLATPAK_BRANCH`: The branch to use for flatpak. Defaults
 *   to "master" if not specified.
 */
function buildFlatpaks(dirs: Directories, appName: string, flavor: BuildFlavor): void {
    log.major('Building Linux Flatpaks');

    // Parse flavor
    const appId = determineAppRdn(flavor, appName);
    log.minor(`Building app: ${appId}`);

    requireCommand('flatpak');
    requireCommand('flatpak-builder');
    requireCommand('git');
    requireCommand('python3');

    // Layer dependencies
    const dependencies = [
        'org.electronjs.Electron2.BaseApp',
        'org.freedesktop.Sdk',
        'org.freedesktop.Sdk.Extension.node24',
        'org.freedesktop.Sdk.Extension.rust-stable',
    ];

    const {flatpakDir, options} = flatpakDirAndOptions(dirs);

    // Generate manifest file
    log.minor('Generating manifest file');
    const {manifestFilename} = generateFlatpakManifest(
        dirs,
        flatpakDir,
        appId,
        flavor,
        FLATPAK_RUNTIME_VERSION,
        undefined,
    );

    // Run flatpak source generators
    generateFlatpakSources(dirs);

    // Determine installation source arg
    //
    // Unprivileged builds must use the per-user installation, because `flatpak build-init` copies
    // the base app's files into the build dir and fails to copy its root-owned symlinks since
    // Flatpak 18.1.1 (see https://gitlab.gnome.org/GNOME/libglnx/-/merge_requests/83). Root (i.e.
    // CI) is not affected and keeps using the system installation.
    const installation = process.getuid?.() === 0 ? 'system' : 'user';
    const installationSourceArg = `--${installation}`;

    // Ensure that the Flathub remote is configured for the target installation (no-op if it is).
    execFileSync(
        'flatpak',
        ['remote-add', installationSourceArg, '--if-not-exists', 'flathub', FLATHUB_REPO_URL],
        options,
    );

    // Install dependencies
    let arch;
    switch (process.arch) {
        case 'x64':
            arch = 'x86_64';
            break;
        case 'arm64':
            arch = 'aarch64';
            break;
        default:
            fail(`Unsupported architecture: ${process.arch}`);
    }
    log.minor(`Installing layer dependencies into the ${installation} installation`);
    for (const name of dependencies) {
        execFileSyncWithRetry(
            'flatpak',
            [
                'install',
                installationSourceArg,
                '-y',
                '--noninteractive',
                `${name}/${arch}/${FLATPAK_RUNTIME_VERSION}`,
            ],
            options,
            {retries: 3, delayMs: 15_000},
        );
    }

    // Build
    log.minor('Build Flatpak into local repo');
    const buildArgs = ['--force-clean', '--ccache'];
    let repoPath = (process.env.THREEMADESKTOP_FLATPAK_REPO_PATH ?? '').trim();
    if (repoPath === '') {
        // Fallback to default path
        repoPath = path.join(flatpakDir, 'repo');
    }
    buildArgs.push(`--repo=${repoPath}`);
    buildArgs.push(`--state-dir=${path.join(flatpakDir, '.flatpak-builder')}`);
    let branch = (process.env.THREEMADESKTOP_FLATPAK_BRANCH ?? '').trim();
    if (branch === '') {
        // Fallback to master (the Flatpak default)
        branch = 'master';
    }
    buildArgs.push(`--default-branch=${branch}`);
    const gpgKey = (process.env.THREEMADESKTOP_FLATPAK_GPG_KEY ?? '').trim();
    if (gpgKey !== '') {
        buildArgs.push(`--gpg-sign=${gpgKey}`);
    }
    log.minor(`Building app ${appId}`);
    execFileSync(
        'flatpak-builder',
        [...buildArgs, 'build', path.join(flatpakDir, manifestFilename)],
        options,
    );

    // Update repo
    log.minor('Updating local repo metadata');
    const updateArgs = [];
    if (gpgKey !== '') {
        updateArgs.push(`--gpg-sign=${gpgKey}`);
    }
    execFileSync('flatpak', ['build-update-repo', repoPath, ...updateArgs]);

    log.major('Done!');
    log.minor(`The Flatpak repository is at ${repoPath}`);
    log.minor('To add the local repository as a source:');
    if (gpgKey === '') {
        log.minor(
            `    flatpak remote-add ${installationSourceArg} threema-desktop-local --no-gpg-verify ${repoPath}`,
        );
    } else {
        const keypath = 'flatpak.pub';
        log.minor(`    gpg --export --armor ${gpgKey} > ${keypath}`);
        log.minor(
            `    flatpak remote-add ${installationSourceArg} threema-desktop-local --gpg-import=${keypath} ${repoPath}`,
        );
    }
    log.minor(`To install the application from the local repository:`);
    log.minor(`    flatpak install ${installationSourceArg} --reinstall ${appId}`);
    log.minor(`To launch Threema from the command line:`);
    log.minor(`    flatpak run ${appId}`);
}

main(process.argv.slice(2));
