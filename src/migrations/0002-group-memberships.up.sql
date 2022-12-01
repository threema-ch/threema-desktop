-- Set up tables to track group and distribution list membership.
--
-- NOTE: Timestamps are stored as integers with millisecond precision (unless
-- noted otherwise).

PRAGMA foreign_keys = ON;

CREATE TABLE groupMembers (
    uid INTEGER PRIMARY KEY,

    -- Reference to group, drop group membership if group is deleted
    groupUid INTEGER REFERENCES groups(uid) ON DELETE CASCADE,

    -- Reference to contact, prevent deletion of contact if membership is still active
    contactUid INTEGER REFERENCES contacts(uid) ON DELETE RESTRICT,

    -- The (groupUid, contactUid) pair must be unique
    UNIQUE(groupUid, contactUid)
);

CREATE TABLE distributionListMembers (
    uid INTEGER PRIMARY KEY,

    -- Reference to group, drop group membership if group is deleted
    distributionListUid INTEGER REFERENCES distributionLists(uid) ON DELETE CASCADE,

    -- Reference to contact, prevent deletion of contact if membership is still active
    contactUid INTEGER REFERENCES contacts(uid) ON DELETE RESTRICT,

    -- The (distributionListUid, contactUid) pair must be unique
    UNIQUE(distributionListUid, contactUid)
);
