# RPC

To communicate between our (web)worker and renderer threads, we use a heavily modified version of
the [Comlink library](https://github.com/GoogleChromeLabs/comlink). Our implementation extends the
original version by the possibility to add custom transfer logic, which allows different remote
representations other than a mere `Proxy`.

## Custom transfer logic

We implemented the following custom transfer logic:

### `ProxyMarked` / `endpoint.exposeProxy(TValue)`

`ProxyMarked` corresponds to the default Comlink behaviour of exposing properties and functions as
async `Proxy` object on the remote side.

### `PropertiesMarked` / `endpoint.exposeProperties(TValue)`

The `PropertiesMarked` transfer handler transfers all first-level properties of an object using
either the custom transfer handler (according to the properties' `TRANSFER_HANDLER`) or with the
structured clone algorithm if no such handler is defined.

### `LocalStore<TValue>` / `RemoteStore<Remote<TValue>>`

The Store transfer handler exposes a `IQueryableStore` on the remote side and propagates all the
store's value updates over the RPC API.

The value of the store is either transferred according to the value's `TRANSFER_HANDLER` or with the
structured clone algorithm if no such handler is defined.

### `LocalModelStore<TView, TController, ...>` / `RemoteModelStore<StructuredClone<TView>, RemoteProxy<TController>, ...>`

The `LocalModelStore` transfer handler is a special case of the `LocalStore` transfer handler. It
structurally clones store updates of the `view` properties, and exposes the `controller` property as
`ProxyMarked`.

### `SetStore` / `RemoteSetStore`

The `SetStore`'s transfer handler is similar to the `LocalStore`'s, in that it propagates store
updates to the remote side. However, after the first transfer, the `SetStore` only transfers
delta-updates to the remote side (see [documentation on stores](./stores.md)).

## Caching Logic

The RPC logic has a local and remote cache.

- The cache makes sure that only one remote equivalent for an exposed object exists.
- If a remote equivalent of an local object is [garbage
  collected](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry),
  the local cache reference is also released.
- Note that objects are normally copied/transferred eagerly to the remote side, but if a prior
  remote equivalent in the cache is detected after transfer, the new transfer is discarded and the
  existing one is returned.
