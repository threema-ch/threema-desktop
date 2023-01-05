-- Add file encryption to message file data

-- Add separate table with metadata about stored files
CREATE TABLE fileData (
    uid INTEGER PRIMARY KEY,
    -- File ID (assigned by the file storage)
    fileId TEXT UNIQUE NOT NULL,
    -- File encryption key (must be different for every file)
    encryptionKey BLOB UNIQUE NOT NULL,
    -- Unencrypted file size in bytes
    unencryptedByteCount INTEGER NOT NULL,
    -- Storage format version
    storageFormatVersion INTEGER NOT NULL
);

-- Add foreign keys to the new `fileData` table
ALTER TABLE messageFileData ADD COLUMN fileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT;
ALTER TABLE messageFileData ADD COLUMN thumbnailFileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT;

-- Note: It would be nice if we could add a database check constraint to prevent the same
-- fileDataUid from being used for both file and thumbnail. However, since SQLite does not allow
-- adding constraints to existing tables, and since copying the entire table is a bit too much
-- effort, we'll add a sanity check in the database backend instead.

-- Remove the direct file IDs from the `messageFileData` table
ALTER TABLE messageFileData DROP COLUMN fileId;
ALTER TABLE messageFileData DROP COLUMN thumbnailFileId;