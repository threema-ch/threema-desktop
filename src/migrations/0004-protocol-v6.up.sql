-- 0: None, 1: Work subscription verified
ALTER TABLE contacts ADD COLUMN workVerificationLevel INTEGER NOT NULL DEFAULT 0;
