CREATE TABLE messageHistory (
    uid INTEGER PRIMARY KEY,

    -- Timestamp for the change
    editedAt INTEGER NOT NULL,
    -- The text of this version, unified naming for all message types    
    text TEXT,
    -- Referencing the message that this version belongs to
    messageUid INTEGER NOT NULL REFERENCES messages(uid) on DELETE CASCADE
);