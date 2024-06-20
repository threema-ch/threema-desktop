UPDATE statusMessages SET type = 'group-member-change' WHERE type = 'group-member-changed';
UPDATE statusMessages SET type = 'group-name-change' WHERE type = 'group-name-changed';
DELETE FROM statusMessages WHERE type = 'group-call-started' OR type = 'group-call-ended';
