/**
 * Build and run tests.
 */
const childProcess = require('node:child_process');
const path = require('node:path');
const process = require('node:process');

// Determine root dir
const rootDir = path.join(__dirname, '..');

// Platform info
const IS_WINDOWS = process.platform === 'win32';

// Parse arguments
const [node, script, ...argv] = process.argv;
if (argv.length < 1) {
    console.error(`Usage: ${node} ${script} (mocha|karma) [args...]`);
    process.exit(1);
}
const testsuite = argv.shift();

// Validate testsuite, determine dependent values
let entry;
let testCmd;
let testArgs;
switch (testsuite) {
    case 'mocha':
        entry = 'mocha-tests';
        testCmd = path.resolve(rootDir, 'node_modules/.bin', IS_WINDOWS ? 'mocha.cmd' : 'mocha');
        testArgs = ['build/electron/mocha-tests/run-specs.cjs'];
        break;
    case 'karma':
        entry = 'karma-tests';
        testCmd = path.resolve(rootDir, 'node_modules/.bin', IS_WINDOWS ? 'karma.cmd' : 'karma');
        testArgs = ['start', 'config/karma.cjs', '--single-run'];
        break;
    default:
        console.error(`Invalid testsuite argument: ${testsuite}`);
        process.exit(1);
}

// Build tests
const target = 'electron';
const variant = 'consumer';
const environment = 'sandbox';
console.info(
    `Building target=${target} variant=${variant} entry=${entry} environment=${environment}`,
);
childProcess.execFileSync(
    'node',
    ['node_modules/vite/bin/vite.js', 'build', '-m', 'development', '-c', 'config/vite.config.ts'],
    {
        cwd: rootDir,
        env: {
            VITE_MAKE: `${target},${entry},${variant},${environment}`,
            PATH: process.env.PATH,
        },
        stdio: [0, 1, 2],
    },
);

// Run tests
console.info(`\nRunning ${testsuite} test suite`);
testArgs.push(...argv);
try {
    childProcess.execFileSync(testCmd, testArgs, {
        cwd: rootDir,
        env: process.env, // Pass through all env vars, e.g. for CHROMIUM_BIN or similar
        stdio: [0, 1, 2],
    });
} catch (error) {
    console.warn(`Tests failed with exit code ${error.status}`);
    process.exit(error.status ?? 1);
}
