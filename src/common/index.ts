/**
 * Marker for an object that requires serialization in a special form.
 */
export const TRANSFER_HANDLER = Symbol('endpoint-transfer-handler');

/**
 * Called from the remote side to explicitly release a proxy on the local side.
 */
export const RELEASE_PROXY = Symbol('endpoint-release-proxy');

/**
 * Marker for the representation of an object on the remote side.
 */
export const TRANSFERRED_MARKER = Symbol('endpoint-transferred-marker');
