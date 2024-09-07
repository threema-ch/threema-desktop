/**
 * Build the electron application.
 */
const childProcess = require('node:child_process');
const path = require('node:path');
const process = require('node:process');

const TARGET = 'electron';
const ENTRIES = ['app', 'electron-preload', 'electron-main', 'cli'];

// Parse arguments
const [node, script, ...argv] = process.argv;
if (argv.length !== 2) {
    console.error(`Usage: ${node} ${script} (consumer|work) (sandbox|live|onprem)`);
    process.exit(1);
}
const variant = argv[0];
const environment = argv[1];

// Determine root dir
const rootDir = path.join(__dirname, '..');

// Determine git revision (if any)
let gitRevision;
try {
    gitRevision = childProcess
        .execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: rootDir,
            encoding: 'utf8',
            timeout: 10000,
        })
        .trim();
    console.info(`Git revision: ${gitRevision}`);
} catch (error) {
    console.warn(`Could not determine git revision: ${error.message.replace(/\n/u, '\\n')}`);
    gitRevision = '';
}

// Build all vite make targets
for (const entry of ENTRIES) {
    console.info(
        `Building target=${TARGET} variant=${variant} entry=${entry} environment=${environment}`,
    );
    try {
        childProcess.execFileSync(
            'node',
            [
                'node_modules/vite/bin/vite.js',
                'build',
                '-m',
                'production',
                '-c',
                'config/vite.config.ts',
            ],
            {
                cwd: rootDir,
                env: {
                    VITE_MAKE: `${TARGET},${entry},${variant},${environment}`,
                    GIT_REVISION: gitRevision,
                    PATH: process.env.PATH,
                    SENTRY_DSN: process.env.SENTRY_DSN,
                    MINIDUMP_ENDPOINT: process.env.MINIDUMP_ENDPOINT,
                },
                stdio: 'pipe',
                encoding: 'utf-8',
            },
        );
    } catch (error) {
        console.error(`\nERROR: Failed to build application:\n${error.stderr}`);
        process.exit(1);
    }
}
