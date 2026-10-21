/**
 * Prepare distribution packages.
 */

import {execFileSync, spawnSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import * as v from '@badrap/valita';
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
    console.info('Available environment variables:');
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
    // Parse build environment switches.
    const config = TURBO_PACKAGE_ENV_SCHEMA.try(process.env, {mode: 'strip'});
    if (!config.ok) {
        printUsage(`Failed to determine package configuration: ${config.message}`);
        process.exit(1);
    }

    // Prepare build and output directories.
    const rootDir = fs.realpathSync(path.join('..', '..', '..'));
    const dirs: Directories = {
        monorepoRoot: rootDir,
        packageRoot: path.join(rootDir, 'apps', 'desktop'),
        temp: path.join(rootDir, 'temp'),
        out: path.join(rootDir, 'build', 'out'),
    };
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

    let appName: string | undefined = 'Threema';
    if (flavor === 'custom-onprem') {
        const currentConfigOrError = readCustomConfig();
        if (currentConfigOrError instanceof Error) {
            fail(`Failed to process \`custom-onprem\` config: ${currentConfigOrError.message}`);
        }

        appName = currentConfigOrError.appName;
    }

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
        await signAsync({
            app: appPath,
            identity: `Developer ID Application: ${appleTeamName} (${appleTeamId})`,
            type: 'distribution',
            optionsForFile: (filePath: string) => {
                log.minor(`Determine signing options for file ${filePath}`);
                return {
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
 * Build a Linux Flatpak.
 *
 * Requirements:
 *
 * - bash
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

    requireCommand('bash');
    requireCommand('flatpak');
    requireCommand('flatpak-builder');
    requireCommand('python3');

    // Layer dependencies
    const layerDependenciesVersion = '25.08';
    const dependencies = [
        'org.electronjs.Electron2.BaseApp',
        'org.freedesktop.Sdk',
        'org.freedesktop.Sdk.Extension.node22',
        'org.freedesktop.Sdk.Extension.rust-stable',
    ];

    // Child process options
    const flatpakDir = path.join(dirs.packageRoot, 'packaging', 'flatpak');
    const options = {
        cwd: flatpakDir,
        encoding: 'utf8' as const,
        shell: false,
        stdio: [null, 1, 2], // Forward stdout/stderr
    };

    // Generate manifest files
    log.minor('Generating manifest files');
    execFileSync('bash', ['generate-manifest.sh'], options);

    // Run flatpak source generators
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

    // Install dependencies
    let arch;
    switch (process.arch) {
        case 'x64':
            arch = 'x86_64';
            break;
        default:
            fail(`Unsupported architecture: ${process.arch}`);
    }
    log.minor('Installing layer dependencies');
    for (const name of dependencies) {
        execFileSync(
            'flatpak',
            ['install', '-y', '--noninteractive', `${name}/${arch}/${layerDependenciesVersion}`],
            options,
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
        [...buildArgs, 'build', path.join(flatpakDir, `${appId}.yml`)],
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
        log.minor(`    flatpak remote-add threema-desktop-local --no-gpg-verify ${repoPath}`);
    } else {
        const keypath = 'flatpak.pub';
        log.minor(`    gpg --export --armor ${gpgKey} > ${keypath}`);
        log.minor(
            `    flatpak remote-add threema-desktop-local --gpg-import=${keypath} ${repoPath}`,
        );
    }
    log.minor(`To install the application from the local repository:`);
    log.minor(`    flatpak install --reinstall ${appId}`);
    log.minor(`To launch Threema from the command line:`);
    log.minor(`    flatpak run ${appId}`);
}

main(process.argv.slice(2));
