/**
 * Settings for electron are stored (in unencrypted form) in a JSON file.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as v from '@badrap/valita';

import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {ensureU53} from '~/common/types';
import {ensureError} from '~/common/utils/assert';
import {chainAdapter} from '~/common/utils/valita-helpers';

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 720;

const DEFAULT_LOGGING_ENABLED =
    import.meta.env.DEBUG || import.meta.env.BUILD_ENVIRONMENT === 'sandbox';

const DEFAULT_SPELLCHECK_ENABLED = process.platform === 'darwin';

const ELECTRON_SETTINGS_SCHEMA = v
    .object({
        window: v
            .object({
                width: v
                    .number()
                    .chain(chainAdapter(ensureU53))
                    .optional()
                    .default(DEFAULT_WINDOW_WIDTH),
                height: v
                    .number()
                    .chain(chainAdapter(ensureU53))
                    .optional()
                    .default(DEFAULT_WINDOW_HEIGHT),
                offsetX: v.number().chain(chainAdapter(ensureU53)).optional(),
                offsetY: v.number().chain(chainAdapter(ensureU53)).optional(),
            })
            .rest(v.unknown()),
        logging: v
            .object({
                enabled: v.boolean().optional().default(DEFAULT_LOGGING_ENABLED),
            })
            .rest(v.unknown()),
        spellCheck: v.object({
            enabled: v.boolean().optional().default(DEFAULT_SPELLCHECK_ENABLED),
        }),
    })
    .rest(v.unknown());
export type ElectronSettings = v.Infer<typeof ELECTRON_SETTINGS_SCHEMA>;

export const DEFAULT_ELECTRON_SETTINGS: ElectronSettings = {
    window: {
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT,
    },
    logging: {
        enabled: DEFAULT_LOGGING_ENABLED,
    },
    spellCheck: {
        enabled: DEFAULT_SPELLCHECK_ENABLED,
    },
};

function getSettingsFilePath(appPath: string): string {
    return path.join(appPath, ...import.meta.env.ELECTRON_SETTINGS_PATH);
}

export function loadElectronSettings(appPath: string, log: Logger | undefined): ElectronSettings {
    const settingsFilePath = getSettingsFilePath(appPath);
    let electronSettings = DEFAULT_ELECTRON_SETTINGS;
    if (fs.existsSync(settingsFilePath)) {
        try {
            electronSettings = ELECTRON_SETTINGS_SCHEMA.parse(
                JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8')),
            );
        } catch (error) {
            const errorMessage = extractErrorMessage(ensureError(error), 'short');
            log?.error(
                `Failed to read from electron-settings.json (${errorMessage}), defaulting to standard settings`,
            );
        }
    }
    return electronSettings;
}

/**
 * Store updated electron settings in a JSON file.
 */
export function updateElectronSettings(
    settingsUpdate: Partial<ElectronSettings>,
    appPath: string,
    log: Logger,
): void {
    let newSettings: ElectronSettings = {...DEFAULT_ELECTRON_SETTINGS, ...settingsUpdate};
    const settingsFilePath = getSettingsFilePath(appPath);
    if (fs.existsSync(settingsFilePath)) {
        try {
            // Read file again in case some settings where written from somewhere else
            const currentSettings: ElectronSettings = ELECTRON_SETTINGS_SCHEMA.parse(
                JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8')),
            );
            newSettings = {
                ...currentSettings,
                ...settingsUpdate,
            };
        } catch (error) {
            const errorMessage = extractErrorMessage(ensureError(error), 'short');
            log.debug(
                `Current electron-settings.json cannot be properly validated on update, overwriting with default values. ${errorMessage}`,
            );
        }
    }
    try {
        fs.writeFileSync(settingsFilePath, JSON.stringify(newSettings));
    } catch (error) {
        const errorMessage = extractErrorMessage(ensureError(error), 'short');
        log.error(`Failed to write to electron-settings.json: ${errorMessage}`);
    }
}
