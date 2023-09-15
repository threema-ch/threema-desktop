-- Revert changes in 0014-remove-audio-message-thumbnail.up.sql
--
-- Note that this is a destructive down-migration, all audio messages will be deleted!

DELETE FROM messages WHERE messageType = 'audio';

DROP TABLE messageAudioData;
CREATE TABLE messageAudioData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,
    blobId BLOB,
    thumbnailBlobId BLOB,
    encryptionKey BLOB NOT NULL,
    blobDownloadState INTEGER,
    thumbnailBlobDownloadState INTEGER,
    fileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,
    thumbnailFileDataUid INTEGER REFERENCES fileData(uid) ON DELETE RESTRICT,
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT,
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT,
    durationSeconds REAL,
    CHECK ((fileDataUid IS NULL) OR (thumbnailFileDataUid IS NULL) OR (fileDataUid != thumbnailFileDataUid))
);
