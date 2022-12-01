ALTER TABLE contacts ADD COLUMN cachedColor BLOB;
ALTER TABLE groups ADD COLUMN cachedColor BLOB;

ALTER TABLE contacts DROP COLUMN colorIndex;
ALTER TABLE groups DROP COLUMN colorIndex;
ALTER TABLE distributionLists DROP COLUMN colorIndex;
