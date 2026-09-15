#!/usr/bin/env node
// @ts-check

/**
 * Generate protobuf bindings for the Threema protocol layer.
 */
import {spawnSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {readPins} from './metadata.mjs';

/**
 * Run a command and fail if it does not exit cleanly.
 *
 * @param {string} command The executable to run.
 * @param {readonly string[]} args The arguments to pass.
 * @param {import('node:child_process').SpawnSyncOptions} [options] Additional spawn options.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} The completed spawn result.
 */
function run(command, args, options = {}) {
    const result = spawnSync(command, args, {stdio: 'inherit', ...options, encoding: 'utf8'});
    if (result.status !== 0) {
        console.error(`Error: "${command}" exited with status ${result.status}`);
        process.exit(1);
    }
    return result;
}

/**
 * Return the absolute paths of all files in `directory` matching `extension`.
 *
 * @param {string} directory The directory to scan.
 * @param {string} extension The file name suffix to match (e.g. `.proto`).
 * @returns {string[]} The matching absolute file paths.
 */
function filesWithExtension(directory, extension) {
    return fs
        .readdirSync(directory)
        .filter((name) => name.endsWith(extension))
        .map((name) => path.join(directory, name));
}

/**
 * Check out the given commit in the repository at `repoDir`, failing if the commit does not exist.
 *
 * @param {string} repoDir The repository directory.
 * @param {string} commitHash The commit hash to check out.
 */
function checkoutCommit(repoDir, commitHash) {
    const verify = spawnSync(
        'git',
        ['rev-parse', '--verify', '--quiet', `${commitHash}^{commit}`],
        {cwd: repoDir, stdio: 'ignore'},
    );
    if (verify.status !== 0) {
        console.error(`Error: commit ${commitHash} not found in repository: ${repoDir}`);
        process.exit(1);
    }
    run('git', ['checkout', commitHash], {cwd: repoDir});
}

// Parse and validate arguments. The commit to generate from is pinned in `package.json`.
const [protocolsDirArg] = process.argv.slice(2);
if (protocolsDirArg === undefined) {
    console.error(`Usage: ${process.argv[1]} <path-to-threema-protocols>`);
    process.exit(1);
}
const commitHash = readPins()['threema-protocols'];
const protocolsDir = path.resolve(protocolsDirArg);
const protocolsDirStat = fs.statSync(protocolsDir, {throwIfNoEntry: false});
if (protocolsDirStat === undefined || !protocolsDirStat.isDirectory()) {
    console.error(`Error: protocols directory not found: ${protocolsDir}`);
    process.exit(1);
}

// Check out the requested protocols commit
checkoutCommit(protocolsDir, commitHash);

// Set the CWD to the package root
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

// Protocol layer
const outdir = 'src/protobuf/js';
fs.mkdirSync(outdir, {recursive: true});
const outfile = path.join(outdir, 'index.js');
run('node_modules/.bin/pbjs', [
    ...filesWithExtension(path.join(protocolsDir, 'src'), '.proto'),
    '-o',
    outfile,
    '-t',
    'static-module',
    '-w',
    'es6',
    '--force-long',
    '--force-message',
    '--no-convert',
    '--no-create',
    '--no-delimited',
    '--no-typeurl',
    '--no-verify',
]);

// Generate types, then strip the LongJS `require` (we inject an ES import below instead)
const types = run('node_modules/.bin/pbts', [outfile], {stdio: ['ignore', 'pipe', 'inherit']});
const postprocessed = run('node', ['scripts/generate-protobuf-postprocess.cjs'], {
    input: types.stdout,
    stdio: ['pipe', 'pipe', 'inherit'],
});
fs.writeFileSync(
    path.join(outdir, 'index.d.ts'),
    postprocessed.stdout
        .split('\n')
        .filter((line) => !line.includes('require("long")'))
        .join('\n'),
);

// Inject Long global initialization
const lines = fs.readFileSync(outfile, 'utf8').split('\n');
fs.writeFileSync(
    outfile,
    [
        ...lines.slice(0, 2),
        '',
        '// Use LongJS',
        "import Long from 'long';",
        '$protobuf.util.Long = Long;',
        '$protobuf.configure();',
        ...lines.slice(2),
    ].join('\n'),
);
