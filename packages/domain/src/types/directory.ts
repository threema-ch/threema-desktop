/**
 * The reason why a request against the identity directory failed.
 *
 * - timeout: Fetching data timed out.
 * - fetch: An error occurred when fetching data from the server (e.g. a network connectivity error)
 * - authentication: An error occurred during authenticating against the server
 * - identity-transfer-prohibited: The user tried to fetch information for a Work identity from a
 *   consumer app, or vice versa
 * - invalid-identity: The identity is unknown or was revoked
 * - invalid-response: We got an unexpected or invalid response from the server (e.g. an internal
 *   server error, an empty response or a response that does not validate against the schema)
 * - rate-limit-exceeded: The server rejected the request because too many requests were made
 *
 */
export type DirectoryErrorType =
    | 'timeout'
    | 'fetch'
    | 'authentication'
    | 'identity-transfer-prohibited'
    | 'invalid-identity'
    | 'invalid-response'
    | 'rate-limit-exceeded';
