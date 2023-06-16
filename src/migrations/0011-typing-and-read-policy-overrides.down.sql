-- Remove optional typing indicator and read receipts policy overrides from contacts.
ALTER TABLE contacts DROP COLUMN typingIndicatorPolicyOverride;
ALTER TABLE contacts DROP COLUMN readReceiptPolicyOverride;
