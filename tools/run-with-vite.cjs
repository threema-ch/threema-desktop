#!/usr/bin/env node
const fs = require('fs');
const childProcess = require('child_process');
const {createServer} = require('vite');

/**
 * Parses the following arguments into options:
 *
 * - `-c <vite-config-path>`
 * - `-m <vite-env-mode>`
 * - `-r <program>`
 * - `-- [<program-argument> ...]`
 */
function parseOption(arg, argv, options) {
    if (options.programArgv === undefined) {
        options.programArgv = [];
    }
    if (arg === '-c') {
        options.viteConfigPath = argv.shift();
        return;
    }
    if (arg === '-m') {
        options.viteEnvMode = argv.shift();
        return;
    }
    if (arg === '-r') {
        options.program = argv.shift();
        return;
    }
    if (arg === '-p') {
        options.pidfile = argv.shift();
        return;
    }
    if (arg === '--') {
        for (let v = argv.shift(); v !== undefined; v = argv.shift()) {
            options.programArgv.push(v);
        }
        return;
    }
}

async function main() {
    // Parse CLI arguments
    const [node, script, ...argv] = process.argv;
    const options = {};
    for (let arg = argv.shift(); arg !== undefined; arg = argv.shift()) {
        parseOption(arg, argv, options);
    }
    if (
        options.viteConfigPath === undefined ||
        options.program === undefined ||
        options.programArgv === undefined
    ) {
        console.error(
            `Usage: ${node} ${script}` +
                ' -c <vite-config-path>' +
                ' -r <program>' +
                ' -p <pidfile>' +
                ' [-- [<program-argument> ...]]',
        );
        process.exit(1);
    }

    // Run vite server and wait for it to be ready
    const server = await createServer({
        configFile: options.viteConfigPath,
        mode: options.viteEnvMode,
    });
    await server.listen();

    // Run program
    console.info(
        `Starting ${options.program} ${options.programArgv.join(' ')}`,
    );
    const child = childProcess.spawn(options.program, options.programArgv, {
        env: {...process.env},
        stdio: 'inherit',
    });

    // Write pidfile
    if (options.pidfile) {
        console.info(`Writing pidfile ${options.pidfile} (PID is ${child.pid})`);
        fs.writeFileSync(options.pidfile, `${child.pid}\n`);
    }

    // Handle termination of child process
    child.on('exit', (code) => {
        // Clean up pidfile
        if (options.pidfile && fs.existsSync(options.pidfile)) {
            fs.unlinkSync(options.pidfile);
        }

        // Propagate exit code
        process.exit(code);
    });
}

if (require.main === module) {
    main();
}
