import type {ElectronApplication} from '@playwright/test';

export interface ElectronFixture {
    readonly electronApp: ElectronApplication;
    readonly screenshotPath: string;
}
