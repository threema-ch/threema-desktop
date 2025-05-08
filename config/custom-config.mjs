// @ts-check
/* eslint-disable jsdoc/no-types */

import * as fs from 'node:fs';
import * as process from 'node:process';

import * as v from '@badrap/valita';

export const CUSTOM_CONFIG_SCHEMA = v.array(
    v
        .object({
            appName: v.string(),
            localizedAppName: v.string().optional(),
            presetOppfUrl: v.string().optional(),
            assetPaths: v.union(
                v.undefined(),
                v.object({
                    web: v.string(),
                    macos: v.object({
                        'icon': v.string(),
                        'installer': v.string(),
                        'installer@2x': v.string(),
                    }),
                    windows: v.object({
                        standard: v.string(),
                        store: v.string().optional(),
                    }),
                }),
            ),
            colorPalette: v.object({
                primary: v.string(),
                shades: v.object({
                    primary50: v.string(),
                    primary100: v.string(),
                    primary200: v.string(),
                    primary300: v.string(),
                    primary400: v.string(),
                    primary500: v.string(),
                    primary600: v.string(),
                    primary700: v.string(),
                    primary800: v.string(),
                    primary900: v.string(),
                }),
            }),
        })
        .rest(v.unknown()),
);

/**
 * Returns the current custom config as specified by `process.env.CUSTOM_CONFIG_PATH` and
 * `process.env.CUSTOM_CONFIG_INDEX`, if any.
 *
 * @returns {v.Infer<typeof CUSTOM_CONFIG_SCHEMA>[number] | Error} The custom config, or `undefined`
 *   if it could not be read.
 */
export function readCustomConfig() {
    if (process.env.CUSTOM_CONFIG_PATH === undefined) {
        return new Error('`CUSTOM_CONFIG_PATH` env variable was not defined');
    }
    if (process.env.CUSTOM_CONFIG_INDEX === undefined) {
        return new Error('`CUSTOM_CONFIG_INDEX` env variable was not defined');
    }
    if (isNaN(parseInt(process.env.CUSTOM_CONFIG_INDEX, 10))) {
        return new Error('`CUSTOM_CONFIG_INDEX` env variable cannot be parsed as a valid number');
    }

    const configFile = fs.readFileSync(process.env.CUSTOM_CONFIG_PATH, 'utf-8');
    const buildConfigs = CUSTOM_CONFIG_SCHEMA.parse(JSON.parse(configFile));
    const currentConfig = buildConfigs[parseInt(process.env.CUSTOM_CONFIG_INDEX, 10)];
    if (currentConfig === undefined) {
        return new Error(
            'Custom config could not be read or `CUSTOM_CONFIG_INDEX` is out of range',
        );
    }

    return currentConfig;
}
