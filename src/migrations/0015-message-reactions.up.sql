-- 1: Create separate table to store message reactions

CREATE TABLE messageReactions (
    uid INTEGER PRIMARY KEY,
    reactionAt INTEGER NOT NULL,
    -- 0: Acknowledged, 1: Declined
    reaction INTEGER NOT NULL,
    -- We use the sender contact's identity instead of the uid to be able to show reactions of
    -- people that have left the group. The special string "me" is used to indicate that the user is
    -- the reaction sender; `NULL` is not used for this due to its behavior in unique constraints.
    senderIdentity TEXT NOT NULL,
    -- The message which the reaction belongs to
    messageUid INTEGER NOT NULL REFERENCES messages(uid) ON DELETE CASCADE,
    -- Exactly one reaction per message is allowed for each sender
    UNIQUE(senderIdentity, messageUid)
);

-- 2: Migrate the old reactions, which were previously stored directly in the `messages` table

INSERT INTO messageReactions (reactionAt, reaction, senderIdentity, messageUid)
SELECT
    m.lastReactionAt,
    m.lastReaction,
    -- Until now, it was only possible to react to inbound messages, which allows the following
    -- assumptions:
    --     - If the message was outbound, the reaction has to be from a contact, and needs to be
    --       looked up.
    --     - If the message was inbound, the reaction was by the user themself, and will be marked
    --       using the special string "me".
    CASE WHEN m.senderContactUid IS NULL THEN
        ct.identity
    ELSE
        'me'
    END,
    m.uid
FROM messages AS m
INNER JOIN conversations AS cv ON m.conversationUid = cv.uid
INNER JOIN contacts AS ct ON cv.contactUid = ct.uid
WHERE m.lastReaction IS NOT NULL
  AND m.lastReactionAt IS NOT NULL
  AND cv.contactUid IS NOT NULL;
