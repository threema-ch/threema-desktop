import path from 'node:path';

import {test as base} from '@playwright/test';
import {_electron as electron} from 'playwright';

import type {ElectronFixture} from '~/test/playwright/common/types/electron-fixture';
import {getBuildFlavor, getElectronAppInfo} from '~/test/playwright/common/utils/electron-utils';
import {colorScheme} from '~/test/playwright/config';

import {determineAppName} from '../../../../../config/build';

export const test = base.extend<ElectronFixture>({
    electronApp: async ({}, use) => {
        const flavor = getBuildFlavor();
        const electronAppInfo = getElectronAppInfo(flavor);
        const electronApp = await electron.launch({
            args: [electronAppInfo.electronMain],
            executablePath: electronAppInfo.executablePath,
            colorScheme,
        });

        await use(electronApp);
    },
    screenshotPath: async ({}, use) => {
        const flavor = getBuildFlavor();
        const appName = determineAppName(flavor);
        const screenshotPath = path.join(
            'build',
            'playwright',
            'screenshots',
            `${appName}-${process.platform}-${process.arch}`,
        );

        await use(screenshotPath);
    },
});
