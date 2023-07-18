-- Update messageImageData, messageVideoData and messageAudioData tables:
--
-- * Make thumbnailMediaType and blobId nullable
-- * Add blobDownloadState and thumbnailBlobDownloadState fields
--
-- Because these tables were not in use so far, we can drop and recreate them without migrating
-- data.

DROP TABLE messageImageData;
CREATE TABLE messageImageData (
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

    -- Image metadata
    -- 1: Regular image, 2: Sticker
    renderingType INTEGER NOT NULL DEFAULT 1,
    animated INTEGER NOT NULL DEFAULT 0,
    height INTEGER,
    width INTEGER,

    -- If both fileDataUid and thumbnailFileDataUid are set, they may not point to the same foreign key
    CHECK ((fileDataUid IS NULL) OR (thumbnailFileDataUid IS NULL) OR (fileDataUid != thumbnailFileDataUid))
);

DROP TABLE messageVideoData;
CREATE TABLE messageVideoData (
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

    -- Video metadata
    height INTEGER,
    width INTEGER,
    durationSeconds REAL,

    -- If both fileDataUid and thumbnailFileDataUid are set, they may not point to the same foreign key
    CHECK ((fileDataUid IS NULL) OR (thumbnailFileDataUid IS NULL) OR (fileDataUid != thumbnailFileDataUid))
);

DROP TABLE messageAudioData;
CREATE TABLE messageAudioData (
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

    -- Audio metadata
    durationSeconds REAL,

    -- If both fileDataUid and thumbnailFileDataUid are set, they may not point to the same foreign key
    CHECK ((fileDataUid IS NULL) OR (thumbnailFileDataUid IS NULL) OR (fileDataUid != thumbnailFileDataUid))
);
