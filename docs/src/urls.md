# URLs

A `BaseUrl` should be used for all URLs that need a path to be complete. The `ensureBaseUrl`
function should always be used to construct a `BaseUrl` as it ensures that a specific protocol is
used, that the path ends with a trailing slash and that no search parameters or hashes/fragments are
present.

A `URL` should be used for all URLs that are already _complete_. It almost always makes sense to
construct a `URL` by using `validateUrl` to ensure that the protocol, search parameters and
hash/fragment match the expectations.

When constructing a URL from a `BaseUrl` and a path, the following pattern should be used:
`new URL('path', baseUrl)`. It is important that no slash is at the beginning of the path!
