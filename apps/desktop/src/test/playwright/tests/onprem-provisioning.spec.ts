// Make playwright aware of the window functions we expose.
declare global {
    interface Window {
        playwrightElectronService: PlaywrightIpcService | undefined;
    }
}

import {expect} from '@playwright/test';
import {base64ToU8a} from '@threema/ts-utils/conversion/base64-to-u8a';

import {ensureSpkiValue} from '~/common/types';
import {test} from '~/test/playwright/common/fixtures/base';
import type {PlaywrightIpcService} from '~/test/playwright/common/types/electron-fixture';
import {launchElectronApp} from '~/test/playwright/common/utils/electron-utils';
import {loginTimeout} from '~/test/playwright/config';
import {mockOppfServer} from '~/test/playwright/mocks/onprem-provisioning-server/client.ts';
import {ConversationPage} from '~/test/playwright/pages/conversation.page';

const RECONNECTING_TIMEOUT = 15_000;
const RESTORED_TIMEOUT = 15_000;

test.beforeAll(() => {
    test.skip(
        process.env.TURBO_BUILD_ENVIRONMENT !== 'onprem',
        'These tests only apply for an onprem environment.',
    );
});

test.beforeEach(async () => {
    await mockOppfServer.reset();
});

test.afterEach(async () => {
    await mockOppfServer.reset();
});

test('Start with a valid OPPF', async ({electronApp}) => {
    const electronApplication = electronApp;
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);
    await conversationPage.goto();
    await conversationPage.unlockApp();

    await expect(page.getByTestId('nav-item-contacts')).toBeVisible({
        timeout: loginTimeout,
    });

    await electronApplication.close();
});

test('Retry with correct password after entering wrong password', async ({electronApp}) => {
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    await conversationPage.goto();

    // Enter wrong password
    await page.getByText('App Password', {exact: true}).fill('WRONG_PASSWORD');
    await page.getByRole('button', {name: 'Continue'}).click();

    // Verify error message
    await expect(
        page.getByText('The entered password is incorrect. Please try again.'),
    ).toBeVisible({timeout: loginTimeout});

    // Enter correct password and unlock
    await conversationPage.unlockApp();

    // Verify app is unlocked
    await expect(page.getByTestId('nav-item-contacts')).toBeVisible({
        timeout: loginTimeout,
    });

    await electronApp.close();
});

test('Fail to start when OPPF is signed with an untrusted key', async ({}) => {
    const electronApp = await launchElectronApp({
        onPremUser: 'user1',
        oppfVariant: 'wrong-signature',
    });
    const electronApplication = electronApp;

    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    await conversationPage.goto();
    await conversationPage.unlockApp();

    await expect(page.getByText('Reconnecting')).toBeVisible({timeout: RECONNECTING_TIMEOUT});

    await expect(page.getByText('Connection Failed')).toBeVisible();
    await page.getByText('expand_more').click();
    await expect(
        page.getByText('Temporary OPPF fallback endpoint has not been activated'),
    ).toBeVisible();

    await mockOppfServer.enableFallback('correct');
    await page.getByRole('button', {name: 'Retry'}).click();

    await expect(page.getByText('Connection Restored')).toBeVisible({timeout: RESTORED_TIMEOUT});

    await electronApplication.close();
});

test('Fail to start when OPPF SPKI pin is too long', async ({electronApp}) => {
    await mockOppfServer.setOppfVariant('too-long-pin');

    const electronApplication = electronApp;
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    await conversationPage.goto();
    await conversationPage.unlockApp();
    await expect(page.getByText('Reconnecting')).toBeVisible({timeout: RECONNECTING_TIMEOUT});

    await expect(page.getByText('Connection Failed')).toBeVisible();
    await page.getByText('expand_more').click();
    await expect(
        page.getByText('Temporary OPPF fallback endpoint has not been activated'),
    ).toBeVisible();

    await mockOppfServer.enableFallback('correct');
    await page.getByRole('button', {name: 'Retry'}).click();

    await expect(page.getByText('Connection Restored')).toBeVisible({timeout: RESTORED_TIMEOUT});

    await electronApplication.close();
});

test('Fail to start when OPPF SPKI is invalid base64', async ({electronApp}) => {
    await mockOppfServer.setOppfVariant('invalid-base64-pin');

    const electronApplication = electronApp;
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    await conversationPage.goto();
    await conversationPage.unlockApp();
    await expect(page.getByText('Reconnecting')).toBeVisible({timeout: RECONNECTING_TIMEOUT});

    await expect(page.getByText('Connection Failed')).toBeVisible();
    await page.getByText('expand_more').click();
    await expect(
        page.getByText('Temporary OPPF fallback endpoint has not been activated'),
    ).toBeVisible();

    await mockOppfServer.enableFallback('correct');
    await page.getByRole('button', {name: 'Retry'}).click();

    await expect(page.getByText('Connection Restored')).toBeVisible({timeout: RESTORED_TIMEOUT});

    await electronApplication.close();
});

test('Start with DualLock enabled, fail when invalid SPKIs are updated, and recover via fallback OPPF', async ({}) => {
    // Arrange
    const electronApp = await launchElectronApp({onPremUser: 'user2'});
    const electronApplication = electronApp;
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    // Act
    await conversationPage.goto();
    await conversationPage.unlockApp();

    await expect(page.getByText('DualLock Has Been Activated')).toBeVisible({
        timeout: loginTimeout,
    });
    await page.getByText('App Password').fill('CHANGE_ME');
    await page.getByRole('button', {name: 'Continue'}).click();
    await page.getByTestId('nav-item-contacts').click();

    await page.evaluate(
        async ({spkiValue}) => {
            await window.playwrightElectronService?.updatePublicKeyPins([
                {
                    spkis: [
                        {
                            value: spkiValue,
                            algorithm: 'sha256',
                        },
                    ],
                    fqdn: 'devon.3ma.ch',
                    matchMode: 'exact',
                },
            ]);
        },
        {
            spkiValue: ensureSpkiValue(base64ToU8a('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')),
        },
    );

    await expect(page.getByText('Connection Failed')).toBeVisible();
    await page.getByText('expand_more').click();
    await expect(
        page.getByText('Temporary OPPF fallback endpoint has not been activated'),
    ).toBeVisible();

    await mockOppfServer.enableFallback('correct');
    await page.getByRole('button', {name: 'Retry'}).click();

    await expect(page.getByText('Connection Restored')).toBeVisible({timeout: RESTORED_TIMEOUT});

    // Assert
    await electronApplication.close();
});

test('Start with OPPF that has no domains field', async ({}) => {
    // Verify that an OPPF without a `domains` key does not permanently block network requests.
    const electronApp = await launchElectronApp({
        onPremUser: 'user1',
        oppfVariant: 'no-domains',
    });
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    await conversationPage.goto();
    await conversationPage.unlockApp();

    await expect(page.getByTestId('nav-item-contacts')).toBeVisible({
        timeout: loginTimeout,
    });

    await conversationPage.addContact('ECHOECHO');
    const message = `Test message at ${new Date().toISOString()}`;
    await conversationPage.sendMessage(message);
    await expect(page.locator('.inbound').last().getByText(message)).toBeVisible();

    await electronApp.close();
});

test('Start with OPPF that has empty domains.rules', async ({}) => {
    // Verify that an OPPF with `domains.rules: []` (no pinned domains) does not block network
    // requests and allows the app to connect using standard TLS validation.
    const electronApp = await launchElectronApp({
        onPremUser: 'user1',
        oppfVariant: 'empty-domains-rules',
    });
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    await conversationPage.goto();
    await conversationPage.unlockApp();

    await expect(page.getByTestId('nav-item-contacts')).toBeVisible({
        timeout: loginTimeout,
    });

    await conversationPage.addContact('ECHOECHO');
    const message = `Test message at ${new Date().toISOString()}`;
    await conversationPage.sendMessage(message);
    await expect(page.locator('.inbound').last().getByText(message)).toBeVisible();

    await electronApp.close();
});

test('Fail when invalid public key pins are updated', async ({electronApp}) => {
    // Arrange
    const electronApplication = electronApp;
    const page = await electronApp.firstWindow();
    const conversationPage = new ConversationPage(page);

    // Act
    await conversationPage.goto();
    await conversationPage.unlockApp();
    await conversationPage.addContact('ECHOECHO');

    await page.evaluate(
        async ({spkiValue}) =>
            await window.playwrightElectronService?.updatePublicKeyPins([
                {
                    spkis: [
                        {
                            value: spkiValue,
                            algorithm: 'sha256',
                        },
                    ],
                    fqdn: 'devon.3ma.ch',
                    matchMode: 'exact',
                },
            ]),
        {
            spkiValue: ensureSpkiValue(base64ToU8a('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')),
        },
    );

    await expect(page.getByText('Connection Failed')).toBeVisible();
    await page.getByText('expand_more').click();
    await expect(
        page.getByText('Temporary OPPF fallback endpoint has not been activated'),
    ).toBeVisible();

    await mockOppfServer.enableFallback('correct');
    await page.getByRole('button', {name: 'Retry'}).click();

    await expect(page.getByText('Connection Restored')).toBeVisible({timeout: RESTORED_TIMEOUT});

    // Assert
    await electronApplication.close();
});
