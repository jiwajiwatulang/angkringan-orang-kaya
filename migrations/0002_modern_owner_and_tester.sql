-- Cloudflare D1 Migration: 0002_modern_owner_and_tester.sql
-- Adds TesterLicenses and device monitoring columns to Licenses

CREATE TABLE IF NOT EXISTS TesterLicenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  licenseKey TEXT UNIQUE NOT NULL,
  recipientName TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  durationDays INTEGER NOT NULL,
  expiresAt TEXT,
  notes TEXT,
  boundDeviceId TEXT,
  deviceName TEXT,
  createdAt TEXT NOT NULL,
  activatedAt TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);

-- Indexing for tester licenses
CREATE INDEX IF NOT EXISTS idx_tester_key ON TesterLicenses(licenseKey);
CREATE INDEX IF NOT EXISTS idx_tester_device ON TesterLicenses(boundDeviceId);
