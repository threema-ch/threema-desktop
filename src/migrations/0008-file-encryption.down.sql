-- Remove file encryption from message file data

-- Re-add old `fileId` columns
ALTER TABLE messageFileData ADD COLUMN fileId TEXT;
ALTER TABLE messageFileData ADD COLUMN thumbnailFileId TEXT;

-- Drop foreign keys on `fileData` table
ALTER TABLE messageFileData DROP COLUMN fileDataUid;
ALTER TABLE messageFileData DROP COLUMN thumbnailFileDataUid;

-- Drop `fileData` table. Note that migrating the `fileId`s would not give us any benefits, since
-- the keys would be lost anyways.
DROP TABLE fileData;