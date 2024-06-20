import {spawnSync} from 'node:child_process';
import * as path from 'node:path';
import * as process from 'node:process';
import * as readline from 'node:readline/promises';

import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {extractErrorTraceback} from '~/common/error';
import {CONSOLE_LOGGER} from '~/common/logging';
import {randomBytes} from '~/common/node/crypto/random';
import {FileSystemKeyStorage} from '~/common/node/key-storage';
import type {u53} from '~/common/types';
import {assert, setAssertFailLogger, unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';

const COMMANDS = ['openSqlite'] as const;

type Command = (typeof COMMANDS)[u53];

const logger = CONSOLE_LOGGER;

const USAGES: Record<Command, {readonly usage: string; readonly help: string}> = {
    openSqlite: {
        usage: '<profile-dir>',
        help: 'Open the encrypted SQLite database with `sqlcipher`. Requires the `sqlcipher` binary on your system.',
    },
};

function printUsage(entrypoint: string): void {
    logger.info(`Usage: ${entrypoint} COMMAND <command-args>`);
    logger.info();
    logger.info('Commands:');
    for (const command of COMMANDS) {
        logger.info(`  ${command}: ${USAGES[command].help}`);
        logger.info(`    Args: ${USAGES[command].usage}`);
    }
}

/**
 * Parse command line arguments.
 */
function parseArgs(argv: readonly string[]): Command {
    const node = argv[0];
    const entrypoint = argv[1];
    assert(node !== undefined && entrypoint !== undefined, 'argv does not include entrypoint');

    // Handle --help
    if (argv.includes('--help')) {
        printUsage(entrypoint);
        process.exit(1);
    }

    // Extract command
    const command = argv[2];
    if (command === undefined) {
        printUsage(entrypoint);
        process.exit(1);
    }
    for (const validCommand of COMMANDS) {
        if (validCommand === command) {
            return command;
        }
    }
    logger.error(`Unknown command: ${command}`);
    printUsage(entrypoint);
    return process.exit(1);
}

async function main(): Promise<void> {
    logger.info();
    logger.info('▀█▀ █▄█ █▀▄ ██▀ ██▀ █▄ ▄█ ▄▀▄   ▄▀▀ █   █');
    logger.info(' █  █ █ █▀▄ █▄▄ █▄▄ █ ▀ █ █▀█   ▀▄▄ █▄▄ █');
    logger.info();

    const command = parseArgs(process.argv);

    switch (command) {
        case 'openSqlite':
            await runSqlite(process.argv.slice(3));
            break;
        default:
            unreachable(command);
    }
}

async function runSqlite(argv: string[]): Promise<void> {
    const crypto = new TweetNaClBackend(randomBytes);

    const profilePath = argv[0];
    if (profilePath === undefined) {
        logger.error('Please provide <profile-dir> parameter!');
        return process.exit(1);
    }

    // Check for appropriate sqlcipher version
    const checkVersionResult = spawnSync('sqlcipher', ['--version'], {encoding: 'utf-8'});
    if (checkVersionResult.error !== undefined) {
        logger.error(`Could not invoke \`sqlcipher\` binary: ${checkVersionResult.error}`);
        logger.error('Please ensure that you have installed SQLCipher 4 on your system.');
        return process.exit(1);
    }
    const checkVersionOutput = checkVersionResult.stdout.trim();
    const sqlCipherVersion = checkVersionOutput.match(/\(SQLCipher (?<version>[^)]*)\)/u)?.groups
        ?.version;
    if (sqlCipherVersion === undefined) {
        logger.error(`SQLCipher version detection failed: ${checkVersionOutput}`);
        logger.error('Please ensure that you have installed SQLCipher 4 on your system.');
        return process.exit(1);
    }
    logger.info(`Found sqlcipher version: ${sqlCipherVersion}`);
    if (!sqlCipherVersion.startsWith('4.')) {
        logger.error('Did not detect SQLCipher version 4.');
        logger.error('Please ensure that you have installed SQLCipher 4 on your system.');
        return process.exit(1);
    }

    // Open key storage
    const keyStoragePath = path.join(profilePath, 'data', 'keystorage.pb3');
    const keyStorage = new FileSystemKeyStorage({crypto}, logger, keyStoragePath);

    // Prompt for password
    //
    // (Note: Prompting for a password seems to be non-trivial in native NodeJS, and I did not want
    // to pull in a dependency for this...)
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    const keyStoragePassword = await rl.question(
        'Key storage password (WARNING, will be visible): ',
    );
    rl.close();

    // Decrypt
    const contents = await keyStorage.read(keyStoragePassword);
    logger.info(`Loaded key storage for identity ${contents.identityData.identity}`);

    // Run sqlcipher
    const databasePath = path.join(profilePath, 'data', 'threema.sqlite');
    const spawnResult = spawnSync(
        'sqlcipher',
        [
            '-cmd',
            'PRAGMA cipher_compatibility = 4',
            '-cmd',
            `PRAGMA key = "x'${bytesToHex(contents.databaseKey.unwrap())}'"`,
            databasePath,
        ],
        {encoding: 'utf-8', stdio: 'inherit'},
    );
    if (spawnResult.status !== 0) {
        logger.error('Subprocess failed:', spawnResult);
    }
    return undefined;
}

setAssertFailLogger((error) => CONSOLE_LOGGER.error(extractErrorTraceback(error)));
main()
    .then(() => {})
    .catch((error: unknown) => {
        logger.error(`Command failed: ${error}`);
        process.exit(1);
    });
