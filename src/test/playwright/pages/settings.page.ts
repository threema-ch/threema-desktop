import type {Page} from '@playwright/test';

import {rootUrl} from '~/test/playwright/config';

export class SettingsPage {
    private readonly _page: Page;

    public constructor(page: Page) {
        this._page = page;
    }

    public async goto(): Promise<void> {
        await this._page.goto(rootUrl);
        await this._page.getByRole('button', {name: 'more_vert'}).click();
        await this._page.getByRole('button', {name: 'settings Settings'}).click();
    }

    public async gotoAboutThreema(): Promise<void> {
        await this._page.getByRole('button', {name: 'info About Threema'}).click();
    }
}
