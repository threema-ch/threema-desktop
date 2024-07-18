CREATE TABLE runningGroupCalls (
    uid INTEGER PRIMARY KEY,
    groupUid INTEGER NOT NULL REFERENCES groups(uid) on DELETE CASCADE,
    -- > 0: number of failed peek attempts
    nFailed INTEGER NOT NULL,
    receivedAt INTEGER NOT NULL,
    -- The identity string of the user that created the group call
    creatorIdentity TEXT NOT NULL,
    protocolVersion INTEGER NOT NULL,
    -- The group call key
    gck BLOB NOT NULL UNIQUE,
    -- The base URL of the SFU
    baseUrl TEXT NOT NULL
);

