-- Add file download state to the message file data table

-- 0: Failed
ALTER TABLE messageFileData ADD COLUMN blobDownloadState INTEGER;
-- 0: Failed
ALTER TABLE messageFileData ADD COLUMN thumbnailBlobDownloadState INTEGER;
