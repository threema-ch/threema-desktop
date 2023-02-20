-- Update messageFileData table:
--
-- * Make thumbnailMediaType and blobId nullable
-- * Add blobDownloadState and thumbnailBlobDownloadState fields

-- 1: Create temporary table

CREATE TABLE messageFileDataNew (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    -- The original Blob IDs (used for downloading) and the associated encryption key
    blobId BLOB,
    thumbnailBlobId BLOB,
    encryptionKey BLOB NOT NULL,

    -- Blob download state
    blobDownloadState INTEGER,
    thumbnailBlobDownloadState INTEGER,

    -- Foreign keys to the `fileData` table
    fileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,
    thumbnailFileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,

    -- Media types (formerly known as MIME type)
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT,

    -- File message metadata
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT,

    -- If both fileDataUid and thumbnailFileDataUid are set, they may not point to the same foreign key
    CHECK ((fileDataUid IS NULL) OR (thumbnailFileDataUid IS NULL) OR (fileDataUid != thumbnailFileDataUid))
);

-- 2: Copy data

INSERT INTO messageFileDataNew (
    uid, messageUid,
    blobId, thumbnailBlobId, encryptionKey,
    blobDownloadState, thumbnailBlobDownloadState,
    fileDataUid, thumbnailFileDataUid,
    mediaType, thumbnailMediaType,
    fileName, fileSize, caption, correlationId
)
SELECT
    uid, messageUid,
    blobId, thumbnailBlobId, encryptionKey,
    NULL, NULL,
    fileDataUid, thumbnailFileDataUid,
    mediaType, NULLIF(thumbnailMediaType, ''),
    fileName, fileSize, caption, correlationId
FROM messageFileData;

-- 3: Drop old table

DROP TABLE messageFileData;

-- 4: Rename temporary table

ALTER TABLE messageFileDataNew RENAME TO messageFileData;