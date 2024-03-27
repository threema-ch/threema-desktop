import {expect} from 'chai';

import {checkAndCompleteUrl} from '~/app/ui/components/partials/modals/onprem-configuration-modal/helpers';

export function run(): void {
    it('OppfUrl input parsing', function () {
        expect(checkAndCompleteUrl('onprem.example.com').toString()).to.equal(
            'https://onprem.example.com/prov/config.oppf',
        );
        expect(checkAndCompleteUrl('onprem.example.com/').toString()).to.equal(
            'https://onprem.example.com/prov/config.oppf',
        );
        expect(checkAndCompleteUrl('https://onprem.example.com').toString()).to.equal(
            'https://onprem.example.com/prov/config.oppf',
        );
        expect(checkAndCompleteUrl('https://onprem.example.com/').toString()).to.equal(
            'https://onprem.example.com/prov/config.oppf',
        );
        expect(checkAndCompleteUrl('onprem.example.com/hidden/config.oppf').toString()).to.equal(
            'https://onprem.example.com/hidden/config.oppf',
        );

        expect(checkAndCompleteUrl('a/sxZg49Mqu').toString()).to.equal(
            'https://a/sxZg49Mqu/prov/config.oppf',
        );

        expect(checkAndCompleteUrl('https://a/sxZg49Mqu').toString()).to.equal(
            'https://a/sxZg49Mqu/prov/config.oppf',
        );
        expect(checkAndCompleteUrl('https://a/sxZg49Mqu/').toString()).to.equal(
            'https://a/sxZg49Mqu/prov/config.oppf',
        );
        expect(checkAndCompleteUrl('https://a/sxZg49Mqu/prov/config.oppf').toString()).to.equal(
            'https://a/sxZg49Mqu/prov/config.oppf',
        );
    });
}
