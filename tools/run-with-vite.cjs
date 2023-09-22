#!/usr/bin/env node
const childProcess = require('node:child_process');
const fs = require('node:fs');

const {createServer} = require('vite');

function parseOption(arg, argv, options) {
    if (options.programArgv === undefined) {
        options.programArgv = [];
    }
    switch (arg) {
        case '-c':
            options.viteConfigPath = argv.shift();
            break;
        case '-m':
            options.viteEnvMode = argv.shift();
            break;
        case '-r':
            options.program = argv.shift();
            break;
        case '-p':
            options.pidfile = argv.shift();
            break;
        case '--':
            for (let v = argv.shift(); v !== undefined; v = argv.shift()) {
                options.programArgv.push(v);
            }
            break;
        default:
            // Ignore
            break;
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
    console.info(`Starting ${options.program} ${options.programArgv.join(' ')}`);
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
