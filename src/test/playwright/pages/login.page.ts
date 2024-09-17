import {expect, type Page} from '@playwright/test';

import {loginTimeout} from '~/test/playwright/config';

export class LoginPage {
    private readonly _page: Page;

    public constructor(page: Page) {
        this._page = page;
    }

    public async login(password: string): Promise<void> {
        await expect(this._page.getByText('Enter App Password')).toBeVisible();
        await this._page.getByRole('textbox', {name: 'password'}).fill(password);
        await this._page.getByRole('button', {name: 'continue'}).click();
        await expect(this._page.getByRole('button', {name: 'person_outline'})).toBeVisible({
            timeout: loginTimeout,
        });
    }
}
