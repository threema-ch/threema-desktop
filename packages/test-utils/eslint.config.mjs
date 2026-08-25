import {getConfig as getCommonConfig} from '@threema/eslint-config';
import {defineConfig, globalIgnores} from 'eslint/config';

export default defineConfig(
    ...getCommonConfig(import.meta.dirname, {
        projectService: {
            allowDefaultProject: ['eslint.config.mjs'],
            defaultProject: 'tsconfig.json',
        },
    }),

    globalIgnores(['.turbo/', 'node_modules/']),
);
