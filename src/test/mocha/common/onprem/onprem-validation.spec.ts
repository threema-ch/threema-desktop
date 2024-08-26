import {expect} from 'chai';

import {ensureEd25519PublicKey} from '~/common/crypto';
import {OPPF_FILE_SCHEMA, verifyOppfFile} from '~/common/dom/backend/onprem/oppf';
import {base64ToU8a} from '~/common/utils/base64';
import {UTF8} from '~/common/utils/codec';
import {TestTweetNaClBackend} from '~/test/mocha/common/backend-mocks';
import {
    MOCK_OPPF,
    CORRECT_OPPF_STRING,
    WRONG_OPPF_SIGNATURE_STRING,
    LICENSE_EXPIRED_STRING,
} from '~/test/mocha/common/onprem/oppf-mock';

export function run(): void {
    describe('Check oppf parsing and validation', function () {
        const pk = 'F1VoT2qqUP/eV4JHDgmCHMISd82AgMnV/CfnvtCBu5M=';
        const oppf = MOCK_OPPF;
        const crypto = new TestTweetNaClBackend();
        it('parse a valid oppf file', function () {
            const parsedOppf = verifyOppfFile(
                {crypto},
                [ensureEd25519PublicKey(base64ToU8a(pk))],
                UTF8.encode(CORRECT_OPPF_STRING),
            );
            expect(parsedOppf.parsed).to.deep.equal(OPPF_FILE_SCHEMA.parse(oppf));
        });

        it('Do not allow the oppf file verification to succeed when public key is not trusted', function () {
            expect(() => {
                verifyOppfFile(
                    {crypto},
                    [ensureEd25519PublicKey(base64ToU8a(pk))],
                    UTF8.encode(WRONG_OPPF_SIGNATURE_STRING),
                );
            }).to.throw('OPPF file is signed with an unknown signature key');
        });

        it('Do not allow the oppf file verification to succeed when the signature does not match', function () {
            expect(() => {
                verifyOppfFile(
                    {crypto},
                    [
                        ensureEd25519PublicKey(
                            base64ToU8a('VR4nTeVFeao9TcIJn5KaMsuW6Lc4gMC+j8z//zngvNs='),
                        ),
                    ],
                    UTF8.encode(WRONG_OPPF_SIGNATURE_STRING),
                );
            }).to.throw('Ed25519 signature is not valid');
        });

        it('Do not allow the oppf file verification to succeed when the license is expired', function () {
            expect(() => {
                verifyOppfFile(
                    {crypto},
                    [ensureEd25519PublicKey(base64ToU8a(pk))],
                    UTF8.encode(LICENSE_EXPIRED_STRING),
                );
            }).to.throw('OPPF file expired');
        });
    });
}
