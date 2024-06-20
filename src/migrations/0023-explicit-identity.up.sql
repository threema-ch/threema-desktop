-- Note: The identity placeholder is replaced with the user's own identity during the migration
UPDATE messageReactions SET senderIdentity = '{identity}' WHERE senderIdentity = 'me';
