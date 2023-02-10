-- Make nickname column nullable

ALTER TABLE contacts ADD COLUMN nickname_nullable TEXT;
UPDATE contacts SET nickname_nullable = NULLIF(nickname, '');
ALTER TABLE contacts DROP COLUMN nickname;
ALTER TABLE contacts RENAME COLUMN nickname_nullable TO nickname;
