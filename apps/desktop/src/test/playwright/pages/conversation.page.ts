import {expect, type Locator, type Page} from '@playwright/test';

import {rootUrl} from '~/test/playwright/config';

/**
 * The selectable values of the "Auto-Download Incoming Media" setting.
 */
export type AutoDownloadOption = 'always' | 'never' | 'restricted';

/**
 * Labels of the {@link AutoDownloadOption} entries, as rendered in the settings dropdown.
 *
 * Note: The label of `restricted` embeds `RESTRICTED_DOWNLOAD_SIZE_IN_MB`.
 */
const AUTO_DOWNLOAD_LABELS: Record<AutoDownloadOption, string> = {
    always: 'Always download',
    never: 'Never download',
    restricted: 'Download if smaller than 10 MB',
};

export class ConversationPage {
    private readonly _page: Page;

    public constructor(page: Page) {
        this._page = page;
    }

    public async goto(): Promise<void> {
        await this._page.goto(rootUrl);
    }

    public async unlockApp(): Promise<void> {
        await this._page.getByText('App Password', {exact: true}).fill('CHANGE_ME');
        await this._page.getByRole('button', {name: 'Continue'}).click();
    }

    /**
     * Set the "Auto-Download Incoming Media" setting in the "Media and Storage" settings.
     */
    public async setAutoDownload(option: AutoDownloadOption): Promise<void> {
        await this._page.getByTestId('nav-item-settings').click();
        await this._page.getByRole('button', {name: 'Media and Storage'}).click();
        await this._page.getByRole('button', {name: 'Auto-Download Incoming Media'}).click();

        await this._page
            .locator('.menu')
            .getByRole('button', {name: AUTO_DOWNLOAD_LABELS[option], exact: true})
            .click();
    }

    public async gotoConversation(name: string): Promise<void> {
        await this._page.getByTestId('nav-item-contacts').click();
        await this._page.getByRole('button', {name}).last().click();
    }

    public async addMultipleContacts(identities: string): Promise<void> {
        await this._page.getByTestId('nav-item-contacts').click();
        await this._page.getByRole('button', {name: 'add New Contact'}).click();
        await this._page.getByPlaceholder('Threema ID').fill(identities);
        await this._page.getByRole('button', {name: 'Next'}).click();
    }

    public async addContact(identity: string): Promise<void> {
        await this._page.getByTestId('nav-item-contacts').click();
        await this._page.getByRole('button', {name: 'add New Contact'}).click();
        await this._page.getByPlaceholder('Threema ID').fill(identity);
        await this._page.getByRole('button', {name: 'Next'}).click();
        await this._page.getByPlaceholder('First Name').fill(identity);
        await this._page.getByRole('button', {name: 'Next'}).click();
    }

    public async addGroup(groupName: string, testIds: string[]): Promise<void> {
        await this.goto();
        await this._page.getByTestId('nav-item-contacts').click();
        await this._page.getByRole('button', {name: 'group'}).click();
        await this._page.getByRole('button', {name: 'add New Group'}).click();
        for (const id of testIds) {
            const locator = this._page.getByTestId('contact-preview').filter({hasText: id});
            await locator.getByRole('checkbox', {name: 'check_box_outline_blank'}).click();
        }
        await this._page.getByRole('button', {name: 'Next'}).click();
        await this._page.getByPlaceholder('Group Name').fill(groupName);
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

    /**
     * Simulate dropping a file into the conversation drop zone.
     *
     * Reads the file from disk, then dispatches the native drag events (`dragenter`, `dragover`,
     * `drop`) on the `.dropzone` element so that the `safedrag` action picks them up and opens
     * the MediaMessage modal.
     *
     * @param fileBuffer Buffer of generated noise.
     * @param filePath Absolute path to the file on disk.
     * @param mimeType MIME type to assign to the file (e.g. `'audio/mpeg'`).
     */
    public async dropFileIntoConversation(
        fileBuffer: Buffer,
        fileName: string,
        mimeType: string,
    ): Promise<void> {
        await this._page.evaluate(
            ({buffer, name, type}) => {
                const file = new File([new Uint8Array(buffer)], name, {type});
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                const dropzone = document.querySelector('.dropzone');
                if (dropzone === null) {
                    throw new Error('Drop zone not found');
                }

                dropzone.dispatchEvent(new DragEvent('dragenter', {bubbles: true, dataTransfer}));
                dropzone.dispatchEvent(new DragEvent('dragover', {bubbles: true, dataTransfer}));
                dropzone.dispatchEvent(new DragEvent('drop', {bubbles: true, dataTransfer}));
            },
            {buffer: Array.from(fileBuffer), name: fileName, type: mimeType},
        );
    }

    /**
     * Simulate pasting a file from the clipboard onto the given element.
     *
     * Dispatches a synthetic `ClipboardEvent('paste')` with a `DataTransfer` containing the file
     * on the target element, as if the user had pressed Ctrl+V while it was focused.
     *
     * @param target The element to dispatch the paste event on.
     * @param fileBuffer Buffer with the file contents.
     * @param fileName Name to assign to the pasted file.
     * @param mediaType Media type to assign to the file (e.g. `'image/png'`).
     */
    public async pasteFile(
        target: Locator,
        fileBuffer: Buffer,
        fileName: string,
        mediaType: string,
    ): Promise<void> {
        await target.evaluate(
            (element, {buffer, name, type}) => {
                const file = new File([new Uint8Array(buffer)], name, {type});
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                element.dispatchEvent(
                    new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                        clipboardData: dataTransfer,
                    }),
                );
            },
            {buffer: Array.from(fileBuffer), name: fileName, type: mediaType},
        );
    }

    /**
     * Simulate pasting plain text from the clipboard onto the given element.
     *
     * @param target The element to dispatch the paste event on.
     * @param text The text to paste.
     */
    public async pasteText(target: Locator, text: string): Promise<void> {
        await target.evaluate((element, value) => {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', value);

            element.dispatchEvent(
                new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer,
                }),
            );
        }, text);
    }

    /**
     * Generates a valid 1x1 pixel PNG image.
     *
     * @returns A complete PNG file as a Node.js Buffer.
     */
    public generateTestPng(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64',
        );
    }

    /**
     * Generates a WAV file buffer containing a sine wave tone.
     *
     * The output is a valid 16-bit mono PCM WAV file with a RIFF header,
     * `fmt ` chunk, `fact` chunk, and `data` chunk.
     *
     * @param [options] - Configuration for the generated WAV.
     * @param [options.durationSec=1] - Duration of the tone in seconds.
     * @param [options.freq=440] - Frequency of the sine wave in Hz (440 Hz = A4).
     * @param [options.sampleRate=44100] - Sample rate in Hz.
     * @returns A complete WAV file as a Node.js Buffer.
     * @example
     * // Generate a default 1-second 440 Hz tone
     * const wav = generator.generateTestWav();
     * @example
     * // Generate a 2-second 1 kHz tone at 48 kHz sample rate
     * const wav = generator.generateTestWav({ durationSec: 2, freq: 1000, sampleRate: 48000 });
     */
    public generateTestWav({durationSec = 1, freq = 440, sampleRate = 44100} = {}): Buffer {
        const maxAmplitude = 32767; // Max value for 16-bit signed integer
        const angularFrequency = 2 * Math.PI * freq;

        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const numSamples = sampleRate * durationSec;
        const dataSize = numSamples * blockAlign;

        const headerSize = 44 + 12;
        const buf = Buffer.alloc(headerSize + dataSize);
        let offset = 0;

        function writeStr(str: string): void {
            buf.write(str, offset, 'ascii');
            offset += str.length;
        }
        function writeU32(v: number): void {
            buf.writeUInt32LE(v, offset);
            offset += 4;
        }
        function writeU16(v: number): void {
            buf.writeUInt16LE(v, offset);
            offset += 2;
        }
        function writeI16(v: number): void {
            buf.writeInt16LE(v, offset);
            offset += 2;
        }

        writeStr('RIFF');
        writeU32(headerSize - 8 + dataSize);
        writeStr('WAVE');

        writeStr('fmt ');
        writeU32(16); // Subchunk size
        writeU16(1); // PCM format
        writeU16(numChannels);
        writeU32(sampleRate);
        writeU32(byteRate);
        writeU16(blockAlign);
        writeU16(bitsPerSample);

        writeStr('fact');
        writeU32(4);
        writeU32(numSamples);

        writeStr('data');
        writeU32(dataSize);

        // Write samples (sine wave)
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const sineValue = Math.sin(angularFrequency * t);
            const sample = Math.round(maxAmplitude * sineValue);
            writeI16(sample);
        }

        return buf;
    }
}
