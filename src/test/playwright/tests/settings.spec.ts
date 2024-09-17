import {expect, type ElectronApplication, type Page} from '@playwright/test';

import {test} from '~/test/playwright/common/fixtures/authenticated';
import {SettingsPage} from '~/test/playwright/pages/settings.page';

let electronApplication: ElectronApplication;
let page: Page;

test.beforeAll(async ({electronApp}) => {
    electronApplication = electronApp;
    page = await electronApp.firstWindow();
});

test.afterAll(async () => {
    await electronApplication.close();
});

test('Assert app version', async () => {
    // Arrange
    const settingsPage = new SettingsPage(page);
    const version = await electronApplication.evaluate(({app}) => app.getVersion());

    // Act
    await settingsPage.goto();
    await settingsPage.gotoAboutThreema();

    // Assert
    await expect(page.getByText(version)).toBeVisible();
});

test('Assert app name', async () => {
    // Arrange
    const settingsPage = new SettingsPage(page);
    const name = await electronApplication.evaluate(({app}) => app.getName());

    // Act
    await settingsPage.goto();
    await settingsPage.gotoAboutThreema();

    // Assert
    await expect(page.getByText(name)).toBeVisible();
});
