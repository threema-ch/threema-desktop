import {expect} from 'chai';

import {getBrowserInfo} from '~/common/dom/utils/browser';
import {Browser} from '~/common/enum';

export function run(): void {
    describe('utils::browser', function () {
        describe('getBrowserInfo', function () {
            it('firefox', () => {
                const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:59.0) Gecko/20100101 Firefox/59.0';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.FIREFOX);
                expect(browser.version).to.equal(59);
                expect(browser.mobile).to.be.false;
            });

            it('firefoxIosMobile8', () => {
                const ua =
                    'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) FxiOS/8.3b5826 Mobile/14A403 Safari/602.1.50';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.FIREFOX_IOS);
                expect(browser.version).to.equal(8);
                expect(browser.mobile).to.be.true;
            });

            it('firefoxIosMobile33', () => {
                const ua =
                    'Mozilla/5.0 (iPhone; CPU OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/33.0  Mobile/15E148 Safari/605.1.15';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.FIREFOX_IOS);
                expect(browser.version).to.equal(33);
                expect(browser.mobile).to.be.true;
            });

            it('chrome', () => {
                const ua =
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.162 Safari/537.36';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.CHROME);
                expect(browser.version).to.equal(65);
                expect(browser.mobile).to.be.false;
            });

            it('chromeIosMobile', () => {
                const ua =
                    'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/68.0.3440.83 Mobile/14A403 Safari/602.1';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.CHROME_IOS);
                expect(browser.version).to.equal(68);
                expect(browser.mobile).to.be.true;
            });

            it('edge12', () => {
                const ua =
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.EDGE);
                expect(browser.version).to.equal(12);
                expect(browser.mobile).to.be.false;
            });

            it('edge14', () => {
                const ua =
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14931';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.EDGE);
                expect(browser.version).to.equal(14);
                expect(browser.mobile).to.be.false;
            });

            it('edge18', () => {
                const ua =
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.EDGE);
                expect(browser.version).to.equal(18);
                expect(browser.mobile).to.be.false;
            });

            it('edge80', () => {
                const ua =
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36 Edg/80.0.361.62';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.EDGE);
                expect(browser.version).to.equal(80);
                expect(browser.mobile).to.be.false;
            });

            it('opera', () => {
                const ua =
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36 OPR/51.0.2830.55';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.OPERA);
                expect(browser.version).to.equal(51);
                expect(browser.mobile).to.be.false;
            });

            it('safari7', () => {
                const ua =
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.SAFARI);
                expect(browser.version).to.equal(7);
                expect(browser.mobile).to.be.false;
            });

            it('safari11', () => {
                const ua =
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/604.5.6 (KHTML, like Gecko) Version/11.0.3 Safari/604.5.6';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.SAFARI);
                expect(browser.version).to.equal(11);
                expect(browser.mobile).to.be.false;
            });

            it('safari10Mobile', () => {
                const ua =
                    'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.SAFARI);
                expect(browser.version).to.equal(10);
                expect(browser.mobile).to.be.true;
            });

            it('firefox8Mobile', () => {
                const ua =
                    'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) FxiOS/8.3b5826 Mobile/14A403 Safari/602.1.50';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.FIREFOX_IOS);
                expect(browser.version).to.equal(8);
                expect(browser.mobile).to.be.true;
            });

            it('electron19', () => {
                const ua =
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Threema/0.9.0 Chrome/102.0.5005.148 Electron/19.0.8 Safari/537.36';
                const browser = getBrowserInfo(ua);
                expect(browser.type).to.equal(Browser.ELECTRON);
                expect(browser.version).to.equal(19);
                expect(browser.mobile).to.be.false;
            });
        });
    });
}
