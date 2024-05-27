-- Add a default for every identity
ALTER TABLE groups ADD COLUMN creatorIdentity TEXT NOT NULL DEFAULT 'XXXXXXXX';

-- Note: The identity placeholder is replaced with the user's own identity during the migration
UPDATE groups SET creatorIdentity = '{identity}' WHERE creatorUid IS NULL;

-- Add the identity of all group creators that are not the user
UPDATE groups SET creatorIdentity = (SELECT identity FROM contacts WHERE contacts.uid = creatorUid) WHERE creatorUid IS NOT NULL;
