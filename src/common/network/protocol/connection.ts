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

    /**
     * Starts a partial connection to the mediator server (without CSP-proxying) and unlinks the
     * current device.
     *
     * Unlinking the current device will lead to the connections being closed. Calling this function
     * should therefore always be proceeded by a `deleteProfileAndRestartApp`.
     *
     * WARNING: This should only be called after closing the standard connection and turning off
     * auto-connect. In general, this function should only be called if the connection is closed by
     * the chatserver to give the user the option to relink cleanly anyway.
     */
    readonly startPartialConnectionAndUnlink: () => Promise<CloseInfo>;
} & ProxyMarked;
