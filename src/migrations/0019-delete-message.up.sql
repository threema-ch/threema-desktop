ALTER TABLE messages
    -- A timestamp for when the message was deleted. Defaults to NULL if it was never deleted.
    ADD deletedAt INTEGER;