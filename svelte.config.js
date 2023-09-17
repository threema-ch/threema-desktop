import preprocess from './config/svelte.config.js';

export default {
    // See: https://svelte.dev/docs#svelte_compile
    compilerOptions: {
        immutable: true,
    },
    preprocess: preprocess(),
};
