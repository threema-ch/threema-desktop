import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'process';

import {CUSTOM_CONFIG_SCHEMA} from '../config/custom-config.mjs';

import {generateAppIcons} from './custom-build-utils.mjs';

const SCSS_PALETTE = `@use 'sass:color';
@use 'sass:map';

$custom-primary-color: {primary-color};

$custom: (
  primary-color-50: {primary-color-50},
  primary-color-100: {primary-color-100},
  primary-color-200: {primary-color-200},
  primary-color-300: {primary-color-300},
  primary-color-400: {primary-color-400},
  primary-color-500: {primary-color-500},
  primary-color-600: {primary-color-600},
  primary-color-700: {primary-color-700},
  primary-color-800: {primary-color-800},
  primary-color-900: {primary-color-900},
);
`;

const THEME_PATH = 'src/sass/branding/_custom.scss';

function parseOption(arg, argv, options) {
    if (options.programArgv === undefined) {
        options.programArgv = [];
    }
    switch (arg) {
        case '-c':
            options.configPath = argv.shift();
            break;
        case '--generate-icons':
            options.generateIcons = true;
            break;
        case '--move-icons':
            options.moveIcons = true;
            break;
        case '--sign':
            options.sign = true;
            break;
        case '-h':
        case '--help':
            options.printHelp = true;
            break;
        default:
            // Ignore
            break;
    }
}

function main() {
    const {console} = globalThis;
    // Parse CLI arguments
    const [node, script, ...argv] = process.argv;
    const options = {};

    for (let arg = argv.shift(); arg !== undefined; arg = argv.shift()) {
        parseOption(arg, argv, options);
    }

    if (options.printHelp === true) {
        console.info(
            `Usage: ${node} ${script} -c <custom-build-config-path> [--generate-icons] [--move-icons] [--sign]`,
        );
        console.info();
        console.info('Required argument:');
        console.info('-c    Path to your custom build config file');
        console.info('Optional Parameters');
        console.info(
            '--generate-icons     Whether or not to generate the icons for your build, using the paths specified in your config. Defaults to false.',
        );
        console.info(
            '--move-icons     Whether or not to move pregenerated icons to the correct location. Looks for the icons in `./generated-icons/<config.appName>`. Defaults to false.',
        );
        console.info('--sign    Whether or not to sign the generated build. Defaults to false.');
        process.exit(0);
    }

    if (options.configPath === undefined) {
        console.error(
            `Usage: ${node} ${script} -c <custom-build-config-path> [--generate-icons] [--move-icons] [--sign]`,
        );
        process.exit(1);
    }

    if (process.platform !== 'darwin' && process.platform !== 'win32') {
        console.error('Custom builds are only available on macOS and Windows');
        process.exit(1);
    }

    if (process.platform !== 'darwin' && options.generateIcons) {
        console.error('The app icons can only be generated on macOS');
        process.exit(1);
    }

    const configFile = fs.readFileSync(options.configPath);
    const baseConfigPath = path.dirname(options.configPath);
    const buildConfigs = CUSTOM_CONFIG_SCHEMA.parse(JSON.parse(configFile));

    for (const [idx, config] of buildConfigs.entries()) {
        if (options.generateIcons === true && config.assetPaths === undefined) {
            console.error(
                `If you specify the --generate-icons option all builds need to specify icon asset paths, but ${config.appName} does not`,
            );
        }

        if (options.generateIcons === true) {
            console.log('Generating icons into correct locations');
            generateAppIcons(baseConfigPath, config);
        }

        if (options.moveIcons === true) {
            console.log(`Moving Icons from ${config.appName}/ into the correct location`);

            if (process.platform === 'win32') {
                // For some reason, robocopy returns 1 if successful.
                try {
                    childProcess.execFileSync(
                        'powershell.exe',
                        ['robocopy', `"generated-icons/${config.appName}"`, './', '/E'],
                        {
                            encoding: 'utf8',
                            stdio: 'ignore',
                        },
                    );
                } catch (error) {
                    // eslint-disable-next-line max-depth
                    if (error.status === 1) {
                        console.log('Robocopy successfully exited with code 1, continuing');
                    } else {
                        console.error(`Robocopy returned an error: ${error.status}`);
                        process.exit(1);
                    }
                }
            } else {
                childProcess.execSync(`rsync -av 'generated-icons/${config.appName}/' .`);
            }
        }

        const replacedSCSSContent = SCSS_PALETTE.replace(
            '{primary-color}',
            config.colorPalette.primary,
        )
            .replace('{primary-color-50}', config.colorPalette.shades.primary50)
            .replace('{primary-color-100}', config.colorPalette.shades.primary100)
            .replace('{primary-color-200}', config.colorPalette.shades.primary200)
            .replace('{primary-color-300}', config.colorPalette.shades.primary300)
            .replace('{primary-color-400}', config.colorPalette.shades.primary400)
            .replace('{primary-color-500}', config.colorPalette.shades.primary500)
            .replace('{primary-color-600}', config.colorPalette.shades.primary600)
            .replace('{primary-color-700}', config.colorPalette.shades.primary700)
            .replace('{primary-color-800}', config.colorPalette.shades.primary800)
            .replace('{primary-color-900}', config.colorPalette.shades.primary900);

        const brandingDescriptor = fs.openSync(THEME_PATH, 'w');
        fs.writeFileSync(brandingDescriptor, replacedSCSSContent, {encoding: 'utf-8', flag: 'w'});
        fs.closeSync(brandingDescriptor);

        childProcess.execSync(
            `npm run package ${process.platform === 'win32' ? 'msix' : 'dmg'}${options.sign ? 'Signed' : ''} custom-onprem`,
            {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    CUSTOM_CONFIG_PATH: path.resolve(options.configPath),
                    CUSTOM_CONFIG_INDEX: `${idx}`,
                },
                shell: process.platform === 'win32' ? 'powershell.exe' : undefined,
            },
        );

        console.info(`Successfully built app ${config.appName}`);
    }

    console.info('Resetting custom branding');

    // Reset to white.
    const whiteSCSSContent = SCSS_PALETTE.replace('{primary-color}', '#ffffff')
        .replace('{primary-color-50}', '#ffffff')
        .replace('{primary-color-100}', '#ffffff')
        .replace('{primary-color-200}', '#ffffff')
        .replace('{primary-color-300}', '#ffffff')
        .replace('{primary-color-400}', '#ffffff')
        .replace('{primary-color-500}', '#ffffff')
        .replace('{primary-color-600}', '#ffffff')
        .replace('{primary-color-700}', '#ffffff')
        .replace('{primary-color-800}', '#ffffff')
        .replace('{primary-color-900}', '#ffffff');

    const brandingDescriptor = fs.openSync(THEME_PATH, 'w');
    fs.writeFileSync(brandingDescriptor, whiteSCSSContent, {encoding: 'utf-8', flag: 'w'});
    fs.closeSync(brandingDescriptor);
}

main();
