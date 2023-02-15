-- Remove file download state from the message file data table

ALTER TABLE messageFileData DROP COLUMN blobDownloadState;
ALTER TABLE messageFileData DROP COLUMN thumbnailBlobDownloadState;
