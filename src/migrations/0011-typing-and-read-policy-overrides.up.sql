-- Add optional typing indicator and read receipts policy overrides to contacts.
ALTER TABLE contacts ADD COLUMN typingIndicatorPolicyOverride INTEGER;
ALTER TABLE contacts ADD COLUMN readReceiptPolicyOverride INTEGER;
