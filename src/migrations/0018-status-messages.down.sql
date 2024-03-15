DROP TABLE statusMessages;

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