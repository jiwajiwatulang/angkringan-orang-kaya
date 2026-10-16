-- Cloudflare D1 Migration: 0001_initial_schema.sql
-- Production Relational Schema for SakuNota (Edge Cloudflare D1)

CREATE TABLE IF NOT EXISTS CustomerOrders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId TEXT UNIQUE NOT NULL,
  accessCode TEXT NOT NULL,
  buyerName TEXT NOT NULL,
  businessName TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  amount INTEGER NOT NULL DEFAULT 65000,
  paymentMethod TEXT NOT NULL DEFAULT 'Transfer Bank BCA',
  bankAccount TEXT NOT NULL DEFAULT '8030 554 912 a.n. Reza',
  transferProofName TEXT,
  status TEXT NOT NULL DEFAULT 'menunggu_verifikasi',
  licenseKey TEXT,
  boundDeviceId TEXT,
  createdAt TEXT NOT NULL,
  verifiedAt TEXT,
  lastSeenAt TEXT
);

CREATE TABLE IF NOT EXISTS Licenses (
  licenseKey TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  businessName TEXT NOT NULL,
  boundDeviceId TEXT,
  deviceName TEXT,
  issuedAt TEXT NOT NULL,
  activatedAt TEXT,
  lastConnectedAt TEXT,
  signature TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS OwnerSessions (
  sessionId TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS OwnerAuthAttempts (
  ip TEXT PRIMARY KEY,
  failedAttempts INTEGER NOT NULL DEFAULT 0,
  lockedUntil INTEGER NOT NULL DEFAULT 0
);

-- Indexing for high-speed edge lookups
CREATE INDEX IF NOT EXISTS idx_orders_orderid ON CustomerOrders(orderId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON CustomerOrders(status);
CREATE INDEX IF NOT EXISTS idx_licenses_device ON Licenses(boundDeviceId);
CREATE INDEX IF NOT EXISTS idx_sessions_valid ON OwnerSessions(sessionId, revoked, expiresAt);
