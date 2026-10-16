import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export interface DbCustomerOrder {
  id?: number;
  orderId: string;
  accessCode: string;
  buyerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string;
  transferProofName?: string;
  status: "menunggu_verifikasi" | "lunas_lisensi_terbit" | "batal";
  licenseKey?: string;
  boundDeviceId?: string;
  createdAt: string;
  verifiedAt?: string;
  lastSeenAt?: string;
}

export interface DbLicense {
  licenseKey: string;
  orderId: string;
  businessName: string;
  boundDeviceId?: string;
  deviceName?: string;
  issuedAt: string;
  activatedAt?: string;
  lastConnectedAt?: string;
  signature: string;
}

const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "sakunota_production.db");
let sqliteDb: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!sqliteDb) {
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec("PRAGMA journal_mode = WAL;");
    sqliteDb.exec("PRAGMA foreign_keys = ON;");
    initTables(sqliteDb);
  }
  return sqliteDb;
}

function initTables(db: DatabaseSync) {
  db.exec(`
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
  `);
}

// Order Operations
export function insertDbOrder(order: DbCustomerOrder): DbCustomerOrder {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO CustomerOrders (
      orderId, accessCode, buyerName, businessName, whatsapp, email,
      amount, paymentMethod, bankAccount, transferProofName, status,
      licenseKey, boundDeviceId, createdAt, verifiedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    order.orderId,
    order.accessCode,
    order.buyerName,
    order.businessName,
    order.whatsapp,
    order.email || null,
    order.amount || 65000,
    order.paymentMethod || "Transfer Bank BCA",
    order.bankAccount || "8030 554 912 a.n. Reza",
    order.transferProofName || null,
    order.status || "menunggu_verifikasi",
    order.licenseKey || null,
    order.boundDeviceId || null,
    order.createdAt,
    order.verifiedAt || null
  );

  return order;
}

export function getAllDbOrders(): DbCustomerOrder[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM CustomerOrders ORDER BY id DESC`);
  return stmt.all() as unknown as DbCustomerOrder[];
}

export function getDbOrderById(orderId: string): DbCustomerOrder | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM CustomerOrders WHERE orderId = ?`);
  const res = stmt.get(orderId);
  return (res as unknown as DbCustomerOrder) || null;
}

export function updateDbOrderStatusAndLicense(
  orderId: string,
  licenseKey: string,
  verifiedAt: string
): DbCustomerOrder | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE CustomerOrders 
    SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
    WHERE orderId = ?
  `);
  stmt.run(licenseKey, verifiedAt, orderId);
  return getDbOrderById(orderId);
}

// License Operations
export function insertDbLicense(license: DbLicense): DbLicense {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO Licenses (
      licenseKey, orderId, businessName, boundDeviceId, deviceName,
      issuedAt, activatedAt, lastConnectedAt, signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    license.licenseKey,
    license.orderId,
    license.businessName,
    license.boundDeviceId || null,
    license.deviceName || null,
    license.issuedAt,
    license.activatedAt || null,
    license.lastConnectedAt || null,
    license.signature
  );

  return license;
}

export function getDbLicense(licenseKey: string): DbLicense | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM Licenses WHERE licenseKey = ?`);
  const res = stmt.get(licenseKey);
  return (res as unknown as DbLicense) || null;
}

export function bindDbLicenseToDevice(
  licenseKey: string,
  deviceId: string,
  deviceName: string,
  activatedAt: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE Licenses 
    SET boundDeviceId = ?, deviceName = ?, activatedAt = ?, lastConnectedAt = ?
    WHERE licenseKey = ?
  `);
  stmt.run(deviceId, deviceName, activatedAt, activatedAt, licenseKey);

  // Also reflect in CustomerOrders
  const ordStmt = db.prepare(`
    UPDATE CustomerOrders
    SET boundDeviceId = ?, lastSeenAt = ?
    WHERE licenseKey = ?
  `);
  ordStmt.run(deviceId, activatedAt, licenseKey);
  return true;
}

// Session Operations (Revocable Tokens)
export function createDbSession(sessionId: string, username: string, expiresAt: number): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO OwnerSessions (sessionId, username, createdAt, expiresAt, revoked)
    VALUES (?, ?, ?, ?, 0)
  `);
  stmt.run(sessionId, username, new Date().toISOString(), expiresAt);
}

export function isDbSessionValid(sessionId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM OwnerSessions 
    WHERE sessionId = ? AND revoked = 0 AND expiresAt > ?
  `);
  const res = stmt.get(sessionId, Date.now());
  return Boolean(res);
}

export function revokeDbSession(sessionId: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`UPDATE OwnerSessions SET revoked = 1 WHERE sessionId = ?`);
  stmt.run(sessionId);
}

// Brute Force Guard (5 failed attempts locks for 15 minutes)
export function checkAuthLock(ip: string): { locked: boolean; remainingSec: number } {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM OwnerAuthAttempts WHERE ip = ?`);
  const row = stmt.get(ip) as any;
  if (!row) return { locked: false, remainingSec: 0 };

  const now = Date.now();
  if (row.lockedUntil > now) {
    return { locked: true, remainingSec: Math.ceil((row.lockedUntil - now) / 1000) };
  }
  return { locked: false, remainingSec: 0 };
}

export function recordFailedAuth(ip: string): { locked: boolean; remainingSec: number } {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM OwnerAuthAttempts WHERE ip = ?`);
  const row = stmt.get(ip) as any;
  const now = Date.now();

  let attempts = (row ? row.failedAttempts : 0) + 1;
  let lockedUntil = 0;

  if (attempts >= 5) {
    lockedUntil = now + 15 * 60 * 1000; // 15 mins
  }

  const upsert = db.prepare(`
    INSERT INTO OwnerAuthAttempts (ip, failedAttempts, lockedUntil)
    VALUES (?, ?, ?)
    ON CONFLICT(ip) DO UPDATE SET failedAttempts = ?, lockedUntil = ?
  `);
  upsert.run(ip, attempts, lockedUntil, attempts, lockedUntil);

  if (lockedUntil > now) {
    return { locked: true, remainingSec: Math.ceil((lockedUntil - now) / 1000) };
  }
  return { locked: false, remainingSec: 0 };
}

export function resetAuthAttempts(ip: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM OwnerAuthAttempts WHERE ip = ?`);
  stmt.run(ip);
}

// Live Real Database Metrics
export function getDbMetrics(): {
  totalPembeli: number;
  lisensiAktif: number;
  penggunaAktif: number;
  menungguVerifikasi: number;
} {
  const db = getDatabase();
  const qBuyers = db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders`).get() as any;
  const qLicenses = db.prepare(`SELECT COUNT(*) as count FROM Licenses WHERE boundDeviceId IS NOT NULL OR licenseKey IS NOT NULL`).get() as any;
  const qActiveDevices = db.prepare(`SELECT COUNT(DISTINCT boundDeviceId) as count FROM Licenses WHERE boundDeviceId IS NOT NULL`).get() as any;
  const qPending = db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status = 'menunggu_verifikasi'`).get() as any;

  return {
    totalPembeli: qBuyers?.count || 0,
    lisensiAktif: qLicenses?.count || 0,
    penggunaAktif: qActiveDevices?.count || 0,
    menungguVerifikasi: qPending?.count || 0,
  };
}

// Clean Database helper for pure tests
export function resetDatabaseClean(): void {
  const db = getDatabase();
  db.exec(`
    DELETE FROM CustomerOrders;
    DELETE FROM Licenses;
    DELETE FROM OwnerSessions;
    DELETE FROM OwnerAuthAttempts;
  `);
}
