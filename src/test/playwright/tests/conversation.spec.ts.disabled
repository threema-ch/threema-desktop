import {expect, type ElectronApplication, type Page} from '@playwright/test';

import {test} from '~/test/playwright/common/fixtures/authenticated';
import {ConversationPage} from '~/test/playwright/pages/conversation.page';

let electronApplication: ElectronApplication;
let page: Page;

test.beforeAll(async ({electronApp}) => {
    electronApplication = electronApp;
    page = await electronApp.firstWindow();
});

test.afterAll(async () => {
    await electronApplication.close();
});

test('Send message', async () => {
    // Arrange
    const conversationPage = new ConversationPage(page);
    const message = `Test message at ${new Date().toISOString()}`;

    // Act
    await conversationPage.goto();
    await conversationPage.gotoConversation('~ECHOECHO');
    await conversationPage.sendMessage(message);

    // Assert
    const element = page.locator('.inbound').last();
    await expect(element.getByText(message)).toBeVisible();
});

test('Delete last message', async () => {
    // Arrange
    const conversationPage = new ConversationPage(page);
    const message = `Test message at ${new Date().toISOString()}`;

    // Act
    await conversationPage.goto();
    await conversationPage.gotoConversation('~ECHOECHO');
    await conversationPage.sendMessage(message);
    await conversationPage.deleteMessage(message);

    // Assert
    const outbound = page.locator('.outbound');
    await expect(outbound.getByText(message)).toBeHidden();
});
