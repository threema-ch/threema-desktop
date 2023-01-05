# Cryptography

## Rules of Thumb for Encryption Keys

1. Always wrap keys in a newtype around `RawKey` or `ReadonlyRawKey`. Never accept any other types
   in our encryption-related APIs.

   Example:

   ```typescript
   export type FileEncryptionKey = WeakOpaque<
     RawKey<32>,
     {readonly FileEncryptionKey: unique symbol}
   >;
   ```

   If a key is used for secret-key cryptography indefinitely (i.e. used until closing the app), use
   `ReadonlyRawKey`. Otherwise, use `RawKey`. (The difference is that `RawKey` exposes a `.purge()`
   method, while `ReadonlyRawKey` does not.)

2. When unwrapping a raw key via `.unwrap()`, these bytes **must not** be used longer than necessary
   in combination with foreign APIs.

3. If the key is used for NaCl public-key cryptography, it **must** be consumed by
   a `SecureSharedBoxFactory`.

4. When a key is no longer needed, purge it via `.purge()`.
