ALTER TABLE messages
    -- A timestamp for when the message was last edited. Defaults to NULL if it was never edited.
    ADD lastEditedAt INTEGER;