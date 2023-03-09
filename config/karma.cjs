/**
 * Configuration for the Karma test runner:
 *
 * http://karma-runner.github.io/latest/config/configuration-file.html
 */
module.exports = (config) => {
    config.set({
        // Test execution frameworks
        frameworks: ['mocha', 'chai'],

        // Test spec files
        files: ['../build/electron/karma-tests/run-specs.js'],

        // Files to exclude
        exclude: [],

        // Preprocessors to run on input files
        preprocessors: {},

        // Reporters to be used
        reporters: ['mocha'],

        // Port of the web server
        port: 9999,

        // Coloured output
        colors: true,

        // Log level
        logLevel: config.LOG_INFO,

        // Automatically run when a file changed
        autoWatch: true,

        // Browsers to run the tests in
        browsers: ['ChromiumHeadless', 'FirefoxHeadless'],

        // Custom launchers
        customLaunchers: {
            ChromiumHeadlessNoSandbox: {
                base: 'ChromiumHeadless',
                flags: ['--no-sandbox'],
            },
        },

        // Run once?
        singleRun: false,

        // Concurrency of tests
        concurrency: Number.POSITIVE_INFINITY,

        // Plugins to load
        plugins: [
            'karma-chai',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-mocha',
            'karma-mocha-reporter',
            'karma-junit-reporter',
        ],

        // JUnit reporter config
        junitReporter: {
            outputDir: '../junit/',
            outputFile: 'karma.xml',
            useBrowserName: false,
        },
    });
};
