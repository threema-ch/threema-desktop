-- Remove the conversation-scoped indexes and the generated `ordinal` column.
DROP INDEX indexMessagesConversationUidOrdinal;
DROP INDEX indexMessagesConversationUidUnreadInbound;
DROP INDEX indexStatusMessagesConversationUidCreatedAt;
ALTER TABLE messages DROP COLUMN ordinal;
