# File Storage

The storing and loading of files is abstracted through the `FileStorage` interface:

```ts
interface FileStorage {
  readonly currentStorageFormatVersion: u53;
  load: (handle: StoredFileHandle) => Promise<ReadonlyUint8Array>;
  store: (data: ReadonlyUint8Array) => Promise<StoredFileHandle>;
  delete: (fileId: FileId) => Promise<boolean>;
}
```

## FileId

Every file is identified by a `FileId`. This is an opaque value consisting of 24 bytes, represented
as hexadecimal lowercase string.

## Implementations

**InMemoryFileStorage**

Source: `src/common/file-storage.ts`

This implementation simply stores bytes in a map. There is no persistence and no encryption.

**SystemFileStorage**

Source: `src/common/node/file-storage/system-file-storage.ts`

This implementation stores bytes on the local file system. The `FileId` is used as filename.

Before writing the bytes to the file system, they are chunked and encrypted:

- The bytes are chunked into 1 MiB chunks
- Every chunk is encrypted with AES-256-GCM and a randomly generated key
- The IV (initialization vector) starts at `00..00`, and is incremented for every chunk (`00..01`,
  `00..02` and so on)
- Every key is only used once, files are never updated / re-encrypted with the same key
- The key and the storage format version are stored in the database, alongside the file ID
- When decrypting, every chunk is fully decrypted (to ensure authentication, because the
  authenticator is at the end of the ciphertext) before passing it on to the application
