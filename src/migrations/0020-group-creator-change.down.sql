COMMIT TRANSACTION;

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Insert the creators into the member list
INSERT INTO groupMembers (groupUid, contactUid)
SELECT uid, creatorUid FROM groups WHERE creatorUid IS NOT NULL;

-- Remove the new column
ALTER TABLE groups DROP COLUMN creatorUid;

-- Recreate the old groups table including the unique constraint on creatorIdentity
CREATE TABLE groups_copy (
    uid INTEGER PRIMARY KEY,
    creatorIdentity TEXT NOT NULL,
    groupId BLOB NOT NULL,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    userState INTEGER NOT NULL DEFAULT 0,
    notificationTriggerPolicyOverride INTEGER,
    notificationTriggerPolicyOverrideExpiresAt INTEGER,
    notificationSoundPolicyOverride INTEGER,
    profilePictureAdminDefined BLOB,
    colorIndex INTEGER NOT NULL DEFAULT 0,

    -- The (creatorIdentity, groupId) pair must be unique
    UNIQUE(creatorIdentity, groupId)
);
INSERT INTO groups_copy (uid,
    creatorIdentity,
    groupId,
    name,
    createdAt,
    userState ,
    notificationTriggerPolicyOverride ,
    notificationTriggerPolicyOverrideExpiresAt,
    notificationSoundPolicyOverride,
    profilePictureAdminDefined,
    colorIndex
    ) SELECT uid,
    creatorIdentity,
    groupId,
    name,
    createdAt,
    userState ,
    notificationTriggerPolicyOverride ,
    notificationTriggerPolicyOverrideExpiresAt,
    notificationSoundPolicyOverride,
    profilePictureAdminDefined,
    colorIndex
    from groups;

DROP table groups;

ALTER TABLE groups_copy RENAME TO groups;

-- Check that foreign keys still uphold
PRAGMA foreign_key_check;

-- Commit this transaction
COMMIT TRANSACTION;

-- Turn on the foreign keys again
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;
