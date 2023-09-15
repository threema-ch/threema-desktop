import {Browser} from '~/common/enum';
import {type u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

export interface BrowserInfo {
    readonly userAgent: string;
    readonly type: Browser;
    readonly name: string;
    readonly version?: u53;
    readonly mobile?: boolean;
}

/**
 * Browser detection.
 */
export function getBrowserInfo(userAgent: string): BrowserInfo {
    let browser: Browser;

    // Detect potential browser type
    const uagent = userAgent.toLowerCase();
    if (uagent.includes('electron')) {
        browser = Browser.ELECTRON;
    } else if (
        uagent.includes('mozilla') &&
        uagent.includes('applewebkit') &&
        uagent.includes('chrome') &&
        uagent.includes('safari') &&
        uagent.includes('opr')
    ) {
        browser = Browser.OPERA;
    } else if (uagent.includes('webkit') && uagent.includes('chrome') && !uagent.includes('edg')) {
        browser = Browser.CHROME;
    } else if (uagent.includes('mozilla') && uagent.includes('crios')) {
        browser = Browser.CHROME_IOS;
    } else if (uagent.includes('mozilla') && uagent.includes('firefox')) {
        browser = Browser.FIREFOX;
    } else if (uagent.includes('mozilla') && uagent.includes('fxios')) {
        browser = Browser.FIREFOX_IOS;
    } else if (uagent.includes('edg')) {
        browser = Browser.EDGE;
    } else if (
        uagent.includes('safari') &&
        uagent.includes('applewebkit') &&
        !uagent.includes('chrome') &&
        !uagent.includes('fxios') &&
        !uagent.includes('crios')
    ) {
        browser = Browser.SAFARI;
    } else {
        return {
            userAgent,
            type: Browser.UNKNOWN,
            name: 'Unknown',
        };
    }

    // Determine browser version
    let pattern;
    switch (browser) {
        case Browser.CHROME:
            pattern = 'chrome';
            break;
        case Browser.CHROME_IOS:
            pattern = 'crios';
            break;
        case Browser.FIREFOX:
            pattern = 'firefox';
            break;
        case Browser.FIREFOX_IOS:
            pattern = 'fxios';
            break;
        case Browser.EDGE:
            pattern = 'edge?';
            break;
        case Browser.OPERA:
            pattern = 'opr';
            break;
        case Browser.SAFARI:
            pattern = 'version';
            break;
        case Browser.ELECTRON:
            pattern = 'electron';
            break;
        default:
            unreachable(browser);
    }
    let match = uagent.match(new RegExp(`(?:${pattern})(?: |/)(?<version>[0-9]+)`, 'u'));
    let versionString;
    if (match?.groups !== undefined) {
        versionString = match.groups.version ?? '';
    } else {
        match = uagent.match(/rv:(?<version>[0-9]+)/u);
        versionString = match?.groups?.version ?? '';
    }
    const versionInt: u53 = parseInt(versionString, 10);
    const version = isNaN(versionInt) ? undefined : versionInt;

    let name;
    switch (browser) {
        case Browser.CHROME:
            name = 'Chrome';
            break;
        case Browser.CHROME_IOS:
            name = 'ChromeIos';
            break;
        case Browser.FIREFOX:
            name = 'Firefox';
            break;
        case Browser.FIREFOX_IOS:
            name = 'FirefoxIos';
            break;
        case Browser.EDGE:
            name = 'Edge';
            break;
        case Browser.OPERA:
            name = 'Opera';
            break;
        case Browser.SAFARI:
            name = 'Safari';
            break;
        case Browser.ELECTRON:
            name = 'Electron';
            break;
        default:
            unreachable(browser);
    }

    let mobile;
    switch (browser) {
        case Browser.CHROME_IOS:
        case Browser.FIREFOX_IOS:
            mobile = true;
            break;
        case Browser.SAFARI:
            mobile = uagent.includes('mobile');
            break;
        default:
            mobile = false;
    }

    return {
        userAgent,
        type: browser,
        name,
        version,
        mobile,
    };
}
