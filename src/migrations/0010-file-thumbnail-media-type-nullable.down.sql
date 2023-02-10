-- Make thumbnailMediaType column not nullable

ALTER TABLE messageFileData ADD COLUMN thumbnailMediaType_not_nullable TEXT NOT NULL DEFAULT '';
UPDATE messageFileData SET thumbnailMediaType_not_nullable = IFNULL(thumbnailMediaType, '');
ALTER TABLE messageFileData DROP COLUMN thumbnailMediaType;
ALTER TABLE messageFileData RENAME COLUMN thumbnailMediaType_not_nullable TO thumbnailMediaType;