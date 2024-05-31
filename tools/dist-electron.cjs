const fs = require('node:fs');
const {join, resolve} = require('node:path');
const process = require('node:process');

// Due to https://github.com/import-js/eslint-plugin-import/issues/2168:
// eslint-disable-next-line import/no-extraneous-dependencies
const {flipFuses, FuseVersion, FuseV1Options} = require('@electron/fuses');
// Note: Not listed as a dependency because this is tied to electron and we take whatever we get here.
// eslint-disable-next-line import/no-extraneous-dependencies
const {GotDownloader} = require('@electron/get/dist/cjs/GotDownloader');
const packager = require('@electron/packager');
const {populateIgnoredPaths} = require('@electron/packager/dist/copy-filter');
const debug = require('debug');

const log = debug('dist-electron');

function allow(directory, pattern) {
    return (path) => {
        if (path === directory) {
            // It is the path itself
            // -> Continue walking recursively
            return 'allow';
        }

        if (path.startsWith(directory)) {
            // It is within path
            // -> Continue walking recursively if allowed by the pattern
            if (path.replace(directory, '').match(pattern)) {
                return 'allow';
            }
            return 'continue';
        }

        const parts = directory.split('/');
        for (const index of parts.keys()) {
            const sub = parts.slice(0, index + 1).join('/');
            if (path === sub) {
                // It is a sub-path of path
                // -> Continue walking recursively
                return 'allow';
            }

            if (!path.startsWith(`${sub}/`)) {
                // It is either not a sub-path of path or a file not within path
                // -> Stop walking recursively
                return 'continue';
            }
        }

        // It is not within path
        // -> Stop walking recursively
        return 'continue';
    };
}

/**
 * Set electron fuses to disable certain features in production builds, see
 * https://www.electronjs.org/docs/latest/tutorial/fuses
 */
async function setElectronFuses(binaryPath) {
    await flipFuses(binaryPath, {
        version: FuseVersion.V1,
        resetAdHocDarwinSignature: process.platform === 'darwin' && process.arch === 'arm64',
        // Disable ELECTRON_RUN_AS_NODE
        [FuseV1Options.RunAsNode]: false,
        // Enable cookie encryption
        // Note: Threema doesn't set any cookies, so this has no advantage. On the other hand, it
        // causes a keychain permission request to appear, which we don't want if it has no benefit.
        [FuseV1Options.EnableCookieEncryption]: false,
        // Disable the NODE_OPTIONS environment variable
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        // Disable the --inspect and --inspect-brk family of CLI options
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        // Enable validation of the app.asar archive on macOS
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        // Enforce that Electron will only load your app from "app.asar" instead of its normal search paths
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
        // Load V8 Snapshot from `browser_v8_context_snapshot.bin` for the browser process
        // Note: Threema seems to crash on launch when setting this to true.
        [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    });
}

/**
 * A custom downloader for @electron/get that logs all requests.
 */
const LoggingDownloader = {
    download: (url, targetFilePath, options) => {
        console.warn(
            `dist-electron.cjs: @electron/get is downloading artifact: url=${url}, path=${targetFilePath}`,
        );
        return new GotDownloader().download(url, targetFilePath, options);
    },
};

/**
 * Determine the app name used for packaging.
 *
 * Note: Keep in sync with identical function in config/build.ts
 *
 * @throws Error if invalid flavor is passed in.
 */
function determineAppName(flavor) {
    let name = 'Threema';
    switch (flavor) {
        case 'consumer-live':
            break;
        case 'consumer-sandbox':
            name += ' Green';
            break;
        case 'work-live':
            name += ' Work';
            break;
        case 'work-sandbox':
            name += ' Blue';
            break;
        case 'work-onprem':
            name += ' OnPrem';
            break;
        default:
            throw new Error(`Invalid flavor: ${flavor}`);
    }
    name += ' Beta';
    return name;
}

function determineBinaryName(flavor) {
    switch (process.platform) {
        case 'darwin':
            return `${determineAppName(flavor)}.app`;
        case 'win32':
            return 'ThreemaDesktop.exe';
        default:
            return 'ThreemaDesktop';
    }
}

async function packageApp(variant, environment) {
    const options = {};
    populateIgnoredPaths(options);

    // Determine app name
    const flavor = `${variant}-${environment}`;
    const appName = determineAppName(flavor);

    // Load package.json
    const pkg = JSON.parse(fs.readFileSync(resolve(__dirname, '..', 'package.json')));

    // Build allow-list
    const allowances = Object.entries(pkg.electron.dist.include || {}).map(([directory, pattern]) =>
        allow(directory, new RegExp(pattern, 'u')),
    );
    log('#Rules:', allowances.length);

    // DOC: https://electron.github.io/electron-packager/v16.0.0/interfaces/electronpackager.options.html#icon
    let icon;
    let platformSpecificOptions = {};

    switch (process.platform) {
        case 'darwin': {
            let appBundleId;
            switch (flavor) {
                case 'consumer-live':
                    appBundleId = 'ch.threema.threema-desktop';
                    break;
                case 'consumer-sandbox':
                    appBundleId = 'ch.threema.threema-green-desktop';
                    break;
                case 'work-live':
                    appBundleId = 'ch.threema.threema-work-desktop';
                    break;
                case 'work-sandbox':
                    appBundleId = 'ch.threema.threema-blue-desktop';
                    break;
                case 'work-onprem':
                    appBundleId = 'ch.threema.threema-onprem-desktop';
                    break;
                default:
                    throw new Error(`Invalid variant or environment: ${variant}-${environment}`);
            }
            icon = resolve(
                __dirname,
                '..',
                'packaging',
                'assets',
                'icons',
                'mac',
                `${variant}-${environment}.icns`,
            );
            platformSpecificOptions = {
                // Will be used as CFBundleIdentifier in Info.plist
                appBundleId,
                // Will be used as LSApplicationCategoryType in Info.plist
                // DOC: https://electron.github.io/electron-packager/v16.0.0/interfaces/electronpackager.options.html#appcategorytype
                appCategoryType: 'public.app-category.social-networking',
                darwinDarkModeSupport: true,
                extendInfo: {
                    LSFileQuarantineEnabled: true,
                },
            };
            break;
        }
        case 'win32': {
            icon = resolve(
                __dirname,
                '..',
                'packaging',
                'assets',
                'icons',
                'win',
                `${variant}-${environment}.ico`,
            );
            platformSpecificOptions = {
                // DOC: https://electron.github.io/electron-packager/v16.0.0/interfaces/electronpackager.win32metadataoptions.html
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

    // Package
    // DOC: https://electron.github.io/electron-packager/v16.0.0/interfaces/electronpackager.options.html
    const [outputPath] = await packager({
        appCopyright: '© Threema GmbH, all rights reserved',
        name: appName,
        executableName: 'ThreemaDesktop',
        dir: resolve(__dirname, '..'),
        out: resolve(__dirname, '..', 'build', 'electron', 'packaged'),

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
            resolve(__dirname, '..', 'src', 'public', 'res', 'icons', flavor, 'icon-512.png'),
            ...[16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256]
                .flatMap((size) => {
                    const base = `Square44x44Logo.targetsize-${size}`;
                    const modifiers = ['', '_altform-unplated', '_altform-lightunplated'];

                    return modifiers.map((mod) => `${base}${mod}.png`);
                })
                .concat(['StoreLogo.png', 'Square150x150Logo.png', 'Square44x44Logo.png'])
                .map((filename) =>
                    resolve(
                        __dirname,
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
            // Deny: Default rules from electron-packager
            if (options.ignore.some((rule) => path.match(rule))) {
                log(' !', path);
                return true;
            }

            // Deny: dotfiles
            if (path.match(/\/\..+$/u)) {
                log(' !', path);
                return true;
            }

            // Go through rules list
            for (const command of allowances) {
                switch (command(path)) {
                    case 'allow':
                        // Allowed: Continue walking recursively
                        log(' +', path);
                        return false;
                    case 'deny':
                        // Denied: Stop walking recursively
                        log(' -', path);
                        return true;
                    case 'continue':
                        // No decision: Continue traversing ruleset
                        // log(' ?', path);
                        break;
                    default:
                        throw new Error('Unknown reply');
                }
            }

            // Default: Block
            log('  ', path);
            return true;
        },
        overwrite: true,
        prune: true,
        afterPrune: [
            (buildPath, electronVersion, platform, arch, done) => {
                // Remove empty directories within `node_modules`
                const nodeModulesPath = resolve(buildPath, 'node_modules');
                const dir = fs.opendirSync(nodeModulesPath);
                let entry;
                while ((entry = dir.readSync()) !== null) {
                    const modulePath = resolve(nodeModulesPath, entry.name);
                    if (entry.isDirectory() && fs.readdirSync(modulePath).length === 0) {
                        fs.rmSync(modulePath, {recursive: true});
                    }
                }
                dir.closeSync();

                // Done cleaning up!
                done();
            },
        ],
        download: {
            // Use checksums provided by the electron package
            checksums: JSON.parse(
                fs.readFileSync(
                    resolve(__dirname, '..', 'node_modules', 'electron', 'checksums.json'),
                ),
            ),
            // Override the downloader and log all download requests
            downloader: LoggingDownloader,
        },
        ...platformSpecificOptions,
    });

    // Set electron fuses
    const binaryPath = join(outputPath, determineBinaryName(flavor));
    console.log(`Setting electron fuses for ${binaryPath}`);
    await setElectronFuses(binaryPath);

    console.info(`Packaged: ${outputPath}`);
}

if (require.main === module) {
    // Parse arguments
    const [node, script, ...argv] = process.argv;
    if (argv.length !== 2) {
        console.error(`Usage: ${node} ${script} (consumer|work) (sandbox|live)`);
        process.exit(1);
    }
    const variant = argv[0];
    const environment = argv[1];

    packageApp(variant, environment).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
