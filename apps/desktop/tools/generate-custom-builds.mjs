import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'process';

import {CUSTOM_CONFIG_SCHEMA} from '../config/custom-config.mjs';

import {generateAppIcons} from './custom-build-utils.mjs';

const SCSS_PALETTE = `@use 'sass:color';
@use 'sass:map';

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

// Tailwind equivalent of the SCSS palette above. Maps the custom palette onto the `@threema/ui`
// Tailwind color tokens for `[data-branding='custom']`. Keep the placeholders in sync with
// `SCSS_PALETTE` and the committed `TAILWIND_THEME_PATH` file.
const CSS_PALETTE = `/*
 * Threema custom Tailwind palette.
 *
 * Generated at build time for \`custom-onprem\` builds by \`tools/generate-custom-builds.mjs\`
 * (analogous to \`src/sass/branding/_custom.scss\`), which maps the custom color palette onto the
 * \`@threema/ui\` Tailwind color tokens for \`[data-branding='custom']\`.
 */
[data-branding='custom'] {
  --color-primary-50: {primary-color-50};
  --color-primary-100: {primary-color-100};
  --color-primary-200: {primary-color-200};
  --color-primary-300: {primary-color-300};
  --color-primary-400: {primary-color-400};
  --color-primary-500: {primary-color-500};
  --color-primary-600: {primary-color-600};
  --color-primary-700: {primary-color-700};
  --color-primary-800: {primary-color-800};
  --color-primary-900: {primary-color-900};
}
`;

const TAILWIND_THEME_PATH = 'src/tailwind/custom.css';

/**
 * Fill a palette template (`SCSS_PALETTE` or `CSS_PALETTE`) with the given shades.
 *
 * @param {string} template The palette template containing `{primary-color-*}` placeholders.
 * @param {Record<string, string>} shades The shade values keyed by `primary50`..`primary900`.
 * @returns {string} The template with all placeholders replaced.
 */
function fillPalette(template, shades) {
    return template
        .replace('{primary-color-50}', shades.primary50)
        .replace('{primary-color-100}', shades.primary100)
        .replace('{primary-color-200}', shades.primary200)
        .replace('{primary-color-300}', shades.primary300)
        .replace('{primary-color-400}', shades.primary400)
        .replace('{primary-color-500}', shades.primary500)
        .replace('{primary-color-600}', shades.primary600)
        .replace('{primary-color-700}', shades.primary700)
        .replace('{primary-color-800}', shades.primary800)
        .replace('{primary-color-900}', shades.primary900);
}

/**
 * Write the given content to a theme file, truncating any existing content.
 *
 * @param {string} themePath The path to the theme file to (over)write.
 * @param {string} content The content to write.
 */
function writeThemeFile(themePath, content) {
    const descriptor = fs.openSync(themePath, 'w');
    fs.writeFileSync(descriptor, content, {encoding: 'utf-8', flag: 'w'});
    fs.closeSync(descriptor);
}

// Shades used to reset the custom branding back to its (white) placeholder state.
const WHITE_SHADES = {
    primary50: '#ffffff',
    primary100: '#ffffff',
    primary200: '#ffffff',
    primary300: '#ffffff',
    primary400: '#ffffff',
    primary500: '#ffffff',
    primary600: '#ffffff',
    primary700: '#ffffff',
    primary800: '#ffffff',
    primary900: '#ffffff',
};

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

    const appDir = path.resolve(import.meta.dirname, '..');
    const monorepoRootDir = path.resolve(appDir, '..', '..');

    for (let arg = argv.shift(); arg !== undefined; arg = argv.shift()) {
        parseOption(arg, argv, options);
    }

    if (options.printHelp === true) {
        console.info(
            `Usage: ${node} ${script} -c <custom-build-config-path> [--generate-icons] [--sign]`,
        );
        console.info();
        console.info('Required argument:');
        console.info('-c    Path to your custom build config file');
        console.info('Optional Parameters');
        console.info(
            '--generate-icons     Whether or not to generate the icons for your build, using the paths specified in your config. Defaults to false.',
        );
        console.info('--sign    Whether or not to sign the generated build. Defaults to false.');
        process.exit(0);
    }

    if (options.configPath === undefined) {
        console.error(
            `Usage: ${node} ${script} -c <custom-build-config-path> [--generate-icons] [--sign]`,
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

        // Apply the custom palette to both the SCSS theme and the Tailwind theme.
        writeThemeFile(THEME_PATH, fillPalette(SCSS_PALETTE, config.colorPalette.shades));
        writeThemeFile(TAILWIND_THEME_PATH, fillPalette(CSS_PALETTE, config.colorPalette.shades));

        childProcess.execSync('pnpm run package:desktop', {
            cwd: monorepoRootDir,
            env: {
                ...process.env,
                CUSTOM_CONFIG_PATH: path.resolve(options.configPath),
                CUSTOM_CONFIG_INDEX: `${idx}`,
                TURBO_BUILD_ENVIRONMENT: 'onprem',
                TURBO_BUILD_VARIANT: 'custom',
                TURBO_PACKAGE_SIGNATURE: options.sign,
            },
            shell: process.platform === 'win32' ? 'powershell.exe' : undefined,
            stdio: 'inherit',
        });

        console.info(`Successfully built app ${config.appName}`);
    }

    console.info('Resetting custom branding');

    // Reset both themes to white.
    writeThemeFile(THEME_PATH, fillPalette(SCSS_PALETTE, WHITE_SHADES));
    writeThemeFile(TAILWIND_THEME_PATH, fillPalette(CSS_PALETTE, WHITE_SHADES));
}

main();
