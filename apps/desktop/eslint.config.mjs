import {getConfig as getCommonConfig, getTypeScriptConfigMixin} from '@threema/eslint-config';
import {defineConfig, globalIgnores} from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import {configs} from 'typescript-eslint';
import * as extraFileParser from 'typescript-eslint-parser-for-extra-files';

import svelteConfig from './svelte.config.js';

export default defineConfig(
    ...getCommonConfig(import.meta.dirname, {
        projectService: {
            allowDefaultProject: ['eslint.config.mjs'],
            defaultProject: 'tsconfig.json',
        },
        extraFileExtensions: ['.svelte'],
        svelteConfig,
    }),

    globalIgnores([
        '.nyc_output_karma/',
        '.nyc_output_mocha/',
        '.turbo/',
        'build/',
        'coverage/',
        'junit/',
        'node_modules/',
        'packaging/build/',
        'playwright-report/',
        'src/common/crypto/blake2b/implementation.js',
        'src/common/enum/index.ts',
        'src/common/network/protobuf/js',
    ]),

    // Check that all environment variables used at build time have been whitelisted in the `turbo`
    // config.
    {
        ignores: ['src/**/*', '!src/test/**/*'],
        rules: {
            'turbo/no-undeclared-env-vars': 'error',
        },
    },

    {
        rules: {
            // TODO: Currently broken for e.g. 'sinon' and 'chai' which affects tests, see:
            // https://github.com/import-js/eslint-plugin-import/issues/2168
            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: [
                        '{config,packaging,test,tools}/**',
                        'eslint.config.mjs',
                        'i18next.config.ts',
                        'playwright.config.ts',
                        'svelte.config.js',
                    ],
                    peerDependencies: false,
                    bundledDependencies: false,
                    packageDir: import.meta.dirname,
                },
            ],
        },
    },

    // Non-typescript utility script rules. We disable the type checker here since these files are
    // written in pure js.
    {
        files: ['config/**/*.{cjs,js}', 'src/test/**/*.js', 'tools/**/*.{mjs,cjs,js}'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
            'prefer-named-capture-group': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'import/no-default-export': 'off',
            'import/no-extraneous-dependencies': ['error', {devDependencies: true}],
        },
        extends: [configs.disableTypeChecked],
    },

    // Utility script rules
    {
        files: [
            'config/**/*.ts',
            'config/**/base.js',
            'tools/**/*.ts',
            'i18next.config.ts',
            'playwright.config.ts',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
            'prefer-named-capture-group': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'import/no-default-export': 'off',
        },
    },

    {
        files: ['packaging/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
        },
    },

    {
        files: ['config/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // App source rules
    {
        files: ['src/app/**'],
        rules: {
            'import/no-unassigned-import': ['error', {allow: ['**/*.css', '**/*.scss']}],
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ['src/app/**/*.svelte'],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: extraFileParser,
            },
        },
        rules: getTypeScriptConfigMixin('svelte', {
            rules: {
                'no-labels': 'off',
                '@typescript-eslint/no-restricted-types': [
                    'off',
                    {
                        types: {
                            // Note: Null often cannot be avoided when dealing with the Svelte lifecycle
                            null: 'off',
                        },
                    },
                ],
                '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
                'import/no-mutable-exports': 'off',
                'prefer-const': [
                    'error',
                    {
                        destructuring: 'all',
                    },
                ],
            },
        }),
        extends: [svelte.configs['flat/prettier']],
    },
    {
        files: ['src/app/**/*.ts'],
        languageOptions: {
            parser: /** @type {any} */ (extraFileParser),
        },
    },

    // CLI source rules
    {
        files: ['src/cli/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: [
            'src/common/network/structbuf/utils.ts',
            'src/common/network/structbuf/{csp,extra,group-call,md-d2d,md-d2d-rendezvous,md-d2m}/**/*.ts',
        ],
        rules: {
            '@typescript-eslint/no-restricted-types': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-extraneous-class': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/naming-convention': 'off',
            'prefer-const': 'off',
            'import/newline-after-import': 'off',
            'import/order': 'off',
        },
    },

    // Common DOM source rules
    {
        files: ['src/common/dom/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },

    // Common Node source rules
    {
        files: ['src/common/node/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Electron-specific source rules
    {
        files: ['src/electron/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Enum source rules
    {
        files: ['src/enum/**/*.ts'],
        rules: {
            'no-restricted-syntax': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },

    // Backend Worker source rules
    {
        files: ['src/worker/backend/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.worker,
            },
        },
    },

    // Backend Worker Electron source rules
    {
        files: ['src/worker/backend/electron/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.worker,
            },
        },
    },

    // Exception for electron-service
    {
        files: ['src/common/dom/electron-service.ts'],
        rules: {
            'threema/ban-direct-electron-access': 'off',
        },
    },

    // Service worker source rules
    {
        files: ['src/service-worker-*.ts'],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
            },
        },
    },
    {
        files: ['src/worker/service/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
            },
        },
    },

    // General test source rules
    {
        files: ['src/test/**/*.{cjs,js,ts}'],
        rules: {
            'no-console': 'off',
            'func-names': 'off',
            'prefer-arrow-callback': 'off',
            'import/no-default-export': 'off',

            // Mocha requires these.
            '@typescript-eslint/no-invalid-this': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-misused-spread': 'off',

            // TODO: Currently broken for e.g. 'sinon' and 'chai' which affects tests, see:
            // https://github.com/import-js/eslint-plugin-import/issues/2168
            'import/no-extraneous-dependencies': 'off',

            'jsdoc/require-jsdoc': 'off',
        },
    },
    // Karma test source rules
    {
        files: ['src/test/karma/common/dom/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ['src/test/karma/worker/backend/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.worker,
            },
        },
    },
    {
        files: ['src/test/karma/worker/service/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
            },
        },
    },

    // Mocha test source rules
    {
        files: ['src/test/mocha/app/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ['src/test/mocha/common/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Playwright test source rules
    {
        files: ['src/test/playwright/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-empty-pattern': 'off', // Used for fixtures
        },
    },
);
