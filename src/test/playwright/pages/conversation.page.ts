import {expect, type Page} from '@playwright/test';

import {rootUrl} from '~/test/playwright/config';

export class ConversationPage {
    private readonly _page: Page;

    public constructor(page: Page) {
        this._page = page;
    }

    public async goto(): Promise<void> {
        await this._page.goto(rootUrl);
    }

    public async gotoConversation(name: string): Promise<void> {
        await this._page.getByRole('button', {name}).click();
    }

    public async addContact(identity: string): Promise<void> {
        await this._page.getByRole('button', {name: 'person_outline'}).click();
        await this._page.getByRole('button', {name: 'add New Contact'}).click();
        await this._page.getByPlaceholder('Threema ID').fill(identity);
        await this._page.getByRole('button', {name: 'Next'}).click();
        await this._page.getByPlaceholder('First Name').fill(identity);
        await this._page.getByRole('button', {name: 'Next'}).click();
    }

    public async sendMessage(message: string): Promise<void> {
        await this._page.getByPlaceholder(/Write a message/u).fill(message);
        await this._page.getByRole('button', {name: 'arrow_upward'}).click();
    }

    public async deleteMessage(message: string): Promise<void> {
        const outbound = this._page.locator('.outbound');
        await outbound.getByText(message).click({button: 'right'});
        await expect(this._page.getByRole('button', {name: 'delete Delete'})).toBeVisible();
        await this._page.getByRole('button', {name: 'delete Delete'}).click();
        await this._page.getByRole('button', {name: 'Delete from This Device'}).click();
    }
}
