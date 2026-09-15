import {getConfig as getCommonConfig} from '@threema/eslint-config';
import {defineConfig, globalIgnores} from 'eslint/config';
import globals from 'globals';

export default defineConfig(
    ...getCommonConfig(import.meta.dirname, {
        projectService: {
            allowDefaultProject: [
                'eslint.config.mjs',
                // The project service doesn't discover the scripts because they are type checked
                // through `tsconfig.scripts.json`, and are not included in the main
                // `tsconfig.json`.
                'scripts/*.mjs',
                'scripts/*.cjs',
            ],
            defaultProject: 'tsconfig.json',
        },
    }),

    // Note: Most of this package is generated from the `threema-protocols` repository and must not
    // be linted or modified by hand.
    globalIgnores([
        '.turbo/',
        'node_modules/',
        // Generated protobufjs output, see `scripts/generate-protobuf.mjs`.
        'src/protobuf/js/',
        // Generated structbuf output, see `scripts/generate-structbuf.mjs`.
        'src/structbuf/**',
        'src/enum/index.ts',
    ]),

    // The generator scripts run in Node and report their progress on the standard streams.
    {
        files: ['scripts/**/*.{mjs,cjs}'],
        languageOptions: {globals: {...globals.node}},
        rules: {'no-console': 'off'},
    },
    {
        files: ['**/*.cjs'],
        rules: {'@typescript-eslint/no-require-imports': 'off'},
    },

    // Note: The enum schema has to declare the imports used by the generated file, but doesn't use
    // them itself.
    {
        files: ['src/enum/schema.ts'],
        rules: {'@typescript-eslint/no-unused-vars': 'off'},
    },

    // Allow `devDependencies` in the generator scripts and in config files.
    {
        files: ['scripts/**/*.{mjs,cjs}', 'eslint.config.mjs'],
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
