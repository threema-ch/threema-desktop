-- Make nickname column not nullable

ALTER TABLE contacts ADD COLUMN nickname_not_nullable TEXT NOT NULL DEFAULT '';
UPDATE contacts SET nickname_not_nullable = IFNULL(nickname, '');
ALTER TABLE contacts DROP COLUMN nickname;
ALTER TABLE contacts RENAME COLUMN nickname_not_nullable TO nickname;
