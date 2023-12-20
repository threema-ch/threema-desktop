-- 1: Create separate table to store message reactions

CREATE TABLE messageReactions (
    uid INTEGER PRIMARY KEY,
    reactionAt INTEGER NOT NULL,
    -- 0: Acknowledged, 1: Declined
    reaction INTEGER NOT NULL,
    -- We use the sender contect's identity instead of the uid to be able to show reactions of
    -- people that have left the group. The special string "me" is used to indicate that the user is
    -- the reaction sender; `NULL` is not used for this due to its behavior in unique constraints.
    senderContactIdentity TEXT NOT NULL,
    -- The message which the reaction belongs to
    messageUid INTEGER NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,
    -- Exactly one reaction per message is allowed for each sender
    UNIQUE(senderContactIdentity, messageUid)
);

-- 2: Migrate the old reactions, which were previously stored directly in the `messages` table

INSERT INTO messageReactions (reactionAt, reaction, senderContactIdentity, messageUid)
SELECT 
    lastReactionAt,
    lastReaction,
    -- Until now, it was only possible to react to inbound messages, which allows the following
    -- assumptions:
    --     - If the message was outbound, the reaction has to be from a contact, and needs to be 
    --       looked up.
    --     - If the message was inbound, the reaction was by the user themself, and will be marked 
    --       using the special string "me".
    CASE WHEN senderContactUid IS NULL THEN
        (SELECT identity FROM contacts 
            WHERE contacts.uid =
                (SELECT contactUid from conversations WHERE uid = conversationUid)) ELSE 'me' END,
    uid
FROM messages
-- When `lastReaction` is not `NULL`, `lastReactionAt` can also be expected to be defined
WHERE messages.lastReaction IS NOT NULL;
