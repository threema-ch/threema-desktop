-- Remove all messages that were deleted.
DELETE FROM messages WHERE deletedAt IS NOT NULL;
-- Delete the deletedAt column.
ALTER TABLE messages DROP COLUMN deletedAt;
