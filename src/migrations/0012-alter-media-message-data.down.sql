-- Revert changes in 0012-alter-media-message-data.up.sql
--
-- Note that this is a destructive down-migration, no data
-- will be migrated!

DROP TABLE messageImageData;
CREATE TABLE messageImageData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    blobId BLOB NOT NULL,
    thumbnailBlobId BLOB,

    encryptionKey BLOB NOT NULL,
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT NOT NULL,
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT,

    -- 1: Regular image, 2: Sticker
    renderingType INTEGER NOT NULL DEFAULT 1,
    animated BOOLEAN NOT NULL DEFAULT false,
    height INTEGER,
    width INTEGER
);

DROP TABLE messageVideoData;
CREATE TABLE messageVideoData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    blobId BLOB NOT NULL,
    thumbnailBlobId BLOB,
    encryptionKey BLOB NOT NULL,
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT NOT NULL,
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT,

    height INTEGER,
    width INTEGER,
    durationSeconds REAL
);

DROP TABLE messageAudioData;
CREATE TABLE messageAudioData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    blobId BLOB NOT NULL,
    thumbnailBlobId BLOB,
    encryptionKey BLOB NOT NULL,
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT NOT NULL,
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT,

    durationSeconds REAL
);
