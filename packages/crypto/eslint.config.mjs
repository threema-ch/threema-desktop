import {getConfig as getCommonConfig} from '@threema/eslint-config';
import {defineConfig, globalIgnores} from 'eslint/config';

export default defineConfig(
    ...getCommonConfig(import.meta.dirname, {
        projectService: {
            allowDefaultProject: ['eslint.config.mjs'],
            defaultProject: 'tsconfig.json',
        },
    }),

    // The Blake2b implementation is vendored external code (see header) and is typed by its
    // adjacent declaration file.
    globalIgnores(['.turbo/', 'coverage/', 'node_modules/', 'src/blake2b/implementation.js']),

    // The TweetNaCl backend is only pulled in by apps that import the `tweetnacl` subpath, so
    // `tweetnacl` is an optional peer dependency of this package.
    {
        files: ['src/tweetnacl/**/*.ts'],
        ignores: ['**/*.test.ts'],
        rules: {
            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: false,
                    peerDependencies: true,
                    bundledDependencies: false,
                    packageDir: import.meta.dirname,
                },
            ],
        },
    },

    // Allow devDependencies in test and config files.
    {
        files: ['**/*.test.ts', 'vitest.config.ts', 'src/utils/test/**'],
        rules: {
            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: true,
                    packageDir: import.meta.dirname,
                },
            ],
            'import/no-unassigned-import': 'off',
        },
    },
);
