-- Revert changes in 0010-alter-file-data.up.sql
--
-- Note that this will drop all rows without a blobId!

-- 1: Create temporary table

CREATE TABLE messageFileDataOld (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    -- The original Blob IDs (used for downloading) and the associated encryption key
    blobId BLOB NOT NULL,
    thumbnailBlobId BLOB,
    encryptionKey BLOB NOT NULL,

    -- Foreign keys to the `fileData` table
    fileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,
    thumbnailFileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,

    -- Media types (formerly known as MIME type)
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT NOT NULL,

    -- File message metadata
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT
);

-- 2: Copy data

INSERT INTO messageFileDataOld (
    uid, messageUid,
    blobId, thumbnailBlobId, encryptionKey,
    fileDataUid, thumbnailFileDataUid,
    mediaType, thumbnailMediaType,
    fileName, fileSize, caption, correlationId
)
SELECT
    uid, messageUid,
    blobId, thumbnailBlobId, encryptionKey,
    fileDataUid, thumbnailFileDataUid,
    mediaType, IFNULL(thumbnailMediaType, ''),
    fileName, fileSize, caption, correlationId
FROM messageFileData
WHERE blobId IS NOT NULL;

-- 3: Delete messages referencing incomplete rows

DELETE FROM messages WHERE uid IN (
    SELECT messageUid
    FROM messageFileData
    WHERE blobId IS NULL
);

-- 4: Drop old table

DROP TABLE messageFileData;

-- 5: Rename temporary table

ALTER TABLE messageFileDataOld RENAME TO messageFileData;