-- Set up initial database.
--
-- Note: Timestamps are stored as integers with millisecond precision (unless
--       noted otherwise).
--
-- Note: 64 bit unsigned integers are stored as little-endian byte arrays.

PRAGMA foreign_keys = ON;

CREATE TABLE contacts (
    uid INTEGER PRIMARY KEY,
    identity TEXT UNIQUE NOT NULL,
    publicKey BLOB UNIQUE NOT NULL,
    createdAt INTEGER NOT NULL,
    firstName TEXT NOT NULL DEFAULT '',
    lastName TEXT NOT NULL DEFAULT '',
    nickname TEXT NOT NULL DEFAULT '',
    -- 0: Unverified, 1: Server verified, 2: Fully verified
    verificationLevel INTEGER NOT NULL DEFAULT 0,
    -- 0: Regular, 1: Work
    identityType INTEGER NOT NULL,
    -- 0: Direct, 1: Group
    acquaintanceLevel INTEGER NOT NULL DEFAULT 0,
    -- 0: Active, 1: Inactive, 2: Invalid
    activityState INTEGER NOT NULL DEFAULT 0,
    featureMask INTEGER NOT NULL DEFAULT 0,
    -- 0: Initial, 1: Imported, 2: Custom
    syncState INTEGER NOT NULL DEFAULT 0,
    -- 0: Never
    notificationTriggerPolicyOverride INTEGER,
    notificationTriggerPolicyOverrideExpiresAt INTEGER,
    -- 0: Muted
    notificationSoundPolicyOverride INTEGER,
    -- Three bytes: R, G, B
    cachedColor BLOB,
    profilePictureContactDefined BLOB,
    profilePictureGatewayDefined BLOB,
    profilePictureUserDefined BLOB,
    profilePictureBlobIdSent BLOB
);

CREATE TABLE groups (
    uid INTEGER PRIMARY KEY,
    creatorIdentity TEXT NOT NULL,
    groupId BLOB NOT NULL,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL,

    -- The (creatorIdentity, groupId) pair must be unique
    UNIQUE(creatorIdentity, groupId)
);

CREATE TABLE distributionLists (
    uid INTEGER PRIMARY KEY,
    distributionListId BLOB NOT NULL UNIQUE,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL
);

CREATE TABLE conversations (
    uid INTEGER PRIMARY KEY,
    lastUpdate INTEGER,

    -- Only one of the following may be set
    contactUid INTEGER UNIQUE REFERENCES contacts(uid) ON DELETE RESTRICT,
    groupUid INTEGER UNIQUE REFERENCES groups(uid) ON DELETE RESTRICT,
    distributionListUid INTEGER UNIQUE REFERENCES distributionLists(uid) ON DELETE RESTRICT,

    -- 0: Default, 1: Protected
    category INTEGER NOT NULL DEFAULT 0,
    -- 0: Show, 1: Archived
    visibility INTEGER NOT NULL DEFAULT 0

    CHECK ((contactUid IS NOT NULL) + (groupUid IS NOT NULL) + (distributionListUid IS NOT NULL) = 1)
);

CREATE TABLE messages (
    uid INTEGER PRIMARY KEY,
    messageId BLOB NOT NULL,
    senderContactUid INTEGER REFERENCES contacts(uid) ON DELETE RESTRICT,
    conversationUid INTEGER NOT NULL REFERENCES conversations(uid) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL,
    processedAt INTEGER,
    deliveredAt INTEGER,
    readAt INTEGER,

    -- 0: Acknowledge, 1: Decline
    lastReaction INTEGER,
    lastReactionAt INTEGER,

    raw BLOB,

    -- Message type, e.g. "text" or "location".
    --
    -- Note: We're using TEXT instead of an INTEGER because it makes joined queries
    --       much easier to read.
    messageType TEXT NOT NULL,

    threadId INTEGER NOT NULL,

    -- A message ID must be unique within a conversation
    UNIQUE(messageId, conversationUid),

    -- Either none or both reaction fields must be set
    CHECK ((lastReaction IS NULL AND lastReactionAt IS NULL)
        OR (lastReaction IS NOT NULL AND lastReactionAt IS NOT NULL)),

    -- The `deliveredAt` field may not be set for inbound messages
    CHECK (deliveredAt IS NULL OR senderContactUid IS NULL)
);

CREATE TABLE messageTextData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    text TEXT NOT NULL
);

-- Non-media files
CREATE TABLE messageFileData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    -- The original Blob IDs (used for downloading) and the associated encryption key
    blobId BLOB NOT NULL,
    thumbnailBlobId BLOB,
    encryptionKey BLOB NOT NULL,

    -- The File IDs (assigned by the file storage)
    fileId TEXT,
    thumbnailFileId TEXT,

    -- Media types (formerly known as MIME type)
    mediaType TEXT NOT NULL,
    thumbnailMediaType TEXT NOT NULL,

    -- File message metadata
    fileName TEXT,
    fileSize INTEGER NOT NULL,
    caption TEXT,
    correlationId TEXT
);

-- Images, stickers and GIFs
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

-- This table contains the data for the "in-chat message".
-- The actual data about the poll or vote is located in the "polls"
-- or "pollVotes" table.
CREATE TABLE messagePollData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,
    -- 0: Poll created, 1: Vote cast, 2: Poll closed
    type INTEGER NOT NULL,
    pollUid INTEGER NOT NULL REFERENCES polls(uid) ON DELETE RESTRICT
);

CREATE TABLE messageLocationData (
    uid INTEGER PRIMARY KEY,
    messageUid INTEGER UNIQUE NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,

    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy REAL,
    name TEXT,
    address TEXT
);

-- This table contains all poll information. It is referenced from the
-- in-chat poll messages.
CREATE TABLE polls (
    uid INTEGER PRIMARY KEY,
    -- The poll ID (8 bytes) uniquely identifies the poll within a conversation
    pollId BLOB NOT NULL,
    -- The group or contact identity associated with this poll
    --
    -- Note: Not a foreign key, since a poll can survive a deleted conversation.
    conversationIdentity INTEGER NOT NULL,
    -- The poll creator
    pollCreatorUid INTEGER REFERENCES contacts(uid) ON DELETE RESTRICT,
    -- Timestamp of the "poll create" message
    createdAt INTEGER NOT NULL,
    -- The title/description of the poll (e.g. "Where shall we eat?")
    description TEXT NOT NULL,
    -- 0: Open, 1: Closed
    state INTEGER NOT NULL,
    -- 0: Single choice, 1: Multiple choice
    answerType INTEGER NOT NULL,
    -- 0: On close, 1: On every vote
    announceType INTEGER NOT NULL,
    -- 0: Text, 1: Date
    choicesType INTEGER NOT NULL DEFAULT 0,

    -- A poll ID must be unique within a conversation
    UNIQUE(pollId, conversationIdentity)
);

CREATE TABLE pollChoices (
    uid INTEGER PRIMARY KEY,
    pollUid INTEGER NOT NULL REFERENCES polls(uid) ON DELETE CASCADE,
    choiceId INTEGER NOT NULL,
    description TEXT NOT NULL,
    sortKey INTEGER NOT NULL,

    -- A choice ID must be unique within a poll
    UNIQUE(pollUid, choiceId)
);

CREATE TABLE pollVotes (
    uid INTEGER PRIMARY KEY,
    -- The contact that voted
    contactUid INTEGER NOT NULL REFERENCES contacts(uid) ON DELETE CASCADE,
    -- Note: We use the choiceUid here, instead of a pollUid + choiceId.
    --       This makes processing of the poll-vote message a bit more complex,
    --       but has the advantage that aggregating the poll votes is simpler.
    choiceUid INTEGER NOT NULL REFERENCES pollChoices(uid) ON DELETE CASCADE,
    selected BOOLEAN NOT NULL,

    UNIQUE(contactUid, choiceUid)
);

CREATE TABLE statusMessages (
    uid INTEGER PRIMARY KEY,

    -- The conversation associated with this status message
    conversationUid INTEGER NOT NULL REFERENCES conversations(uid) ON DELETE CASCADE,

    -- The text inside the status message
    text TEXT NOT NULL,

    -- Optional status category
    -- 0: Generic text status
    type INTEGER NOT NULL DEFAULT 0,

    -- Auto-incrementing thread ID used for sorting
    threadId INTEGER NOT NULL,

    -- Timestamp when this message was created
    timestamp INTEGER NOT NULL
);

CREATE TABLE settings (
    uid INTEGER PRIMARY KEY,
    category TEXT UNIQUE NOT NULL,
    settingsBytes value BLOB NOT NULL
);
