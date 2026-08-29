import {getConfig as getCommonConfig} from '@threema/eslint-config';
import {defineConfig, globalIgnores} from 'eslint/config';

export default defineConfig(
    ...getCommonConfig(import.meta.dirname, {
        projectService: {
            allowDefaultProject: ['eslint.config.mjs'],
            defaultProject: 'tsconfig.json',
        },
    }),

    globalIgnores(['.turbo/', 'coverage/', 'node_modules/']),

    // Allow devDependencies in test, test helper and config files.
    {
        files: ['**/*.test.ts', 'src/utils/test/**/*.ts', 'vitest.config.ts'],
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
