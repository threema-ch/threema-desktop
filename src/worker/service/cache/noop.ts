import {type ResourceCache} from '.';

/**
 * Does not cache anything and passes requests on to the network.
 */
export class NoopResourceCache implements ResourceCache {
    public readonly name = 'NoopResourceCache';

    /* eslint-disable @typescript-eslint/require-await */
    public async prune(): Promise<void> {
        return;
    }
    public async populate(): Promise<void> {
        return;
    }
    /* eslint-enable @typescript-eslint/require-await */

    public async fetch(event: FetchEvent): Promise<Response> {
        return await self.fetch(event.request);
    }
}
