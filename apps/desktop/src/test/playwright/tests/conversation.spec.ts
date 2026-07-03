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
    await conversationPage.unlockApp();
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
    await conversationPage.sendMessage(message);
    const inbound = page.locator('.inbound').last();
    await expect(inbound.getByText(message)).toBeVisible();

    // Act
    await conversationPage.deleteMessage(message);

    // Assert
    const outbound = page.locator('.outbound');
    await expect(outbound.getByText(message)).toBeHidden();

    await page.screenshot({path: path.join(screenshotPath, 'assert_delete_last_message.png')});
});

test('Open emoji picker by clicking on emoji icon', async () => {
    // Arrange
    const emojiIconSpan = page.getByRole('button', {name: 'insert_emoticon'}).locator('span.icon');
    const emojiPicker = page.locator('.emoji-picker');

    // Act
    await emojiIconSpan.click();

    // Assert
    await expect(emojiPicker.last()).toBeVisible();

    // Act
    await emojiIconSpan.click();

    // Assert
    await expect(emojiPicker.last()).toBeHidden();
});

test('Open emoji picker in media modal by clicking on emoji icon', async () => {
    // Arrange
    await conversationPage.dropFileIntoConversation(
        conversationPage.generateTestWav(),
        'test.wav',
        'audio/wav',
    );
    const emojiIconSpan = page
        .getByRole('dialog')
        .getByRole('button', {name: 'insert_emoticon'})
        .locator('span.icon');
    const emojiPicker = page.locator('.emoji-picker');

    // Act
    await emojiIconSpan.click();

    // Assert
    await expect(emojiPicker.last()).toBeVisible();

    // Act
    await emojiIconSpan.click();

    // Assert
    await expect(emojiPicker.last()).toBeHidden();
});

test('Send pre-recorded wav file as file instead of audio message', async () => {
    // Act
    await conversationPage.dropFileIntoConversation(
        conversationPage.generateTestWav(),
        'test.wav',
        'audio/wav',
    );
    await expect(page.getByText('Send File to ECHOECHO')).toBeVisible();
    await page.getByRole('button', {name: 'arrow_upward'}).first().click();

    // Assert
    const outbound = page.locator('.outbound').last();
    await expect(outbound.locator('.file')).toBeVisible();
    await expect(outbound.getByText('test.wav')).toBeVisible();
    await expect(outbound.locator('.audio')).not.toBeVisible();
});

test('Paste files into compose area and media message modal', async () => {
    // Act: Paste a file into the compose area.
    const composeArea = page.getByPlaceholder(/Write a message/u);
    await conversationPage.pasteFile(
        composeArea,
        conversationPage.generateTestPng(),
        'pasted-1.png',
        'image/png',
    );

    // Assert: The media message modal opens, containing the pasted file.
    const dialog = page.getByRole('dialog');
    await expect(page.getByText('Send File to ECHOECHO')).toBeVisible();
    const miniatures = dialog.locator('button.file:not(.add)');
    await expect(miniatures).toHaveCount(1);

    // Act: Paste another file while the caption text area is focused.
    const caption = dialog.getByPlaceholder('Add a Caption');
    await conversationPage.pasteFile(
        caption,
        conversationPage.generateTestPng(),
        'pasted-2.png',
        'image/png',
    );

    // Assert: The file was attached to the media message (exactly once).
    await expect(miniatures).toHaveCount(2);

    // Act: Paste another file while no text area is focused.
    await conversationPage.pasteFile(
        page.locator('body'),
        conversationPage.generateTestPng(),
        'pasted-3.png',
        'image/png',
    );

    // Assert: The file was attached to the media message as well.
    await expect(miniatures).toHaveCount(3);

    // Act: Paste plain text while the caption text area is focused.
    await conversationPage.pasteText(caption, 'Pasted caption');

    // Assert: The text was inserted into the caption and no file was attached.
    await expect(caption).toHaveText('Pasted caption');
    await expect(miniatures).toHaveCount(3);

    // Cleanup: Discard the media message draft.
    await dialog.getByRole('button', {name: 'close'}).click();
    await page.getByRole('button', {name: 'Discard'}).click();
    await expect(dialog).toBeHidden();
});
