import path from 'node:path';

import {expect, type ElectronApplication, type Page} from '@playwright/test';

import {test} from '~/test/playwright/common/fixtures/base';
import {ConversationPage} from '~/test/playwright/pages/conversation.page';

let electronApplication: ElectronApplication;
let page: Page;
let conversationPage: ConversationPage;

test.beforeAll(async ({electronApp}) => {
    electronApplication = electronApp;
    page = await electronApp.firstWindow();
    conversationPage = new ConversationPage(page);

    await conversationPage.goto();
    await conversationPage.addContact('ECHOECHO');
});

test.afterAll(async () => {
    await electronApplication.close();
});

test('Send message', async ({screenshotPath}) => {
    // Arrange
    const message = `Test message at ${new Date().toISOString()}`;

    // Act
    await conversationPage.sendMessage(message);

    // Assert
    const element = page.locator('.inbound').last();
    await expect(element.getByText(message)).toBeVisible();

    await page.screenshot({path: path.join(screenshotPath, 'assert_send_message.png')});
});

test('Delete last message', async ({screenshotPath}) => {
    // Arrange
    const message = `Test message at ${new Date().toISOString()}`;

    // Act
    await conversationPage.sendMessage(message);
    await conversationPage.deleteMessage(message);

    // Assert
    const outbound = page.locator('.outbound');
    await expect(outbound.getByText(message)).toBeHidden();

    await page.screenshot({path: path.join(screenshotPath, 'assert_delete_last_message.png')});
});
