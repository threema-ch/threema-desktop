const fs = require('fs').promises;
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');

const debug = require('debug')('code-coverage');

// Coverage map kept across invocations
let sharedCoverageMap = libCoverage.createCoverageMap();

// Path where to store raw coverage data
const coveragePath = path.resolve(__dirname, '../../../build/test-coverage-data');

// Available commands of the task
const commands = {
    /**
     * Clears accumulated code coverage information.
     *
     * Interactive mode with "cypress open"
     *    - running a single spec or "Run all specs" needs to reset coverage
     * Headless mode with "cypress run"
     *    - runs EACH spec separately, so we cannot reset the coverage
     *      or we will lose the coverage from previous specs.
     */
    resetCoverage({isInteractive}) {
        if (isInteractive) {
            debug('Resetting code coverage');
            sharedCoverageMap = libCoverage.createCoverageMap();
        }
        return null;
    },

    /**
     * Combines coverage information from single test
     * with previously collected coverage.
     */
    combineCoverage(sentCoverage) {
        debug('Combining coverage maps');
        const coverage = JSON.parse(sentCoverage);
        sharedCoverageMap.merge(coverage);
        return null;
    },

    /**
     * Saves coverage information in raw JSON form.
     */
    async coverageReport() {
        const coverageData = JSON.stringify(sharedCoverageMap.toJSON());
        await fs.mkdir(coveragePath, {recursive: true});
        const coverageFile = path.resolve(coveragePath, 'cypress.json');
        debug('Writing raw coverage report to %s', coverageFile);
        await fs.writeFile(coverageFile, coverageData);
        return null;
    },
};

/**
 * Return the coverage configuration for cypress.
 */
module.exports = function (config) {
    // Set a variable to let the hooks running in the browser
    // know that they can send coverage commands
    config.env.codeCoverageTasksRegistered = true;

    // Return task commands
    return commands;
};
