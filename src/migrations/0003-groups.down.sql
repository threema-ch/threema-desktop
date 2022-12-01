
ALTER TABLE groups DROP COLUMN profilePictureAdminDefined BLOB;
ALTER TABLE groups DROP COLUMN cachedColor BLOB;
ALTER TABLE groups DROP COLUMN notificationSoundPolicyOverride INTEGER;
ALTER TABLE groups DROP COLUMN notificationTriggerPolicyOverrideExpiresAt INTEGER;
ALTER TABLE groups DROP COLUMN notificationTriggerPolicyOverride INTEGER;
ALTER TABLE groups DROP COLUMN userState;
