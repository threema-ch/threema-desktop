-- Add optional quote to messages
ALTER TABLE messageTextData ADD COLUMN quotedMessageId BLOB DEFAULT NULL;