// Cloudflare D1 Universal Database Layer for SakuNota
// Works identically on Cloudflare Edge (env.DB) and Local/Node test harness

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
  status: "menunggu_verifikasi" | "lunas_lisensi_terbit" | "batal" | "arsip_uji" | "gagal" | "kedaluwarsa" | "dikembalikan";
  licenseKey?: string;
  boundDeviceId?: string;
  deviceName?: string;
  activatedAt?: string;
  lastConnectedAt?: string;
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
  appVersion?: string;
  activeDays?: number;
  licenseType?: "berbayar" | "tester" | "hadiah";
  revoked?: number;
}

// Official Cloudflare D1 TypeScript Interfaces
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Response>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

export interface D1Response {
  success: boolean;
  meta: any;
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Node / Local Adapter for Cloudflare D1
let fallbackD1: D1Database | null = null;

export function createD1NodeAdapter(dbFilePath?: string): D1Database {
  let sqlite: any;
  try {
    // Dynamically load node:sqlite when in Node.js environment
    const { DatabaseSync } = require("node:sqlite");
    const fs = require("node:fs");
    const path = require("node:path");

    const dataDir = path.resolve("data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const file = dbFilePath || path.join(dataDir, "sakunota_production.db");
    sqlite = new DatabaseSync(file);
    sqlite.exec("PRAGMA journal_mode = WAL;");
    sqlite.exec("PRAGMA foreign_keys = ON;");
  } catch (_) {
    throw new Error("Cloudflare D1 database binding 'DB' belum dihubungkan pada Settings -> Functions -> D1 Database bindings di Cloudflare Dashboard.");
  }

  class NodeD1Statement implements D1PreparedStatement {
    private query: string;
    private params: any[] = [];

    constructor(query: string) {
      this.query = query;
    }

    bind(...values: any[]): D1PreparedStatement {
      this.params = values;
      return this;
    }

    async first<T = unknown>(colName?: string): Promise<T | null> {
      const stmt = sqlite.prepare(this.query);
      const row = stmt.get(...this.params) as any;
      if (!row) return null;
      if (colName) return (row[colName] as T) ?? null;
      return row as T;
    }

    async run(): Promise<D1Response> {
      const stmt = sqlite.prepare(this.query);
      stmt.run(...this.params);
      return { success: true, meta: {} };
    }

    async all<T = unknown>(): Promise<D1Result<T>> {
      const stmt = sqlite.prepare(this.query);
      const rows = stmt.all(...this.params) as T[];
      return { results: rows || [], success: true, meta: {} };
    }
  }

  return {
    prepare(query: string): D1PreparedStatement {
      return new NodeD1Statement(query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const s of statements) {
        const res = await s.all<T>();
        results.push(res);
      }
      return results;
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return { count: 1, duration: 1 };
    },
  };
}

export function getD1(envDb?: D1Database): D1Database {
  if (envDb) {
    return envDb;
  }
  if (!fallbackD1) {
    fallbackD1 = createD1NodeAdapter();
  }
  return fallbackD1;
}

// Table Initialization in Cloudflare D1
export async function initD1Tables(db: D1Database): Promise<void> {
  try {
    const existing = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='CustomerOrders'")
      .first();
    if (existing) {
      return;
    }
  } catch {
    // If check fails, proceed with safe creation
  }

  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS CustomerOrders (
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
    )`,
    `CREATE TABLE IF NOT EXISTS Licenses (
      licenseKey TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      businessName TEXT NOT NULL,
      boundDeviceId TEXT,
      deviceName TEXT,
      issuedAt TEXT NOT NULL,
      activatedAt TEXT,
      lastConnectedAt TEXT,
      signature TEXT NOT NULL,
      appVersion TEXT DEFAULT 'v2.6.0',
      activeDays INTEGER DEFAULT 1,
      licenseType TEXT DEFAULT 'berbayar',
      revoked INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS OwnerSessions (
      sessionId TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS OwnerAuthAttempts (
      ip TEXT PRIMARY KEY,
      failedAttempts INTEGER NOT NULL DEFAULT 0,
      lockedUntil INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS TesterLicenses (
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
    )`,
  ];

  for (const stmt of tableStatements) {
    try {
      await db.prepare(stmt).run();
    } catch {
      // safe fallback
    }
  }

  // Safe migration for columns added to existing tables
  const columnMigrations = [
    "ALTER TABLE Licenses ADD COLUMN appVersion TEXT DEFAULT 'v2.6.0'",
    "ALTER TABLE Licenses ADD COLUMN activeDays INTEGER DEFAULT 1",
    "ALTER TABLE Licenses ADD COLUMN licenseType TEXT DEFAULT 'berbayar'",
    "ALTER TABLE Licenses ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE Licenses ADD COLUMN lastConnectedAt TEXT",
    "ALTER TABLE CustomerOrders ADD COLUMN lastSeenAt TEXT",
  ];

  for (const query of columnMigrations) {
    try {
      await db.prepare(query).run();
    } catch {
      // Column already exists, safe to ignore
    }
  }
}

// D1 Order Operations
export async function insertOrderD1(db: D1Database, order: DbCustomerOrder): Promise<DbCustomerOrder> {
  const stmt = db.prepare(`
    INSERT INTO CustomerOrders (
      orderId, accessCode, buyerName, businessName, whatsapp, email,
      amount, paymentMethod, bankAccount, transferProofName, status,
      licenseKey, boundDeviceId, createdAt, verifiedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
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
  ).run();

  return order;
}

export async function getAllOrdersD1(db: D1Database): Promise<DbCustomerOrder[]> {
  const res = await db.prepare(`
    SELECT 
      o.id,
      o.orderId,
      o.accessCode,
      o.buyerName,
      o.businessName,
      o.whatsapp,
      o.email,
      o.amount,
      o.paymentMethod,
      o.bankAccount,
      o.transferProofName,
      o.status,
      o.licenseKey,
      COALESCE(l.boundDeviceId, o.boundDeviceId) AS boundDeviceId,
      l.deviceName AS deviceName,
      l.activatedAt AS activatedAt,
      l.lastConnectedAt AS lastConnectedAt,
      o.createdAt,
      o.verifiedAt,
      o.lastSeenAt
    FROM CustomerOrders o
    LEFT JOIN Licenses l ON o.licenseKey = l.licenseKey
    ORDER BY o.id DESC
  `).all<DbCustomerOrder>();
  return res.results || [];
}

export async function getOrderByIdD1(db: D1Database, orderId: string): Promise<DbCustomerOrder | null> {
  return await db.prepare(`
    SELECT 
      o.id,
      o.orderId,
      o.accessCode,
      o.buyerName,
      o.businessName,
      o.whatsapp,
      o.email,
      o.amount,
      o.paymentMethod,
      o.bankAccount,
      o.transferProofName,
      o.status,
      o.licenseKey,
      COALESCE(l.boundDeviceId, o.boundDeviceId) AS boundDeviceId,
      l.deviceName AS deviceName,
      l.activatedAt AS activatedAt,
      l.lastConnectedAt AS lastConnectedAt,
      o.createdAt,
      o.verifiedAt,
      o.lastSeenAt
    FROM CustomerOrders o
    LEFT JOIN Licenses l ON o.licenseKey = l.licenseKey
    WHERE o.orderId = ?
  `).bind(orderId).first<DbCustomerOrder>();
}

export async function updateOrderPaymentMethodD1(
  db: D1Database,
  orderId: string,
  paymentMethod: string
): Promise<void> {
  await db
    .prepare(`UPDATE CustomerOrders SET paymentMethod = ? WHERE orderId = ?`)
    .bind(paymentMethod, orderId)
    .run();
}

export async function updateOrderStatusAndLicenseD1(
  db: D1Database,
  orderId: string,
  licenseKey: string,
  verifiedAt: string
): Promise<DbCustomerOrder | null> {
  await db.prepare(`
    UPDATE CustomerOrders 
    SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
    WHERE orderId = ?
  `).bind(licenseKey, verifiedAt, orderId).run();

  return await getOrderByIdD1(db, orderId);
}

export async function cancelOrderD1(db: D1Database, orderId: string): Promise<boolean> {
  await db.prepare(`UPDATE CustomerOrders SET status = 'batal' WHERE orderId = ?`).bind(orderId).run();
  return true;
}

export async function archiveOrderD1(db: D1Database, orderId: string): Promise<boolean> {
  await db.prepare(`UPDATE CustomerOrders SET status = 'arsip_uji' WHERE orderId = ?`).bind(orderId).run();
  return true;
}

export async function deleteTestOrderD1(
  db: D1Database,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const order = await getOrderByIdD1(db, orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan." };
  if (order.status === "lunas_lisensi_terbit") {
    return {
      success: false,
      error: "Perlindungan Audit Finansial: Transaksi berbayar yang sah (Lunas) tidak dapat dihapus. Anda hanya dapat mencabut lisensi atau melakukan pengembalian dana (refund).",
    };
  }
  await db.prepare(`DELETE FROM CustomerOrders WHERE orderId = ?`).bind(orderId).run();
  return { success: true };
}

// D1 License Operations
export async function insertLicenseD1(db: D1Database, license: DbLicense): Promise<DbLicense> {
  await db.prepare(`
    INSERT OR REPLACE INTO Licenses (
      licenseKey, orderId, businessName, boundDeviceId, deviceName,
      issuedAt, activatedAt, lastConnectedAt, signature,
      appVersion, activeDays, licenseType, revoked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    license.licenseKey,
    license.orderId,
    license.businessName,
    license.boundDeviceId || null,
    license.deviceName || null,
    license.issuedAt,
    license.activatedAt || null,
    license.lastConnectedAt || null,
    license.signature,
    license.appVersion || "v2.6.0",
    license.activeDays || 1,
    license.licenseType || "berbayar",
    license.revoked || 0
  ).run();

  return license;
}

export async function getAllLicensesD1(db: D1Database): Promise<DbLicense[]> {
  const res = await db.prepare(`SELECT * FROM Licenses ORDER BY rowid DESC`).all<DbLicense>();
  return res.results || [];
}

export async function getLicenseD1(db: D1Database, licenseKey: string): Promise<DbLicense | null> {
  return await db.prepare(`SELECT * FROM Licenses WHERE licenseKey = ?`).bind(licenseKey).first<DbLicense>();
}

export async function unbindLicenseDeviceD1(db: D1Database, licenseKey: string): Promise<boolean> {
  await db.prepare(`
    UPDATE Licenses 
    SET boundDeviceId = NULL, deviceName = NULL 
    WHERE licenseKey = ?
  `).bind(licenseKey).run();

  await db.prepare(`
    UPDATE CustomerOrders
    SET boundDeviceId = NULL
    WHERE licenseKey = ?
  `).bind(licenseKey).run();

  return true;
}

export async function revokeLicenseD1(db: D1Database, licenseKey: string): Promise<boolean> {
  await db.prepare(`UPDATE Licenses SET revoked = 1 WHERE licenseKey = ?`).bind(licenseKey).run();
  return true;
}

export async function bindLicenseToDeviceD1(
  db: D1Database,
  licenseKey: string,
  deviceId: string,
  deviceName: string,
  activatedAt: string
): Promise<boolean> {
  await db.prepare(`
    UPDATE Licenses 
    SET boundDeviceId = ?, deviceName = ?, activatedAt = ?, lastConnectedAt = ?
    WHERE licenseKey = ?
  `).bind(deviceId, deviceName, activatedAt, activatedAt, licenseKey).run();

  await db.prepare(`
    UPDATE CustomerOrders
    SET boundDeviceId = ?, lastSeenAt = ?
    WHERE licenseKey = ?
  `).bind(deviceId, activatedAt, licenseKey).run();

  return true;
}

// D1 Revocable Session Operations
export async function createSessionD1(db: D1Database, sessionId: string, username: string, expiresAt: number): Promise<void> {
  await db.prepare(`
    INSERT INTO OwnerSessions (sessionId, username, createdAt, expiresAt, revoked)
    VALUES (?, ?, ?, ?, 0)
  `).bind(sessionId, username, new Date().toISOString(), expiresAt).run();
}

export async function isSessionValidD1(db: D1Database, sessionId: string): Promise<boolean> {
  const row = await db.prepare(`
    SELECT sessionId FROM OwnerSessions 
    WHERE sessionId = ? AND revoked = 0 AND expiresAt > ?
  `).bind(sessionId, Date.now()).first<any>();
  return Boolean(row);
}

export async function revokeSessionD1(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare(`UPDATE OwnerSessions SET revoked = 1 WHERE sessionId = ?`).bind(sessionId).run();
}

// D1 Brute Force Guard
export async function checkAuthLockD1(db: D1Database, ip: string): Promise<{ locked: boolean; remainingSec: number }> {
  const row = await db.prepare(`SELECT * FROM OwnerAuthAttempts WHERE ip = ?`).bind(ip).first<any>();
  if (!row) return { locked: false, remainingSec: 0 };

  const now = Date.now();
  if (row.lockedUntil > now) {
    return { locked: true, remainingSec: Math.ceil((row.lockedUntil - now) / 1000) };
  }
  return { locked: false, remainingSec: 0 };
}

export async function recordFailedAuthD1(db: D1Database, ip: string): Promise<{ locked: boolean; remainingSec: number }> {
  const row = await db.prepare(`SELECT * FROM OwnerAuthAttempts WHERE ip = ?`).bind(ip).first<any>();
  const now = Date.now();

  let attempts = (row ? row.failedAttempts : 0) + 1;
  let lockedUntil = 0;

  if (attempts >= 5) {
    lockedUntil = now + 15 * 60 * 1000; // 15 mins lock
  }

  await db.prepare(`
    INSERT INTO OwnerAuthAttempts (ip, failedAttempts, lockedUntil)
    VALUES (?, ?, ?)
    ON CONFLICT(ip) DO UPDATE SET failedAttempts = ?, lockedUntil = ?
  `).bind(ip, attempts, lockedUntil, attempts, lockedUntil).run();

  if (lockedUntil > now) {
    return { locked: true, remainingSec: Math.ceil((lockedUntil - now) / 1000) };
  }
  return { locked: false, remainingSec: 0 };
}

export async function resetAuthAttemptsD1(db: D1Database, ip: string): Promise<void> {
  await db.prepare(`DELETE FROM OwnerAuthAttempts WHERE ip = ?`).bind(ip).run();
}

// D1 Genuine Real Metrics
export async function getMetricsD1(db: D1Database): Promise<{
  totalPembeli: number;
  pembayaranBerhasil: number;
  lisensiAktif: number;
  penggunaAktif: number;
  menungguVerifikasi: number;
  menungguPembayaran: number;
}> {
  const qBuyers = await db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status != 'batal' AND status != 'arsip_uji'`).first<any>();
  const qPaid = await db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status = 'lunas_lisensi_terbit'`).first<any>();
  const qLicenses = await db.prepare(`SELECT COUNT(*) as count FROM Licenses WHERE revoked = 0 OR revoked IS NULL`).first<any>();
  const qActiveDevices = await db.prepare(`SELECT COUNT(DISTINCT boundDeviceId) as count FROM Licenses WHERE boundDeviceId IS NOT NULL`).first<any>();
  const qPending = await db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status = 'menunggu_verifikasi'`).first<any>();

  return {
    totalPembeli: qBuyers?.count || 0,
    pembayaranBerhasil: qPaid?.count || 0,
    lisensiAktif: qLicenses?.count || 0,
    penggunaAktif: qActiveDevices?.count || 0,
    menungguVerifikasi: qPending?.count || 0,
    menungguPembayaran: qPending?.count || 0,
  };
}

// Clean Database helper for test suite
export async function resetDatabaseCleanD1(db: D1Database): Promise<void> {
  await db.exec(`
    DELETE FROM CustomerOrders;
    DELETE FROM Licenses;
    DELETE FROM OwnerSessions;
    DELETE FROM OwnerAuthAttempts;
    DELETE FROM TesterLicenses;
  `);
}

// Tester License Operations in D1
export interface DbTesterLicense {
  id?: number;
  licenseKey: string;
  recipientName: string;
  whatsapp: string;
  durationDays: number;
  expiresAt: string | null;
  notes: string | null;
  boundDeviceId: string | null;
  deviceName: string | null;
  createdAt: string;
  activatedAt: string | null;
  revoked: number;
}

export async function insertTesterLicenseD1(
  db: D1Database,
  data: {
    recipientName: string;
    whatsapp: string;
    durationDays: number;
    notes?: string;
  }
): Promise<DbTesterLicense> {
  const randHex1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randHex2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseKey = `SN-TEST-${randHex1}-${randHex2}`;
  const now = new Date();
  const createdAt = now.toISOString();

  let expiresAt: string | null = null;
  if (data.durationDays > 0) {
    const expDate = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000);
    expiresAt = expDate.toISOString();
  }

  const record: DbTesterLicense = {
    licenseKey,
    recipientName: data.recipientName.trim(),
    whatsapp: data.whatsapp.trim(),
    durationDays: data.durationDays,
    expiresAt,
    notes: data.notes?.trim() || null,
    boundDeviceId: null,
    deviceName: null,
    createdAt,
    activatedAt: null,
    revoked: 0,
  };

  await db.prepare(`
    INSERT INTO TesterLicenses (
      licenseKey, recipientName, whatsapp, durationDays, expiresAt,
      notes, boundDeviceId, deviceName, createdAt, activatedAt, revoked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.licenseKey,
    record.recipientName,
    record.whatsapp,
    record.durationDays,
    record.expiresAt,
    record.notes,
    record.boundDeviceId,
    record.deviceName,
    record.createdAt,
    record.activatedAt,
    record.revoked
  ).run();

  return record;
}

export async function getAllTesterLicensesD1(db: D1Database): Promise<DbTesterLicense[]> {
  const res = await db.prepare(`SELECT * FROM TesterLicenses ORDER BY id DESC`).all<DbTesterLicense>();
  return res.results || [];
}

export async function getTesterLicenseD1(db: D1Database, licenseKey: string): Promise<DbTesterLicense | null> {
  return await db.prepare(`SELECT * FROM TesterLicenses WHERE licenseKey = ?`).bind(licenseKey).first<DbTesterLicense>();
}

export async function revokeTesterLicenseD1(db: D1Database, licenseKey: string): Promise<boolean> {
  await db.prepare(`UPDATE TesterLicenses SET revoked = 1 WHERE licenseKey = ?`).bind(licenseKey).run();
  return true;
}

export async function unbindTesterLicenseDeviceD1(db: D1Database, licenseKey: string): Promise<boolean> {
  await db.prepare(`UPDATE TesterLicenses SET boundDeviceId = NULL, deviceName = NULL WHERE licenseKey = ?`).bind(licenseKey).run();
  return true;
}

export async function bindTesterLicenseToDeviceD1(
  db: D1Database,
  licenseKey: string,
  deviceId: string,
  deviceName: string,
  activatedAt: string
): Promise<boolean> {
  await db.prepare(`
    UPDATE TesterLicenses 
    SET boundDeviceId = ?, deviceName = ?, activatedAt = ?
    WHERE licenseKey = ?
  `).bind(deviceId, deviceName, activatedAt, licenseKey).run();
  return true;
}

