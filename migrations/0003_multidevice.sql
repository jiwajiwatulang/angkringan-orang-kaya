-- Opt-in only. Never rebind or rewrite existing licenses or merchant records.
CREATE TABLE IF NOT EXISTS MdStores (
  id TEXT PRIMARY KEY, licenseKey TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL DEFAULT 0,
  mutation TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS MdDevices (
  id TEXT NOT NULL, storeId TEXT NOT NULL REFERENCES MdStores(id),
  role TEXT NOT NULL CHECK(role IN ('owner','cashier')), publicKey TEXT NOT NULL,
  name TEXT NOT NULL, epoch INTEGER NOT NULL DEFAULT 1, revoked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(storeId,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS md_live_slot ON MdDevices(storeId,role) WHERE revoked=0;
CREATE TABLE IF NOT EXISTS MdPairings (
  id TEXT PRIMARY KEY, storeId TEXT NOT NULL REFERENCES MdStores(id), codeHash TEXT NOT NULL UNIQUE,
  expiresAt INTEGER NOT NULL, candidateId TEXT, candidateKey TEXT, candidateName TEXT,
  approved INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS MdEmployees (
  id TEXT NOT NULL, storeId TEXT NOT NULL REFERENCES MdStores(id), name TEXT NOT NULL,
  verifier TEXT NOT NULL, epoch INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0, lockedUntil INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(storeId,id)
);
CREATE TABLE IF NOT EXISTS MdNonces (
  storeId TEXT NOT NULL, deviceId TEXT NOT NULL, nonce TEXT NOT NULL, expiresAt INTEGER NOT NULL,
  PRIMARY KEY(storeId,deviceId,nonce)
);
CREATE INDEX IF NOT EXISTS md_nonce_expiry ON MdNonces(expiresAt);
CREATE TABLE IF NOT EXISTS MdEvents (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT, storeId TEXT NOT NULL REFERENCES MdStores(id),
  id TEXT NOT NULL, deviceId TEXT NOT NULL, operatorId TEXT NOT NULL,
  kind TEXT NOT NULL, entityId TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL,
  receivedAt INTEGER NOT NULL, UNIQUE(storeId,id)
);
CREATE INDEX IF NOT EXISTS md_events_cursor ON MdEvents(storeId,sequence);
CREATE TABLE IF NOT EXISTS MdEntities (
  storeId TEXT NOT NULL REFERENCES MdStores(id), kind TEXT NOT NULL, id TEXT NOT NULL,
  revision INTEGER NOT NULL, payload TEXT NOT NULL,
  PRIMARY KEY(storeId,kind,id)
);
