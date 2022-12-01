/**
 * Rename a file in a platform-independent way.
 */

const fs = require('node:fs');
const process = require('node:process');

const [node, script, ...argv] = process.argv;

// Parse arguments
if (argv.length !== 2) {
    console.error(`Usage: ${node} ${script} <source> <destination>`);
    process.exit(1);
    return;
}

fs.rename(
    argv[0], // Source
    argv[1], // Destination
    (err) => {
        if (err) {
            console.log(err);
            process.exit(2);
        }
    },
);
