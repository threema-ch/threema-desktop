const webpackConfig = require('../../../config/webpack.test.cypress.web');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');

/**
 * This function is called when a project is opened or re-opened (e.g. due to the project's config
 * changing).
 *
 * @param on Used to hook into various events Cypress emits.
 * @param config The resolved Cypress config.
 */
module.exports = (on, config) => {
    // Inject a Webpack preprocessor
    on(
        'file:preprocessor',
        webpackPreprocessor({
            webpackOptions: webpackConfig,
        }),
    );

    // Run code coverage tasks
    on('task', require('./code-coverage')(config));

    // Raise potentially altered configuration
    return config;
};
