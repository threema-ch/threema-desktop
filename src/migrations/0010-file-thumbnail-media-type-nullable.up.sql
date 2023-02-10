-- Make thumbnailMediaType column nullable

ALTER TABLE messageFileData ADD COLUMN thumbnailMediaType_nullable TEXT;
UPDATE messageFileData SET thumbnailMediaType_nullable = NULLIF(thumbnailMediaType, '');
ALTER TABLE messageFileData DROP COLUMN thumbnailMediaType;
ALTER TABLE messageFileData RENAME COLUMN thumbnailMediaType_nullable TO thumbnailMediaType;