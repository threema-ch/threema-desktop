import type {CloseInfo} from '~/common/network';
import type {ProxyMarked} from '~/common/utils/endpoint';

export type ConnectionManagerHandle = {
    /**
     * Disconnect any existing connection. Depending on whether auto-connect is enabled, a new
     * connection may be initiated immediately.
     */
    readonly disconnect: (info?: CloseInfo) => void;

    /**
     * Disable auto-connect. If there is a connection, the connection will be closed.
     *
     * WARNING: This modifies global connection state and may race with other calls to
     * enable/disable auto-connect. Use sparingly!
     */
    readonly disconnectAndDisableAutoConnect: (info?: CloseInfo) => void;

    /**
     * Enable auto-connect. Will unblock establishing a connection.
     *
     * WARNING: This modifies global connection state and may race with other calls to
     * enable/disable auto-connect. Use sparingly!
     */
    readonly enableAutoConnect: () => void;

    /**
     * Toggle auto-connect. When auto-connect is turned off, the current connection will be closed.
     * When auto-connect is turned on, a connection will be initiated.
     *
     * WARNING: This modifies global connection state and may race with other calls to
     * enable/disable auto-connect. Use sparingly!
     */
    readonly toggleAutoConnect: () => void;
} & ProxyMarked;
