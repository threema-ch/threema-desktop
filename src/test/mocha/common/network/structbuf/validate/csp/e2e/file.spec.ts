import {expect} from 'chai';

import {ensureBlobId} from '~/common/network/protocol/blob';
import {File} from '~/common/network/structbuf/validate/csp/e2e';
import {RAW_FILE_JSON_SCHEMA} from '~/common/network/structbuf/validate/csp/e2e/file';
import {assert} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';

const minimalFileJson = {
    j: 0,
    k: '0001020304050607000102030405060700010203040506070001020304050607',
    b: '00112233445566770011223344556677',
    m: 'application/pdf',
    s: 1234,
};

/**
 * File validation tests.
 */
export function run(): void {
    describe('validate file', function () {
        it('minimal file JSON (raw)', function () {
            const validated = RAW_FILE_JSON_SCHEMA.parse(minimalFileJson);
            expect(validated.j).to.equal(0);
            expect(validated.k.unwrap()).to.deep.equal(
                new Uint8Array([
                    0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2,
                    3, 4, 5, 6, 7,
                ]),
            );
            expect(validated.b).to.deep.equal(
                ensureBlobId(
                    new Uint8Array([
                        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x00, 0x11, 0x22, 0x33,
                        0x44, 0x55, 0x66, 0x77,
                    ]),
                ),
            );
            expect(validated.m).to.equal('application/pdf');
            expect(validated.s).to.equal(1234);
        });

        it('maps empty metadata object to undefined', function () {
            const missing = RAW_FILE_JSON_SCHEMA.parse({...minimalFileJson});
            expect(missing.x).to.be.undefined;
            const empty = RAW_FILE_JSON_SCHEMA.parse({...minimalFileJson, x: {}});
            expect(empty.x).to.be.undefined;
        });

        it('minimal file JSON (full)', function () {
            const validated = File.SCHEMA.parse({
                file: UTF8.encode(JSON.stringify(minimalFileJson)),
            }).file;
            expect(validated.renderingType).to.equal('file');
            expect(validated.file.blobId).to.deep.equal(
                ensureBlobId(
                    new Uint8Array([
                        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x00, 0x11, 0x22, 0x33,
                        0x44, 0x55, 0x66, 0x77,
                    ]),
                ),
            );
            expect(validated.file.mediaType).to.equal('application/pdf');
            expect(validated.fileName).to.be.undefined;
            expect(validated.fileSize).to.equal(1234);
            expect(validated.thumbnail).to.be.undefined;
            expect(validated.encryptionKey.unwrap()).to.deep.equal(
                new Uint8Array([
                    0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2,
                    3, 4, 5, 6, 7,
                ]),
            );
            expect(validated.caption).to.be.undefined;
            expect(validated.correlationId).to.be.undefined;
        });

        it('file message as sent by android 5.0.3.1', function () {
            const json = `{
                "b":"249419403eebe0b650c61aaf31cec673",
                "t":"24c5ac718f4bc11966a4cc0b0778d6c5",
                "k":"33d990f89a16348ba89cabb6b0360168ee8bcd76cdee58c3bf5eae05ef5175b0",
                "m":"image/jpeg",
                "p":"image/jpeg",
                "n":"PXL_20230207_171914021.jpg",
                "s":1859932,
                "i":0,
                "c":"6c9e78d01f5235a7da752df188e48924",
                "x":{},
                "j":0
            }`;
            const validated = File.SCHEMA.parse({
                file: UTF8.encode(json),
            }).file;
            expect(validated.renderingType).to.equal('file');
            expect(bytesToHex(validated.file.blobId)).to.equal('249419403eebe0b650c61aaf31cec673');
            expect(validated.file.mediaType).to.equal('image/jpeg');
            assert(validated.thumbnail !== undefined, 'Thumbnail should not be undefined');
            expect(bytesToHex(validated.thumbnail.blobId)).to.equal(
                '24c5ac718f4bc11966a4cc0b0778d6c5',
            );
            expect(validated.thumbnail.mediaType).to.equal('image/jpeg');
            expect(validated.fileName).to.equal('PXL_20230207_171914021.jpg');
            expect(validated.fileSize).to.equal(1859932);
            expect(validated.correlationId).to.equal('6c9e78d01f5235a7da752df188e48924');
        });

        it('image message as sent by android 5.0.3.1', function () {
            const json = `{
                "b":"33c885e00d3e4aa1a2eabab67fc6c366",
                "t":"34b046ff88a7e2cc56eb32d858a2a0b1",
                "k":"e2eef6f6149d3ddbd93ae7c7b13c72e9038bb464e52444d802100d1b7bcb1add",
                "m":"image/jpeg",
                "p":"image/jpeg",
                "n":"threema-20230210-150319697.jpg",
                "s":349709,
                "i":1,
                "d":"Bildli",
                "c":"5bdd5a621eb075b6c781936a683cee89",
                "x":{},
                "j":1
            }`;
            const validated = File.SCHEMA.parse({
                file: UTF8.encode(json),
            }).file;
            expect(validated.renderingType).to.equal('media');
            expect(bytesToHex(validated.file.blobId)).to.equal('33c885e00d3e4aa1a2eabab67fc6c366');
            expect(validated.file.mediaType).to.equal('image/jpeg');
            assert(validated.thumbnail !== undefined, 'Thumbnail should not be undefined');
            expect(bytesToHex(validated.thumbnail.blobId)).to.equal(
                '34b046ff88a7e2cc56eb32d858a2a0b1',
            );
            expect(validated.thumbnail.mediaType).to.equal('image/jpeg');
            expect(validated.fileName).to.equal('threema-20230210-150319697.jpg');
            expect(validated.fileSize).to.equal(349709);
            expect(validated.caption).to.equal('Bildli');
        });

        it('audio message as sent by android 5.0.3.1', function () {
            const json = `{
                "b":"33df2fd37b54ee397dcb9e2f7c742048",
                "k":"57f02a26da5e0f2acea1982f13a49ec68bb9955a2b07808371d7e241f3b084b5",
                "m":"audio/aac",
                "p":"image/jpeg",
                "n":"threema-20230210-150733780.aac",
                "s":140666,
                "i":1,
                "c":"842f55b680f79bda59dea0c36d7d9865",
                "x":{"d":3.576},
                "j":1
            }`;
            const validated = File.SCHEMA.parse({
                file: UTF8.encode(json),
            }).file;
            expect(validated.renderingType).to.equal('media');
            expect(bytesToHex(validated.file.blobId)).to.equal('33df2fd37b54ee397dcb9e2f7c742048');
            expect(validated.file.mediaType).to.equal('audio/aac');
            expect(validated.thumbnail).to.be.undefined;
            expect(validated.fileName).to.equal('threema-20230210-150733780.aac');
            expect(validated.fileSize).to.equal(140666);
            expect(validated.caption).to.be.undefined;
            expect(validated.correlationId).to.equal('842f55b680f79bda59dea0c36d7d9865');
            // TODO(DESK-935): Metadata
        });

        it('sticker message as sent by android 5.0.3.1', function () {
            const json = `{
                "b":"226b048dc778193b7b14c4ac81084a9a",
                "t":"27492551493ca3115cdf84c6a2bae3ae",
                "k":"207949795bc42772d4217fca59b22cff1e5a43c0508eadad8b61e73e2c262bb7",
                "m":"image/png",
                "p":"image/png",
                "n":"threema-20230210-151912551.png",
                "s":51944,
                "i":0,
                "c":"4e145ed44cc1adaee29772734e5b0440",
                "x":{},
                "j":2
            }`;
            const validated = File.SCHEMA.parse({
                file: UTF8.encode(json),
            }).file;
            expect(validated.renderingType).to.equal('sticker');
            expect(bytesToHex(validated.file.blobId)).to.equal('226b048dc778193b7b14c4ac81084a9a');
            expect(validated.file.mediaType).to.equal('image/png');
            assert(validated.thumbnail !== undefined, 'Thumbnail should not be undefined');
            expect(bytesToHex(validated.thumbnail.blobId)).to.equal(
                '27492551493ca3115cdf84c6a2bae3ae',
            );
            expect(validated.thumbnail.mediaType).to.equal('image/png');
        });
    });
}
