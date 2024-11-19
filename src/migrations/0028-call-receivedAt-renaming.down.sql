ALTER TABLE runningGroupCalls
    ADD receivedAt INTEGER NOT NULL DEFAULT 0;

UPDATE runningGroupCalls
    SET receivedAt = startedAt;

ALTER TABLE runningGroupCalls
    DROP COLUMN startedAt;



