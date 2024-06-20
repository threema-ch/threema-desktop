DROP TABLE statusMessages;

CREATE TABLE statusMessages (
    uid INTEGER PRIMARY KEY,

    -- The conversation associated with this status message.
    conversationUid INTEGER NOT NULL REFERENCES conversations(uid) ON DELETE CASCADE,

    -- The type of the status messsage.
    type TEXT NOT NULL,

    -- The encoded information of this message.
    statusBytes value BLOB NOT NULL,

    -- Timestamp when this message was created.
    createdAt INTEGER NOT NULL
);
