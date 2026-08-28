-- Add a virtual generated `ordinal` column to the messages table.
--
-- Use the effective message timestamp as its ordering value.
ALTER TABLE messages ADD COLUMN ordinal INTEGER
    GENERATED ALWAYS AS (COALESCE(processedAt, createdAt)) VIRTUAL;

-- Support optimization of conversation-scoped message queries ordered by `ordinal`.
--
-- Support optimization of message queries filtered only by `conversationUid`.
CREATE INDEX indexMessagesConversationUidOrdinal
    ON messages (conversationUid, ordinal);

-- Support optimization of per-conversation unread inbound message count queries.
CREATE INDEX indexMessagesConversationUidUnreadInbound
    ON messages (conversationUid)
    WHERE senderContactUid IS NOT NULL AND readAt IS NULL;

-- Support optimization of conversation-scoped status message queries ordered by `createdAt`.
CREATE INDEX indexStatusMessagesConversationUidCreatedAt
    ON statusMessages (conversationUid, createdAt);
