const fs = require('node:fs');
const {join, resolve} = require('node:path');

const debug = require('debug');
const {GotDownloader} = require('@electron/get/dist/cjs/GotDownloader');
const packager = require('electron-packager');
const {populateIgnoredPaths} = require('electron-packager/src/copy-filter');

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
            } else {
                return 'continue';
            }
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

async function packageApp(variant, environment) {
    const options = {};
    populateIgnoredPaths(options);

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
            switch (`${variant}-${environment}`) {
                case 'consumer-live':
                    appBundleId = 'ch.threema.threema-desktop';
                    break;
                case 'consumer-sandbox':
                    appBundleId = 'ch.threema.threema-sandbox-desktop';
                    break;
                case 'work-live':
                    appBundleId = 'ch.threema.threema-work-desktop';
                    break;
                case 'work-sandbox':
                    appBundleId = 'ch.threema.threema-red-desktop';
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
                    'ProductName': pkg.productName,
                    'InternalName': pkg.productName,
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
        appCopyright: '© Threema GmbH – Released under the AGPL-3.0 license',
        name: pkg.productName,
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
            resolve(
                __dirname,
                '..',
                'src',
                'public',
                'res',
                'icons',
                `${variant}-${environment}`,
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
                        __dirname,
                        '..',
                        'src',
                        'public',
                        'res',
                        'icons',
                        'msix',
                        `${variant}-${environment}`,
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
            checksums: JSON.parse(fs.readFileSync(resolve(__dirname, '..', 'node_modules', 'electron', 'checksums.json'))),
            // Override the downloader and log all download requests
            downloader: LoggingDownloader,
        },
        ...platformSpecificOptions,
    });

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

    packageApp(variant, environment).catch((error) => console.error(error));
}
