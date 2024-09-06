
CREATE TABLE persistentProtocolState (
    uid INTEGER PRIMARY KEY,
    -- Type of this protocol state entry (e.g UserProfileDistribution)
    type INTEGER NOT NULL,
    -- Timestamp of this entry
    createdAt INTEGER NOT NULL,
    -- The corresponding encoded information.
    stateBytes value BLOB NOT NULL
);
