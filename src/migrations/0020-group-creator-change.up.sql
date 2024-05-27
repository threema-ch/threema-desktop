-- In order to remove the group's table UNIQUE constraint, we need to turn the foreign_keys off
-- To that end, we need to create a new transaction
COMMIT TRANSACTION;

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- The uid of the group creator. Is null if the user is the creator
ALTER TABLE groups ADD creatorUid INTEGER DEFAULT NULL REFERENCES contacts(uid) ON DELETE RESTRICT;

-- Add the group creator UID to every group
UPDATE groups SET creatorUid = c.uid
FROM (SELECT identity, uid FROM contacts) as c WHERE c.identity = groups.creatorIdentity;

-- Remove the creator from the member list
DELETE FROM groupMembers WHERE EXISTS (
    SELECT 1
    FROM groups
    WHERE groups.uid = groupMembers.groupUid
    AND groups.creatorUid = groupMembers.contactUid
);

-- Remove the unique constraint from groups.creatorIdentity
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
    creatorUid INTEGER DEFAULT NULL REFERENCES contacts(uid) ON DELETE RESTRICT
);

INSERT INTO groups_copy
    (
        uid,
        creatorIdentity,
        groupId,
        name,
        createdAt,
        userState ,
        notificationTriggerPolicyOverride ,
        notificationTriggerPolicyOverrideExpiresAt,
        notificationSoundPolicyOverride,
        profilePictureAdminDefined,
        colorIndex,
        creatorUid
    )
    SELECT
        uid,
        creatorIdentity,
        groupId,
        name,
        createdAt,
        userState ,
        notificationTriggerPolicyOverride ,
        notificationTriggerPolicyOverrideExpiresAt,
        notificationSoundPolicyOverride,
        profilePictureAdminDefined,
        colorIndex,
        creatorUid
    FROM groups;

-- Drop the old groups table
DROP table groups;

ALTER TABLE groups_copy RENAME TO groups;

-- Check that foreign keys still uphold
PRAGMA foreign_key_check;

-- Commit this transaction
COMMIT TRANSACTION;

-- Turn on the foreign keys again
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;
