import path from 'node:path';

import {expect, type ElectronApplication, type Page} from '@playwright/test';

import {test} from '~/test/playwright/common/fixtures/base';

let electronApplication: ElectronApplication;
let page: Page;

test.beforeAll(async ({electronApp}) => {
    electronApplication = electronApp;
    page = await electronApp.firstWindow();
});

test.afterAll(async () => {
    await electronApplication.close();
});

test('Assert linking page loads', async ({screenshotPath}) => {
    await expect(page.locator('section')).toContainText('Scan this QR code');
    await expect(page.locator('canvas')).toBeVisible();

    await page.screenshot({path: path.join(screenshotPath, 'assert_linking_page_loads.png')});
});
