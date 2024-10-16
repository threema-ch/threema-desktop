import fs from 'node:fs';
import path from 'node:path';

import * as v from '@badrap/valita';
import * as ASAR from '@electron/asar';

import {getPersistentAppDataBaseDir} from '~/electron/electron-utils';
import type {ElectronAppInfo} from '~/test/playwright/common/types/electron-app-info';

import {determineAppName, isValidBuildFlavor, type BuildFlavor} from '../../../../../config/build';

export function getBuildFlavor(): BuildFlavor {
    if (process.env.PW_FLAVOR === undefined) {
        throw new Error(
            `Env variable 'PW_FLAVOR' is missing, please set it before running playwright tests.`,
        );
    }
    if (!isValidBuildFlavor(process.env.PW_FLAVOR)) {
        throw new Error(
            `Build flavor '${process.env.PW_FLAVOR}' is not supported, please export a valid flavor in the 'PW_FLAVOR' env variable.`,
        );
    }

    return process.env.PW_FLAVOR;
}

export function getTestProfile(): string {
    if (process.env.PW_PROFILE === undefined) {
        throw new Error(
            `Env variable 'PW_PROFILE' is missing, please set it before running playwright tests.`,
        );
    }
    return process.env.PW_PROFILE;
}

export function getTestDataFile(flavor: BuildFlavor): string {
    const fileName = `test-data-${flavor}.json`;
    return path.resolve(path.join('src', 'test', 'playwright', fileName));
}

export function deleteProfileDirectory(flavor: BuildFlavor, profile: string): void {
    const profileDirectory = path.join(...getPersistentAppDataBaseDir(), `${flavor}-${profile}`);
    fs.rmSync(profileDirectory, {recursive: true, force: true});
}

/**
 * Determine information about electron app to be tested.
 *
 * Note: The app is being looked up in the distribution build directory based on the build flavor.
 * It must be built before calling this function.
 */
export function getElectronAppInfo(flavor: BuildFlavor): ElectronAppInfo {
    const appName = determineAppName(flavor);

    const buildDir = path.join(
        'build',
        'electron',
        'packaged',
        `${appName}-${process.platform}-${process.arch}`,
    );

    let resourcesDir: string;
    let executablePath: string;

    if (process.platform === 'darwin') {
        const bundleDir = path.join(buildDir, `${appName}.app`);
        resourcesDir = path.join(bundleDir, 'Contents', 'Resources');
        executablePath = path.join(bundleDir, 'Contents', 'MacOS', 'ThreemaDesktop');
    } else {
        const binary = process.platform === 'win32' ? 'ThreemaDesktop.exe' : 'ThreemaDesktop';
        resourcesDir = path.join(buildDir, 'resources');
        executablePath = path.join(buildDir, binary);
    }

    return {electronMain: getElectronMain(resourcesDir), executablePath};
}

/**
 * Minimal package.json schema, extracting some components we need.
 */
const PACKAGE_JSON_SCHEMA = v.object({main: v.string()}).rest(v.unknown());

function getElectronMain(resourcesDir: string): string {
    // Extract package.json from ASAR file
    const asarPath = path.join(resourcesDir, 'app.asar');
    const packageJsonString = ASAR.extractFile(asarPath, 'package.json').toString('utf8');
    const packageJson = PACKAGE_JSON_SCHEMA.parse(JSON.parse(packageJsonString));

    // Return "main" path
    return path.join(asarPath, packageJson.main);
}
