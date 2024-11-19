-- Renaming the column to `startedAt` to reflect the changes in the app
ALTER TABLE runningGroupCalls
    ADD startedAt INTEGER NOT NULL DEFAULT 0;

UPDATE runningGroupCalls
    SET startedAt = receivedAt;

ALTER TABLE runningGroupCalls
    DROP COLUMN receivedAt;
