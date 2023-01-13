# File Storage

The storing and loading of files is abstracted through the `FileStorage` interface:

```ts
interface FileStorage {
  readonly currentStorageFormatVersion: u53;
  readonly load: (handle: StoredFileHandle) => Promise<ReadonlyUint8Array>;
  readonly store: (data: ReadonlyUint8Array) => Promise<StoredFileHandle>;
  readonly delete: (fileId: FileId) => Promise<boolean>;
}
```

Source: `src/common/file-storage.ts`

## FileId

Every file is identified by a `FileId`. This is an opaque value consisting of 24 bytes, represented
as hexadecimal lowercase string.

## Implementation: InMemoryFileStorage

Source: `src/common/file-storage.ts`

This implementation simply stores bytes in a map. There is no persistence and no encryption.

## Implementation: SystemFileStorage

Source: `src/common/node/file-storage/system-file-storage.ts`

This implementation stores bytes on the local file system. The File ID is used as filename.

**Encryption**

Before writing the bytes to the file system, they are chunked and encrypted:

- The bytes are chunked into 1 MiB chunks
- Every chunk is encrypted with AES-256-GCM and a randomly generated key
- The IV (initialization vector) starts at `00…00`, and is incremented for every chunk (`00…01`,
  `00…02` and so on)
- Every key is only used once, files are never updated / re-encrypted with the same key
- The key and the storage format version are stored in the database, alongside the file ID
- When decrypting, every chunk is fully decrypted (to ensure authentication) before passing it on to
  the application

**Subdirectories**

To avoid writing too many files into a single directory (the FAT32 file-per-directory limit is
`2^16-1`, and on other file systems it may reduce performance), files are stored in subdirectories
where the subdirectory name corresponds to the first two characters of the hexadecimal File ID. This
way, when storing 1 million files, every subdirectory will contain on average ~3900 files.

Example: The file with File ID `07f38b99…` is stored at `${storageDir}/07/07f38b99…`.
