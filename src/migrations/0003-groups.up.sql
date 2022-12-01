-- Set up data fields for groups

-- 0: Member, 1: Kicked, 2: Left
ALTER TABLE groups ADD COLUMN userState INTEGER NOT NULL DEFAULT 0;
-- 0: Mentioned, 1: Never
ALTER TABLE groups ADD COLUMN notificationTriggerPolicyOverride INTEGER;
ALTER TABLE groups ADD COLUMN notificationTriggerPolicyOverrideExpiresAt INTEGER;
-- 0: Muted
ALTER TABLE groups ADD COLUMN notificationSoundPolicyOverride INTEGER;
-- Three bytes: R, G, B
ALTER TABLE groups ADD COLUMN cachedColor BLOB;
ALTER TABLE groups ADD COLUMN profilePictureAdminDefined BLOB;
