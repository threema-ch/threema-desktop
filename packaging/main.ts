/**
 * Prepare distribution packages.
 */

import {execFileSync, spawnSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import * as v from '@badrap/valita';
import type {ElectronInstallerDMGOptions} from 'electron-installer-dmg';
import fsExtra from 'fs-extra';

import {
    type BuildFlavor,
    determineAppIdentifier,
    determineAppName,
    determineAppRdn,
    determineMsixApplicationId,
    isBuildFlavor,
} from '../config/base.js';

// Note: Eslint wants us to do "import {copySync, ensureDirSync} from 'fs-extra'", but when using
//       that syntax, node complains and suggests to use the default import instead. In the
//       meantime, fs-extra _should_ support ESM by importing from 'fs-extra/esm', but the types
//       don't seem to support that yet.
// eslint-disable-next-line import/no-named-as-default-member
const {copySync, ensureDirSync} = fsExtra;

// ANSI escape codes
const ANSI_GREEN = '\u001b[0;32m';
const ANSI_YELLOW = '\u001b[0;33m';
const ANSI_RED = '\u001b[0;31m';
const ANSI_RESET = '\u001b[0m';

// Platform info
const IS_WINDOWS = process.platform === 'win32';
const IS_POSIX = !IS_WINDOWS;

/**
 * Dist targets.
 *
 * Note: When updating this list, update the README as well.
 */
type Target =
    | 'source'
    | 'binary'
    | 'binarySigned'
    | 'dmg'
    | 'dmgSigned'
    | 'msix'
    | 'msixSigned'
    | 'flatpak';
const TARGETS: Target[] = [
    'source',
    'binary',
    'binarySigned',
    'dmg',
    'dmgSigned',
    'msix',
    'msixSigned',
    'flatpak',
];

/**
 * Parse and validate a comma-separated list of build flavors
 */
function parseBuildFlavors(flavorList: string): BuildFlavor[] {
    const flavors = flavorList.split(',').map((val) => val.trim());
    for (const flavor of flavors) {
        if (!isBuildFlavor(flavor)) {
            printUsage(`Invalid build flavor: ${flavor}`);
            process.exit(1);
        }
    }
    return flavors as BuildFlavor[];
}

/**
 * Type guard for a {@link Target}.
 */
function isTarget(value: unknown): value is Target {
    return typeof value === 'string' && TARGETS.includes(value as Target);
}

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

// eslint-disable-next-line @typescript-eslint/ban-types
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
    if (required || process.env.CI === 'true') {
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
    const packageJson = fs.readFileSync(path.join(dirs.root, 'package.json'), {encoding: 'utf8'});
    return PACKAGE_JSON_SCHEMA.parse(JSON.parse(packageJson));
}

/**
 * Directory paths.
 */
interface Directories {
    readonly root: string;
    readonly tmp: string;
    readonly out: string;
}

/**
 * Print usage.
 */
function printUsage(errormsg?: string): void {
    if (errormsg !== undefined) {
        log.error(`Error: ${errormsg}`);
    }
    console.info('Usage: <target> [target-args]');
    console.info(`Possible targets: ${TARGETS}`);
    console.info(`\nTarget args:`);
    console.info(`  source: none`);
    console.info(`  flatpak: [FLAVORS] [--generate-deps-only]`);
    console.info(`  dmg: [FLAVORS]`);
    console.info(`  dmgSigned: [FLAVORS]`);
    console.info(`  msix: [FLAVORS]`);
    console.info(`  msixSigned: [FLAVORS]`);
    console.info(`  binary: [FLAVORS]`);
    console.info(`  binarySigned: [FLAVORS]`);
    console.info(
        `\nAvailable build flavors: consumer-live,work-live,consumer-sandbox,work-sandbox,work-onprem`,
    );
    console.info(`The FLAVORS arg can contain multiple flavors, separated by comma.`);
}

function main(args: string[]): void {
    // Validate args
    if (args.length < 1) {
        printUsage();
        process.exit(1);
    }
    if (!isTarget(args[0])) {
        printUsage(`Invalid target: ${args[0]}\n`);
        process.exit(1);
    }

    // Prepare build and output directories
    const rootDir = fs.realpathSync('..');
    const dirs: Directories = {
        root: rootDir,
        tmp: path.join(rootDir, 'build', 'tmp'),
        out: path.join(rootDir, 'build', 'out'),
    };
    if (fs.existsSync(dirs.tmp)) {
        if (!fs.lstatSync(dirs.tmp).isDirectory()) {
            fail(
                `Temporary directory ${dirs.tmp} exists and is not a directory. Please remove it first.`,
            );
        }
        fs.rmSync(dirs.tmp, {recursive: true, force: true});
    }
    ensureDirSync(dirs.tmp);
    ensureDirSync(dirs.out);

    // Dispatch to appropriate build target
    const target: Target = args[0];
    switch (target) {
        case 'source':
            buildSource(dirs, args.slice(1));
            break;
        case 'binary':
            buildBinaryArchives(dirs, false, args.slice(1));
            break;
        case 'binarySigned':
            buildBinaryArchives(dirs, true, args.slice(1));
            break;
        case 'dmg':
            buildDmgs(dirs, false, args.slice(1)).catch((error: unknown) => {
                fail(`Building DMG failed: ${error}`);
            });
            break;
        case 'dmgSigned':
            buildDmgs(dirs, true, args.slice(1)).catch((error: unknown) => {
                fail(`Building signed DMG failed: ${error}`);
            });
            break;
        case 'msix':
            buildMsixs(dirs, false, args.slice(1));
            break;
        case 'msixSigned':
            buildMsixs(dirs, true, args.slice(1));
            break;
        case 'flatpak':
            buildFlatpaks(dirs, args.slice(1));
            break;
        default:
            throw new Error(`Invalid target: ${target}`);
    }
}

/**
 * Build a source tarball.
 *
 * Requirements:
 *
 * - bash
 * - git >= 2.25
 * - tar
 * - gzip
 * - p7zip
 * - coreutils for 'sha256sum' and 'b2sum' (on macOS it can be installed with 'brew install coreutils')
 */
function buildSource(dirs: Directories, args: string[]): void {
    log.major('Building source tarball');

    requireCommand('bash');
    requireCommand('git');
    requireCommand('tar');
    requireCommand('gzip');
    requireCommand('sha256sum');
    requireCommand('b2sum');
    checkCommandAvailability('7zr');

    // Parse args
    let scriptArgs: string[];
    switch (args.length) {
        case 0:
            scriptArgs = [];
            break;
        case 1:
            scriptArgs = ['-v', unwrap(args[0])];
            break;
        default:
            printUsage();
            process.exit(1);
    }

    // Delegate the packaging script to a dedicated script
    const result = spawnSync(
        'bash',
        [path.join(dirs.root, 'packaging', 'generate-source-dist.sh'), ...scriptArgs],
        {
            cwd: dirs.root,
            encoding: 'utf8',
            shell: false,
            stdio: [null, 1, 2], // Forward stdout/stderr
        },
    );
    if (result.status !== 0) {
        fail('Packaging source tarball failed');
    }
}

/**
 * Build both the electron application and the launcher binary.
 */
function buildApplication(
    dirs: Directories,
    flavor: BuildFlavor,
): {
    binaryBasename: string;
    binaryDirPath: string;
} {
    // Determine paths
    const buildOutputDir = path.join(dirs.root, 'build', 'electron', 'packaged');
    const binaryBasename = determineAppName(flavor);
    const binaryDir = `${binaryBasename}-${process.platform}-${process.arch}`;
    const binaryDirPath = path.join(buildOutputDir, binaryDir);

    // Build application
    log.minor('Running dist script to package binary release');
    const resultApp = spawnSync(IS_WINDOWS ? 'npm.cmd' : 'npm', ['run', `dist:${flavor}`], {
        cwd: dirs.root,
        encoding: 'utf8',
        shell: false,
        stdio: [null, 1, 2],
    });
    if (resultApp.status !== 0) {
        console.warn(resultApp);
        fail(`Building binary failed, exit code ${resultApp.status}`);
    }
    if (!fs.existsSync(binaryDirPath)) {
        fail(
            `Could not find binary dir after building, path\n    ${binaryDirPath}\n    does not exist`,
        );
    }
    log.minor('Binary successfully built');

    return {binaryBasename, binaryDirPath};
}

/**
 * Sign a Windows Binary (.exe) or Package (.msix).
 */
function signWindowsBinaryOrPackage(pathToSign: string, flavor: BuildFlavor): void {
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
    const description = determineAppName(flavor);
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
 * Build Electron binaries for the current architecture.
 *
 * Requirements (POSIX):
 *
 * - bash
 * - tar
 *
 * Requirements (Windows):
 *
 * - powershell
 */
function buildBinaryArchives(dirs: Directories, signed: boolean, args: string[]): void {
    log.major(
        `Building ${signed ? 'signed' : 'unsigned'} binary archives for the current architecture`,
    );

    // Check requirements
    requireCommand(IS_WINDOWS ? 'powershell' : 'bash');
    if (!IS_WINDOWS) {
        requireCommand('sha256sum');
    }
    if (IS_POSIX) {
        requireCommand('tar');
    }
    requireCommand('cargo');

    // Parse args
    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }
    const flavors = parseBuildFlavors(unwrap(args[0]));

    // Build all flavors
    for (const flavor of flavors) {
        buildBinaryArchive(dirs, flavor, signed);
    }
}

function buildBinaryArchive(dirs: Directories, flavor: BuildFlavor, sign: boolean): void {
    // Build
    const {binaryDirPath: binaryDirPathOld} = buildApplication(dirs, flavor);

    // Rename and copy to temporary directory
    log.minor(`Packaging binary: ${flavor}`);
    const appId = determineAppIdentifier(flavor);
    const binaryDirNew = `${appId}-bin-${process.platform}-${process.arch}`;
    const binaryDirPathNew = path.join(dirs.tmp, binaryDirNew);
    copySync(binaryDirPathOld, binaryDirPathNew, {
        errorOnExist: true,
        dereference: false,
        preserveTimestamps: false,
    });

    // Sign
    if (sign) {
        if (IS_WINDOWS) {
            for (const exe of ['ThreemaDesktop.exe', 'ThreemaDesktopLauncher.exe']) {
                signWindowsBinaryOrPackage(path.join(binaryDirPathNew, exe), flavor);
            }
        } else {
            fail('Binary signing not supported on non-Windows hosts');
        }
    }

    // Compress
    let binaryOutPath;
    if (IS_WINDOWS) {
        binaryOutPath = path.join(dirs.out, `${binaryDirNew}.zip`);
        execFileSync(
            'powershell.exe',
            [
                'Compress-Archive',
                '-Path',
                binaryDirNew,
                '-DestinationPath',
                binaryOutPath,
                '-CompressionLevel',
                'Optimal',
            ],
            {
                cwd: dirs.tmp,
                encoding: 'utf8',
                shell: false,
            },
        );
    } else {
        binaryOutPath = path.join(dirs.out, `${binaryDirNew}.tar.gz`);
        execFileSync('tar', ['cfz', binaryOutPath, binaryDirNew], {
            cwd: dirs.tmp,
            encoding: 'utf8',
            shell: false,
        });
    }

    // Generate checksums
    log.minor('Generating checksums');
    let shell: string;
    let args: string[];
    if (IS_WINDOWS) {
        shell = 'powershell.exe';
        args = [
            path.join(dirs.root, 'packaging', 'generate-checksums.ps1'),
            '-filepath',
            binaryOutPath,
        ];
    } else {
        shell = 'bash';
        args = [path.join(dirs.root, 'packaging', 'generate-checksums.sh'), binaryOutPath];
    }
    execFileSync(shell, args, {
        cwd: dirs.root,
        encoding: 'utf8',
        shell: false,
    });

    log.major(`Done, wrote ${binaryOutPath}`);
}

/**
 * Build multiple macOS DMGs.
 */
async function buildDmgs(dirs: Directories, signed: boolean, args: string[]): Promise<void> {
    log.major(`Building ${signed ? 'signed' : 'unsigned'} macOS DMGs`);

    // Parse args
    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }
    const flavors = parseBuildFlavors(unwrap(args[0]));

    // Build all flavors
    for (const flavor of flavors) {
        await buildDmg(dirs, flavor, signed, signed);
    }
}

/**
 * Build a concrete macOS DMG.
 *
 * Required env vars for signing or notarizing:
 *
 * - `APPLE_TEAM_ID`
 * - `APPLE_KEYCHAIN`
 * - `APPLE_KEYCHAIN_PASSWORD`
 * - `APPLE_NOTARIZE_KEYCHAIN_PROFILE`
 */
async function buildDmg(
    dirs: Directories,
    flavor: BuildFlavor,
    sign: boolean,
    notarize: boolean,
): Promise<void> {
    log.minor(`Building DMG: ${flavor}`);

    requireCommand('cargo');

    const hasChecksumBinaries =
        checkCommandAvailability('sha256sum') && checkCommandAvailability('b2sum');

    // Build
    const {binaryDirPath, binaryBasename} = buildApplication(dirs, flavor);

    // Variables depending on build flavor
    const appName = determineAppName(flavor);
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
        default:
            unreachable(flavor);
    }

    // Determine paths
    const originalAppPath = `${binaryDirPath}/${binaryBasename}.app`;
    const appPath = `${binaryDirPath}/${appName}.app`;
    const outPath = path.join(dirs.root, 'build', 'installers', 'mac');

    // Rename app directory
    fs.renameSync(originalAppPath, appPath);

    // Unlock keychain
    if (sign || notarize) {
        unlockKeychain();
    }

    // Sign
    if (sign) {
        const {signAsync} = await import('@electron/osx-sign');
        log.minor(`Start signing at ${new Date().toLocaleTimeString()}`);
        // Docs: https://www.npmjs.com/package/@electron/osx-sign
        const appleTeamId = unwrap(process.env.APPLE_TEAM_ID, 'Missing APPLE_TEAM_ID env var');
        await signAsync({
            app: appPath,
            identity: `Developer ID Application: Threema GmbH (${appleTeamId})`,
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
            tool: 'notarytool',
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
        title: appName,
        icon: path.join(dirs.root, 'packaging', 'assets', 'icons', 'mac', iconFilename),
        overwrite: true,
        background: path.join(
            dirs.root,
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
            [path.join(dirs.root, 'packaging', 'generate-checksums.sh'), dmgPath],
            {
                cwd: dirs.root,
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
function buildMsixs(dirs: Directories, signed: boolean, args: string[]): void {
    log.major(`Building ${signed ? 'signed' : 'unsigned'} Windows MSIX packages`);

    // Parse args
    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }
    const flavors = parseBuildFlavors(unwrap(args[0]));

    // Build all flavors
    for (const flavor of flavors) {
        buildMsix(dirs, flavor, signed);
    }
}

/**
 * Build a concrete Windows MSIX.
 */
function buildMsix(dirs: Directories, flavor: BuildFlavor, sign: boolean): void {
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

    // Build electron distribution
    const {binaryDirPath} = buildApplication(dirs, flavor);

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
    const displayName = determineAppName(flavor);
    const applicationId = determineMsixApplicationId(flavor);
    const identityName = applicationId;

    // Write manifest file
    const manifestTemplate = fs.readFileSync('msix/AppxManifest.xml', {encoding: 'utf8'});
    const manifest = manifestTemplate
        .replaceAll('{{identityName}}', identityName)
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
        cwd: dirs.root,
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
    const appId = determineAppIdentifier(flavor);
    const msixOutPath = path.join(dirs.out, `${appId}-windows-${process.arch}.msix`);
    log.minor(`Writing MSIX file to ${msixOutPath}`);
    if (sign) {
        for (const exe of ['ThreemaDesktop.exe', 'ThreemaDesktopLauncher.exe']) {
            signWindowsBinaryOrPackage(path.join(binaryDirPath, exe), flavor);
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
        signWindowsBinaryOrPackage(msixOutPath, flavor);
    }

    // Generate checksums
    log.minor('Generating checksums');
    execFileSync(
        'powershell.exe',
        [path.join(dirs.root, 'packaging', 'generate-checksums.ps1'), '-filepath', msixOutPath],
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
function buildFlatpaks(dirs: Directories, args: string[]): void {
    log.major('Building Linux Flatpaks');

    // Parse args
    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }
    const flavors = parseBuildFlavors(unwrap(args[0]));
    const appIds = [];
    for (const flavor of flavors) {
        appIds.push(determineAppRdn(flavor));
    }
    const generateDepsOnly = args.includes('--generate-deps-only');
    if (generateDepsOnly) {
        args = args.filter((a) => a !== '--generate-deps-only');
    }
    log.minor(`Building apps: ${appIds.join(', ')} (generateDepsOnly=${generateDepsOnly})`);

    requireCommand('bash');
    if (!generateDepsOnly) {
        requireCommand('flatpak');
        requireCommand('flatpak-builder');
    }
    requireCommand('python3');

    // Layer dependencies
    const layerDependenciesVersion = '23.08';
    const dependencies = [
        'org.electronjs.Electron2.BaseApp',
        'org.freedesktop.Sdk',
        'org.freedesktop.Sdk.Extension.node20',
        'org.freedesktop.Sdk.Extension.rust-stable',
    ];

    // Child process options
    const flatpakDir = path.join(dirs.root, 'packaging', 'flatpak');
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
    log.minor('Generate npm source JSON');
    execFileSync(
        'python3',
        [
            '-m',
            'flatpak-builder-tools.flatpak_node_generator',
            'npm',
            '--electron-node-headers',
            '-o',
            'generated-npm-sources.json',
            '../../package-lock.json',
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
            '../../src/launcher/Cargo.lock',
        ],
        options,
    );

    if (generateDepsOnly) {
        log.major('Done (generateDepsOnly=true)');
        return;
    }

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
    for (const appId of appIds) {
        log.minor(`Building app ${appId}`);
        execFileSync(
            'flatpak-builder',
            [...buildArgs, 'build', path.join(flatpakDir, `${appId}.yml`)],
            options,
        );
    }

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
    log.minor(`    flatpak install --reinstall <app-id>`);
    log.minor(`To launch Threema from the command line:`);
    log.minor(`    flatpak run <app-id>`);
    log.minor(`Available app IDs:`);
    for (const appId of appIds) {
        log.minor(`    - ${appId}`);
    }
}

main(process.argv.slice(2));
