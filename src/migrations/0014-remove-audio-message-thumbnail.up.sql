-- Remove thumbnail-related fields from messageAudioData tables.
--
-- Because these tables were not in use so far, we can drop and recreate them without migrating
-- data. All pre-existing audio messages (there shouldn't be any!) will be deleted.

DELETE FROM messages WHERE messageType = 'audio';

DROP TABLE messageAudioData;
CREATE TABLE messageAudioData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    -- The original Blob IDs (used for downloading) and the associated encryption key
    blobId BLOB,
    encryptionKey BLOB NOT NULL,

    -- Blob download state
    blobDownloadState INTEGER,

    -- Foreign keys to the `fileData` table
    fileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,

    -- Media types (formerly known as MIME type)
    mediaType TEXT NOT NULL,

    -- File message metadata
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT,

    -- Audio metadata
    durationSeconds REAL
);
