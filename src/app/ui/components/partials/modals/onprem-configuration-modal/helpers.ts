import {ensureBaseUrl, validateUrl} from '~/common/network/types';

export function checkAndCompleteUrl(urlString: string): URL {
    // Ensure the URL starts with 'https://'
    let httpsCheckedUrl = urlString;
    if (!/^https?:\/\//iu.test(urlString)) {
        httpsCheckedUrl = `https://${urlString}`;
    }

    // Ensure it points to an '.oppf' file or apply the default path on the base URL.
    let url;
    if (httpsCheckedUrl.endsWith('.oppf')) {
        url = validateUrl(httpsCheckedUrl, {protocol: 'https:', search: 'deny', hash: 'deny'});
    } else {
        url = new URL('prov/config.oppf', ensureBaseUrl(httpsCheckedUrl, 'https:'));
    }

    return url;
}
