import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'process';

import {CUSTOM_CONFIG_SCHEMA} from '../config/custom-config.mjs';

import {generateAppIcons} from './custom-build-utils.mjs';

function parseOption(arg, argv, options) {
    if (options.programArgv === undefined) {
        options.programArgv = [];
    }
    switch (arg) {
        case '-c':
            options.configPath = argv.shift();
            break;
        case '--app-name':
            options.useAppName = true;
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

    if (options.printHelp) {
        console.info(`Usage: ${node} ${script} -c <custom-build-config-path> [--use-app-name]`);
        console.info();
        console.info('Required argument:');
        console.info('-c    Path to your custom build config file');
        console.info('Optional Parameters');
        console.info(
            '--use-app-name     Whether or not to use the app name to store the files. If specified, they will be stored in `generated-icons/<config.appName>`, \n otherwise the files will be moved to the correct location for packaging',
        );
        process.exit(0);
    }
    if (options.configPath === undefined) {
        console.error(`Usage: ${node} ${script} -c <custom-build-config-path> [--use-app-name]`);
        process.exit(1);
    }

    if (process.platform !== 'darwin') {
        console.error('The app icons can only be generated on macOS');
        process.exit(1);
    }

    const configFile = fs.readFileSync(options.configPath);
    const baseConfigPath = path.dirname(options.configPath);
    const buildConfigs = CUSTOM_CONFIG_SCHEMA.parse(JSON.parse(configFile));

    for (const config of buildConfigs) {
        console.log(
            `Generating icons into ${options.useAppName ? config.appName : 'standard location'}`,
        );
        generateAppIcons(
            baseConfigPath,
            config,
            options.useAppName ? `generated-icons/${config.appName}` : undefined,
        );
    }

    console.log('Successfully generated app icons');
}

main();
