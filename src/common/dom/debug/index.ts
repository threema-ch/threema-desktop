import {type ServicesForBackend} from '~/common/backend';
import {type BackendHandle} from '~/common/dom/backend';
import {
    generateFakeContactConversation,
    generateFakeGroupConversation,
} from '~/common/dom/debug/fake';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_HANDLER} from '~/common/utils/endpoint';

/**
 * Exposed functionality used by the debug panels.
 */
export class DebugBackend implements ProxyMarked {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _backend: BackendHandle,
    ) {}

    /**
     * Generate a fake contact conversation with fake data. The generated conversation is persistent but
     * not reflected.
     */
    public async generateFakeContactConversation(): Promise<void> {
        await generateFakeContactConversation(this._services, this._backend);
    }

    /**
     * Generate a fake group conversation with fake data. The generated conversation is persistent but
     * not reflected.
     */
    public async generateFakeGroupConversation(): Promise<void> {
        await generateFakeGroupConversation(this._services, this._backend);
    }
}
