import sveltePreprocess from 'svelte-preprocess';

/**
 * Return the config for svelte-preprocess:
 * https://github.com/sveltejs/svelte-preprocess/blob/main/docs/preprocessing.md
 */
function getSveltePreprocessConfig(options) {
    return sveltePreprocess({
        // Enable TypeScript preprocessor
        typescript: {
            tsconfigFile: options?.ts?.configFile ?? './src/app/tsconfig.json',
        },

        // Enable SCSS preprocessor
        scss: {
            includePaths: options?.scss?.includePaths ?? ['./src/sass', './node_modules'],
        },

        // Disable other preprocessors
        coffeescript: false,
        globalStyle: false,
        less: false,
        postcss: false,
        pug: false,
        stylus: false,
    });
}

export default getSveltePreprocessConfig;
