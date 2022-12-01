/**
 * Build the electron application.
 */
const childProcess = require('node:child_process');
const path = require('node:path');
const process = require('node:process');

const TARGET = 'electron';
const ENTRIES = ['electron-main', 'electron-preload', 'app'];

// Parse arguments
const [node, script, ...argv] = process.argv;
if (argv.length !== 2) {
    console.error(`Usage: ${node} ${script} (consumer|work) (sandbox|live)`);
    process.exit(1);
}
const variant = argv[0];
const environment = argv[1];

// Determine root dir
const rootDir = path.join(__dirname, '..');

// Determine git revision (if any)
let gitDescribe;
try {
    gitDescribe = childProcess
        .execFileSync('git', ['describe', '--always', '--dirty'], {
            cwd: rootDir,
            encoding: 'utf8',
            timeout: 10000,
        })
        .trim();
    console.info(`Git revision: ${gitDescribe}`);
} catch (error) {
    console.warn(`Could not determine git revision: ${error.message.replace(/\n/u, '\\n')}`);
    gitDescribe = '';
}

// Build all vite make targets
for (const entry of ENTRIES) {
    console.info(
        `Building target=${TARGET} variant=${variant} entry=${entry} environment=${environment}`,
    );
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
                GIT_DESCRIBE: gitDescribe,
                PATH: process.env.PATH,
            },
            stdio: [0, 1, 2],
        },
    );
}
