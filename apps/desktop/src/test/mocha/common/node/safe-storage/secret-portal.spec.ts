import {expect} from 'chai';

import {hasSecretPortalEncryptionFeature} from '~/common/node/safe-storage/secret-portal';

export function run(): void {
    describe('safe-storage secret portal', function () {
        describe('hasSecretPortalEncryptionFeature', function () {
            it('detects the feature as the only one', function () {
                expect(hasSecretPortalEncryptionFeature('SecretPortalKeyProviderUseForEncryption'))
                    .to.be.true;
            });

            it('detects the feature in a merged list', function () {
                expect(
                    hasSecretPortalEncryptionFeature(
                        'GlobalShortcutsPortalPreferredTrigger,PdfUseShowSaveFilePicker,SecretPortalKeyProviderUseForEncryption',
                    ),
                ).to.be.true;
            });

            it('is false for an empty switch', function () {
                expect(hasSecretPortalEncryptionFeature('')).to.be.false;
            });

            it('is false for other features only', function () {
                expect(hasSecretPortalEncryptionFeature('SomeFeature,SecretPortalKeyProvider')).to
                    .be.false;
            });
        });
    });
}
