import {createSveltePlugin} from '@threema/i18next';
import {defineConfig} from 'i18next-cli';

import svelteConfig from './svelte.config.js';

export default defineConfig({
    locales: ['en', 'de'],
    plugins: [createSveltePlugin({preprocess: svelteConfig.preprocess})],
    extract: {
        input: ['src/app/**/*.{ts,svelte}', 'src/common/dom/ui/**/*.ts'],
        output: 'src/translations/{{language}}/{{namespace}}.json',
        messageFormat: 'icu',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        defaultNS: 'translation',
        primaryLanguage: 'en',
        // Keys of this namespace are updated by the `rendezvous-emoji` script.
        ignoreNamespaces: ['rendezvous-emoji'],
        functions: ['t', '*.t'],
    },
});
