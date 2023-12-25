import {expect} from 'chai';

import {ImageRenderingType, MessageDirection} from '~/common/enum';
import {randomFileEncryptionKey, randomFileId} from '~/common/file-storage';
import type {MessageReactionView} from '~/common/model/types/message';
import {getFileJsonData} from '~/common/network/protocol/task/csp/common';
import {randomMessageId} from '~/common/network/protocol/utils';
import {ensureIdentityString} from '~/common/network/types';
import {bytesToHex} from '~/common/utils/byte';
import {makeTestServices, type TestServices} from '~/test/mocha/common/backend-mocks';
import {randomBlobId, randomBlobKey} from '~/test/mocha/common/db-backend-tests';

/**
 * Test CSP task helpers.
 */
export function run(): void {
    describe('getFileJson', function () {
        const me = ensureIdentityString('MEMEMEME');

        // Set up services and log printing
        let services: TestServices;
        this.beforeEach(function () {
            services = makeTestServices(me);
        });
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function getFileView() {
            const {crypto} = services;
            return {
                id: randomMessageId(crypto),
                createdAt: new Date(),
                direction: MessageDirection.OUTBOUND,
                state: 'unsynced',
                blobId: randomBlobId(),
                thumbnailBlobId: randomBlobId(),
                encryptionKey: randomBlobKey(),
                fileData: {
                    fileId: randomFileId(crypto),
                    encryptionKey: randomFileEncryptionKey(crypto),
                    unencryptedByteCount: 123,
                    storageFormatVersion: 0,
                },
                thumbnailFileData: {
                    fileId: randomFileId(crypto),
                    encryptionKey: randomFileEncryptionKey(crypto),
                    unencryptedByteCount: 123,
                    storageFormatVersion: 0,
                },
                mediaType: 'application/jpeg',
                thumbnailMediaType: 'application/jpeg',
                fileName: 'filename.jpg',
                fileSize: 12345,
                caption: 'Hello caption',
                correlationId: 'abcd',
                ordinal: 0,
                reactions: [] as MessageReactionView[],
            } as const;
        }

        it('properly encodes raw file messages', function () {
            const view = getFileView();
            const fileJson = getFileJsonData({
                type: 'file',
                view,
            });
            expect(fileJson).to.deep.equal({
                j: 0,
                i: 0,
                k: bytesToHex(view.encryptionKey.unwrap()),
                b: bytesToHex(view.blobId),
                t: bytesToHex(view.thumbnailBlobId),
                m: view.mediaType,
                p: view.thumbnailMediaType,
                n: view.fileName,
                s: view.fileSize,
                d: view.caption,
                c: view.correlationId,
            });
        });

        it('properly encodes image messages (regular, non-animated, no dimensions)', function () {
            const view = getFileView();
            const fileJson = getFileJsonData({
                type: 'image',
                view: {
                    ...view,
                    renderingType: ImageRenderingType.REGULAR,
                    animated: false,
                },
            });
            expect(fileJson).to.deep.equal({
                j: 1,
                i: 1,
                k: bytesToHex(view.encryptionKey.unwrap()),
                b: bytesToHex(view.blobId),
                t: bytesToHex(view.thumbnailBlobId),
                m: view.mediaType,
                p: view.thumbnailMediaType,
                n: view.fileName,
                s: view.fileSize,
                d: view.caption,
                c: view.correlationId,
                x: {
                    a: false,
                },
            });
        });

        it('properly encodes image messages (sticker, animated, with dimensions)', function () {
            const view = getFileView();
            const fileJson = getFileJsonData({
                type: 'image',
                view: {
                    ...view,
                    renderingType: ImageRenderingType.STICKER,
                    animated: true,
                    dimensions: {height: 123, width: 50},
                },
            });
            expect(fileJson).to.deep.equal({
                j: 2,
                i: 1,
                k: bytesToHex(view.encryptionKey.unwrap()),
                b: bytesToHex(view.blobId),
                t: bytesToHex(view.thumbnailBlobId),
                m: view.mediaType,
                p: view.thumbnailMediaType,
                n: view.fileName,
                s: view.fileSize,
                d: view.caption,
                c: view.correlationId,
                x: {
                    a: true,
                    h: 123,
                    w: 50,
                },
            });
        });
    });
}
