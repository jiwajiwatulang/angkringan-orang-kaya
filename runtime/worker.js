var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node-built-in-modules:node:sqlite
import libDefault from "node:sqlite";
var require_node_sqlite = __commonJS({
  "node-built-in-modules:node:sqlite"(exports, module) {
    module.exports = libDefault;
  }
});

// node-built-in-modules:node:fs
import libDefault2 from "node:fs";
var require_node_fs = __commonJS({
  "node-built-in-modules:node:fs"(exports, module) {
    module.exports = libDefault2;
  }
});

// node-built-in-modules:node:path
import libDefault3 from "node:path";
var require_node_path = __commonJS({
  "node-built-in-modules:node:path"(exports, module) {
    module.exports = libDefault3;
  }
});

// src/lib/server/d1.ts
function createD1NodeAdapter(dbFilePath) {
  let sqlite;
  try {
    const { DatabaseSync } = require_node_sqlite();
    const fs = require_node_fs();
    const path = require_node_path();
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
  class NodeD1Statement {
    constructor(query) {
      this.params = [];
      this.query = query;
    }
    static {
      __name(this, "NodeD1Statement");
    }
    bind(...values) {
      this.params = values;
      return this;
    }
    async first(colName) {
      const stmt = sqlite.prepare(this.query);
      const row = stmt.get(...this.params);
      if (!row) return null;
      if (colName) return row[colName] ?? null;
      return row;
    }
    async run() {
      const stmt = sqlite.prepare(this.query);
      stmt.run(...this.params);
      return { success: true, meta: {} };
    }
    async all() {
      return this.allSync();
    }
    allSync() {
      const stmt = sqlite.prepare(this.query);
      const rows = stmt.all(...this.params);
      return { results: rows || [], success: true, meta: {} };
    }
  }
  return {
    prepare(query) {
      return new NodeD1Statement(query);
    },
    async batch(statements) {
      const results = [];
      sqlite.exec("BEGIN");
      try {
        for (const s of statements) {
          if (!(s instanceof NodeD1Statement)) throw new Error("Statement does not belong to this local D1 adapter.");
          results.push(s.allSync());
        }
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
      return results;
    },
    async exec(query) {
      sqlite.exec(query);
      return { count: 1, duration: 1 };
    }
  };
}
function getD1(envDb) {
  if (envDb) {
    return envDb;
  }
  if (!fallbackD1) {
    fallbackD1 = createD1NodeAdapter();
  }
  return fallbackD1;
}
async function initD1Tables(db) {
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS LicenseDeviceKeys (licenseKey TEXT PRIMARY KEY, deviceId TEXT NOT NULL, publicKey TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS DeviceTelemetry (
      licenseKey TEXT PRIMARY KEY,
      deviceId TEXT,
      deviceModel TEXT,
      location TEXT,
      ipAddress TEXT,
      lastSeenAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS CustomerOrders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT UNIQUE NOT NULL,
      accessCode TEXT NOT NULL,
      buyerName TEXT NOT NULL,
      businessName TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT,
      npwp TEXT,
      amount INTEGER NOT NULL DEFAULT 50000,
      paymentMethod TEXT NOT NULL DEFAULT 'Transfer Bank BCA',
      bankAccount TEXT NOT NULL DEFAULT '2582118451 a.n. REZA RESTU RENGGA HARDIANTO',
      transferProofName TEXT,
      transferProofData TEXT,
      paymentLink TEXT,
      status TEXT NOT NULL DEFAULT 'menunggu_verifikasi',
      licenseKey TEXT,
      boundDeviceId TEXT,
      createdAt TEXT NOT NULL,
      verifiedAt TEXT,
      lastSeenAt TEXT,
      promoCode TEXT,
      discountAmount INTEGER DEFAULT 0,
      originalAmount INTEGER DEFAULT 50000
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
    `CREATE TABLE IF NOT EXISTS BetaRegistrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registrationId TEXT UNIQUE NOT NULL,
      trialLicenseKey TEXT UNIQUE,
      ownerName TEXT NOT NULL,
      businessName TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      boundDeviceId TEXT,
      deviceName TEXT,
      registeredAt TEXT NOT NULL,
      approvedAt TEXT,
      activatedAt TEXT,
      expiresAt TEXT,
      lastConnectedAt TEXT,
      durationDays INTEGER NOT NULL DEFAULT 7,
      rejectionReason TEXT,
      auditLog TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS PromoCodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discountType TEXT NOT NULL DEFAULT 'nominal',
      discountValue INTEGER NOT NULL,
      description TEXT,
      maxUsage INTEGER DEFAULT 0,
      usageCount INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    )`
  ];
  for (const stmt of tableStatements) {
    try {
      await db.prepare(stmt).run();
    } catch {
    }
  }
  const columnMigrations = [
    "ALTER TABLE Licenses ADD COLUMN appVersion TEXT DEFAULT 'v2.6.0'",
    "ALTER TABLE Licenses ADD COLUMN activeDays INTEGER DEFAULT 1",
    "ALTER TABLE Licenses ADD COLUMN licenseType TEXT DEFAULT 'berbayar'",
    "ALTER TABLE Licenses ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE Licenses ADD COLUMN lastConnectedAt TEXT",
    "ALTER TABLE CustomerOrders ADD COLUMN lastSeenAt TEXT",
    "ALTER TABLE CustomerOrders ADD COLUMN transferProofData TEXT",
    "ALTER TABLE CustomerOrders ADD COLUMN paymentLink TEXT",
    "ALTER TABLE CustomerOrders ADD COLUMN promoCode TEXT",
    "ALTER TABLE CustomerOrders ADD COLUMN discountAmount INTEGER DEFAULT 0",
    "ALTER TABLE CustomerOrders ADD COLUMN originalAmount INTEGER DEFAULT 50000",
    "ALTER TABLE CustomerOrders ADD COLUMN npwp TEXT"
  ];
  for (const query of columnMigrations) {
    try {
      await db.prepare(query).run();
    } catch {
    }
  }
}
async function insertOrderD1(db, order) {
  const stmt = db.prepare(`
    INSERT INTO CustomerOrders (
      orderId, accessCode, buyerName, businessName, whatsapp, email, npwp,
      amount, paymentMethod, bankAccount, transferProofName, transferProofData, paymentLink, status,
      licenseKey, boundDeviceId, createdAt, verifiedAt, promoCode, discountAmount, originalAmount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.bind(
    order.orderId,
    order.accessCode,
    order.buyerName,
    order.businessName,
    order.whatsapp,
    order.email || null,
    order.npwp || null,
    order.amount || 5e4,
    order.paymentMethod || "Transfer Bank BCA",
    order.bankAccount || "2582118451 a.n. REZA RESTU RENGGA HARDIANTO",
    order.transferProofName || null,
    order.transferProofData || null,
    order.paymentLink || null,
    order.status || "menunggu_verifikasi",
    order.licenseKey || null,
    order.boundDeviceId || null,
    order.createdAt,
    order.verifiedAt || null,
    order.promoCode || null,
    order.discountAmount || 0,
    order.originalAmount || 5e4
  ).run();
  return order;
}
async function getAllOrdersD1(db) {
  const res = await db.prepare(`
    SELECT 
      o.id,
      o.orderId,
      o.accessCode,
      o.buyerName,
      o.businessName,
      o.whatsapp,
      o.email,
      o.npwp,
      o.amount,
      o.paymentMethod,
      o.bankAccount,
      o.transferProofName,
      o.transferProofData,
      o.paymentLink,
      o.status,
      o.licenseKey,
      COALESCE(l.boundDeviceId, o.boundDeviceId) AS boundDeviceId,
      l.deviceName AS deviceName,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp,
      l.activatedAt AS activatedAt,
      COALESCE(dt.lastSeenAt, l.lastConnectedAt, o.lastSeenAt) AS lastConnectedAt,
      o.createdAt,
      o.verifiedAt,
      COALESCE(dt.lastSeenAt, o.lastSeenAt) AS lastSeenAt,
      o.promoCode,
      o.discountAmount,
      o.originalAmount
    FROM CustomerOrders o
    LEFT JOIN Licenses l ON o.licenseKey = l.licenseKey
    LEFT JOIN DeviceTelemetry dt ON o.licenseKey = dt.licenseKey
    ORDER BY o.id DESC
  `).all();
  return res.results || [];
}
async function getOrderByIdD1(db, orderId) {
  return await db.prepare(`
    SELECT 
      o.id,
      o.orderId,
      o.accessCode,
      o.buyerName,
      o.businessName,
      o.whatsapp,
      o.email,
      o.npwp,
      o.amount,
      o.paymentMethod,
      o.bankAccount,
      o.transferProofName,
      o.transferProofData,
      o.paymentLink,
      o.status,
      o.licenseKey,
      COALESCE(l.boundDeviceId, o.boundDeviceId) AS boundDeviceId,
      l.deviceName AS deviceName,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp,
      l.activatedAt AS activatedAt,
      COALESCE(dt.lastSeenAt, l.lastConnectedAt, o.lastSeenAt) AS lastConnectedAt,
      o.createdAt,
      o.verifiedAt,
      COALESCE(dt.lastSeenAt, o.lastSeenAt) AS lastSeenAt,
      o.promoCode,
      o.discountAmount,
      o.originalAmount
    FROM CustomerOrders o
    LEFT JOIN Licenses l ON o.licenseKey = l.licenseKey
    LEFT JOIN DeviceTelemetry dt ON o.licenseKey = dt.licenseKey
    WHERE o.orderId = ?
  `).bind(orderId).first();
}
async function updateOrderProofD1(db, orderId, transferProofName, transferProofData) {
  await db.prepare(`UPDATE CustomerOrders SET transferProofName = ?, transferProofData = ? WHERE orderId = ?`).bind(transferProofName, transferProofData, orderId).run();
  return await getOrderByIdD1(db, orderId);
}
async function updateOrderPaymentLinkD1(db, orderId, paymentLink, paymentMethod = "Midtrans Otomatis") {
  await db.prepare(`UPDATE CustomerOrders SET paymentLink = ?, paymentMethod = ? WHERE orderId = ?`).bind(paymentLink, paymentMethod, orderId).run();
  return await getOrderByIdD1(db, orderId);
}
async function cancelOrderD1(db, orderId) {
  await db.prepare(`UPDATE CustomerOrders SET status = 'batal' WHERE orderId = ?`).bind(orderId).run();
  return true;
}
async function archiveOrderD1(db, orderId) {
  await db.prepare(`UPDATE CustomerOrders SET status = 'arsip_uji' WHERE orderId = ?`).bind(orderId).run();
  return true;
}
async function deleteTestOrderD1(db, orderId) {
  const order = await getOrderByIdD1(db, orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan." };
  if (order.status === "lunas_lisensi_terbit") {
    return {
      success: false,
      error: "Perlindungan Audit Finansial: Transaksi berbayar yang sah (Lunas) tidak dapat dihapus. Anda hanya dapat mencabut lisensi atau melakukan pengembalian dana (refund)."
    };
  }
  await db.prepare(`DELETE FROM CustomerOrders WHERE orderId = ?`).bind(orderId).run();
  return { success: true };
}
async function getAllLicensesD1(db) {
  const res = await db.prepare(`
    SELECT 
      l.*,
      COALESCE(dt.lastSeenAt, l.lastConnectedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM Licenses l
    LEFT JOIN DeviceTelemetry dt ON l.licenseKey = dt.licenseKey
    ORDER BY l.rowid DESC
  `).all();
  return res.results || [];
}
async function getLicenseD1(db, licenseKey) {
  return await db.prepare(`
    SELECT 
      l.*,
      COALESCE(dt.lastSeenAt, l.lastConnectedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM Licenses l
    LEFT JOIN DeviceTelemetry dt ON l.licenseKey = dt.licenseKey
    WHERE l.licenseKey = ?
  `).bind(licenseKey).first();
}
async function unbindLicenseDeviceD1(db, licenseKey) {
  await db.batch([
    db.prepare("DELETE FROM LicenseDeviceKeys WHERE licenseKey = ?").bind(licenseKey),
    db.prepare("DELETE FROM DeviceTelemetry WHERE licenseKey = ?").bind(licenseKey),
    db.prepare("UPDATE Licenses SET boundDeviceId = NULL, deviceName = NULL WHERE licenseKey = ?").bind(licenseKey),
    db.prepare("UPDATE CustomerOrders SET boundDeviceId = NULL WHERE licenseKey = ?").bind(licenseKey)
  ]);
  return true;
}
async function revokeLicenseD1(db, licenseKey) {
  await db.prepare(`UPDATE Licenses SET revoked = 1 WHERE licenseKey = ?`).bind(licenseKey).run();
  return true;
}
async function bindLicenseToDeviceD1(db, licenseKey, deviceId, deviceName, activatedAt) {
  await db.prepare(`
    UPDATE Licenses 
    SET boundDeviceId = ?, deviceName = ?, activatedAt = ?, lastConnectedAt = ?
    WHERE licenseKey = ? AND revoked = 0 AND (boundDeviceId IS NULL OR boundDeviceId = ?)
  `).bind(deviceId, deviceName, activatedAt, activatedAt, licenseKey, deviceId).run();
  const claimed = await getLicenseD1(db, licenseKey);
  if (claimed?.boundDeviceId !== deviceId || claimed.revoked === 1) return false;
  await db.prepare(`
    UPDATE CustomerOrders
    SET boundDeviceId = ?, lastSeenAt = ?
    WHERE licenseKey = ?
  `).bind(deviceId, activatedAt, licenseKey).run();
  return true;
}
async function createSessionD1(db, sessionId, username, expiresAt) {
  await db.prepare(`
    INSERT INTO OwnerSessions (sessionId, username, createdAt, expiresAt, revoked)
    VALUES (?, ?, ?, ?, 0)
  `).bind(sessionId, username, (/* @__PURE__ */ new Date()).toISOString(), expiresAt).run();
}
async function isSessionValidD1(db, sessionId) {
  const row = await db.prepare(`
    SELECT sessionId FROM OwnerSessions 
    WHERE sessionId = ? AND revoked = 0 AND expiresAt > ?
  `).bind(sessionId, Date.now()).first();
  return Boolean(row);
}
async function revokeSessionD1(db, sessionId) {
  await db.prepare(`UPDATE OwnerSessions SET revoked = 1 WHERE sessionId = ?`).bind(sessionId).run();
}
async function checkAuthLockD1(db, ip) {
  const row = await db.prepare(`SELECT * FROM OwnerAuthAttempts WHERE ip = ?`).bind(ip).first();
  if (!row) return { locked: false, remainingSec: 0 };
  const now = Date.now();
  if (row.lockedUntil > now) {
    return { locked: true, remainingSec: Math.ceil((row.lockedUntil - now) / 1e3) };
  }
  return { locked: false, remainingSec: 0 };
}
async function recordFailedAuthD1(db, ip) {
  const row = await db.prepare(`SELECT * FROM OwnerAuthAttempts WHERE ip = ?`).bind(ip).first();
  const now = Date.now();
  let attempts = (row ? row.failedAttempts : 0) + 1;
  let lockedUntil = 0;
  if (attempts >= 5) {
    lockedUntil = now + 15 * 60 * 1e3;
  }
  await db.prepare(`
    INSERT INTO OwnerAuthAttempts (ip, failedAttempts, lockedUntil)
    VALUES (?, ?, ?)
    ON CONFLICT(ip) DO UPDATE SET failedAttempts = ?, lockedUntil = ?
  `).bind(ip, attempts, lockedUntil, attempts, lockedUntil).run();
  if (lockedUntil > now) {
    return { locked: true, remainingSec: Math.ceil((lockedUntil - now) / 1e3) };
  }
  return { locked: false, remainingSec: 0 };
}
async function resetAuthAttemptsD1(db, ip) {
  await db.prepare(`DELETE FROM OwnerAuthAttempts WHERE ip = ?`).bind(ip).run();
}
async function getMetricsD1(db) {
  const qBuyers = await db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status != 'batal' AND status != 'arsip_uji'`).first();
  const qPaid = await db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status = 'lunas_lisensi_terbit'`).first();
  const qLicenses = await db.prepare(`SELECT COUNT(*) as count FROM Licenses WHERE revoked = 0 OR revoked IS NULL`).first();
  const qActiveDevices = await db.prepare(`SELECT COUNT(DISTINCT boundDeviceId) as count FROM Licenses WHERE boundDeviceId IS NOT NULL`).first();
  const qPending = await db.prepare(`SELECT COUNT(*) as count FROM CustomerOrders WHERE status = 'menunggu_verifikasi'`).first();
  return {
    totalPembeli: qBuyers?.count || 0,
    pembayaranBerhasil: qPaid?.count || 0,
    lisensiAktif: qLicenses?.count || 0,
    penggunaAktif: qActiveDevices?.count || 0,
    menungguVerifikasi: qPending?.count || 0,
    menungguPembayaran: qPending?.count || 0
  };
}
async function resetDatabaseCleanD1(db) {
  await db.exec(`
    DELETE FROM LicenseDeviceKeys;
    DELETE FROM DeviceTelemetry;
    DELETE FROM CustomerOrders;
    DELETE FROM Licenses;
    DELETE FROM OwnerSessions;
    DELETE FROM OwnerAuthAttempts;
    DELETE FROM TesterLicenses;
    DELETE FROM BetaRegistrations;
  `);
}
async function insertTesterLicenseD1(db, data) {
  const randHex1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randHex2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseKey = `SN-TEST-${randHex1}-${randHex2}`;
  const now = /* @__PURE__ */ new Date();
  const createdAt = now.toISOString();
  let expiresAt = null;
  if (data.durationDays > 0) {
    const expDate = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1e3);
    expiresAt = expDate.toISOString();
  }
  const record = {
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
    revoked: 0
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
async function getAllTesterLicensesD1(db) {
  const res = await db.prepare(`
    SELECT 
      t.*,
      COALESCE(dt.lastSeenAt, t.activatedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM TesterLicenses t
    LEFT JOIN DeviceTelemetry dt ON t.licenseKey = dt.licenseKey
    ORDER BY t.id DESC
  `).all();
  return res.results || [];
}
async function getTesterLicenseD1(db, licenseKey) {
  return await db.prepare(`
    SELECT 
      t.*,
      COALESCE(dt.lastSeenAt, t.activatedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM TesterLicenses t
    LEFT JOIN DeviceTelemetry dt ON t.licenseKey = dt.licenseKey
    WHERE t.licenseKey = ?
  `).bind(licenseKey).first();
}
async function revokeTesterLicenseD1(db, licenseKey) {
  await db.prepare(`UPDATE TesterLicenses SET revoked = 1 WHERE licenseKey = ?`).bind(licenseKey).run();
  return true;
}
async function extendTesterLicenseD1(db, licenseKey, extraDays, newExpiresAt, updatedNotes) {
  await db.prepare(`
    UPDATE TesterLicenses
    SET durationDays = durationDays + ?, expiresAt = ?, notes = ?
    WHERE licenseKey = ?
  `).bind(extraDays, newExpiresAt, updatedNotes ?? null, licenseKey).run();
  return true;
}
async function unbindTesterLicenseDeviceD1(db, licenseKey) {
  await db.batch([
    db.prepare("DELETE FROM LicenseDeviceKeys WHERE licenseKey = ?").bind(licenseKey),
    db.prepare("DELETE FROM DeviceTelemetry WHERE licenseKey = ?").bind(licenseKey),
    db.prepare("UPDATE TesterLicenses SET boundDeviceId = NULL, deviceName = NULL WHERE licenseKey = ?").bind(licenseKey)
  ]);
  return true;
}
async function bindTesterLicenseToDeviceD1(db, licenseKey, deviceId, deviceName, activatedAt) {
  await db.prepare(`
    UPDATE TesterLicenses 
    SET boundDeviceId = ?, deviceName = ?, activatedAt = ?
    WHERE licenseKey = ? AND revoked = 0 AND (boundDeviceId IS NULL OR boundDeviceId = ?)
  `).bind(deviceId, deviceName, activatedAt, licenseKey, deviceId).run();
  const current = await getTesterLicenseD1(db, licenseKey);
  if (current?.boundDeviceId !== deviceId || current.revoked === 1) return false;
  return true;
}
async function insertBetaRegistrationD1(db, reg) {
  await db.prepare(`
    INSERT INTO BetaRegistrations (
      registrationId, trialLicenseKey, ownerName, businessName, whatsapp, email,
      status, notes, boundDeviceId, deviceName, registeredAt, approvedAt,
      activatedAt, expiresAt, lastConnectedAt, durationDays, rejectionReason, auditLog
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    reg.registrationId,
    reg.trialLicenseKey,
    reg.ownerName,
    reg.businessName,
    reg.whatsapp,
    reg.email || null,
    reg.status || "pending",
    reg.notes || null,
    reg.boundDeviceId || null,
    reg.deviceName || null,
    reg.registeredAt,
    reg.approvedAt || null,
    reg.activatedAt || null,
    reg.expiresAt || null,
    reg.lastConnectedAt || null,
    reg.durationDays || 7,
    reg.rejectionReason || null,
    reg.auditLog || null
  ).run();
  return reg;
}
function normalizeBetaRow(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.registrationId || row.id,
    licenseKey: row.trialLicenseKey || row.licenseKey || null
  };
}
async function getAllBetaRegistrationsD1(db) {
  const res = await db.prepare(`
    SELECT 
      b.*,
      COALESCE(dt.lastSeenAt, b.lastConnectedAt, b.activatedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM BetaRegistrations b
    LEFT JOIN DeviceTelemetry dt ON b.trialLicenseKey = dt.licenseKey
    ORDER BY b.id DESC
  `).all();
  return (res.results || []).map((r) => normalizeBetaRow(r));
}
async function getBetaRegistrationByIdD1(db, registrationId) {
  const row = await db.prepare(`
    SELECT 
      b.*,
      COALESCE(dt.lastSeenAt, b.lastConnectedAt, b.activatedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM BetaRegistrations b
    LEFT JOIN DeviceTelemetry dt ON b.trialLicenseKey = dt.licenseKey
    WHERE b.registrationId = ?
  `).bind(registrationId).first();
  return normalizeBetaRow(row);
}
async function getBetaRegistrationByLicenseKeyD1(db, trialLicenseKey) {
  const row = await db.prepare(`
    SELECT 
      b.*,
      COALESCE(dt.lastSeenAt, b.lastConnectedAt, b.activatedAt) AS lastConnectedAt,
      dt.deviceModel AS deviceModel,
      dt.location AS deviceLocation,
      dt.ipAddress AS deviceIp
    FROM BetaRegistrations b
    LEFT JOIN DeviceTelemetry dt ON b.trialLicenseKey = dt.licenseKey
    WHERE b.trialLicenseKey = ?
  `).bind(trialLicenseKey).first();
  return normalizeBetaRow(row);
}
async function getBetaRegistrationByWhatsappD1(db, whatsapp) {
  const row = await db.prepare(`SELECT * FROM BetaRegistrations WHERE whatsapp = ?`).bind(whatsapp).first();
  return normalizeBetaRow(row);
}
async function approveBetaRegistrationD1(db, registrationId, licenseKey, approvedAt) {
  await db.prepare(`
    UPDATE BetaRegistrations 
    SET status = 'disetujui', trialLicenseKey = ?, approvedAt = ?
    WHERE registrationId = ?
  `).bind(licenseKey, approvedAt, registrationId).run();
  return true;
}
async function rejectBetaRegistrationD1(db, registrationId, rejectionReason) {
  await db.prepare(`
    UPDATE BetaRegistrations 
    SET status = 'ditolak', rejectionReason = ?
    WHERE registrationId = ?
  `).bind(rejectionReason, registrationId).run();
  return true;
}
async function revokeBetaRegistrationD1(db, trialLicenseKey) {
  await db.prepare(`
    UPDATE BetaRegistrations 
    SET status = 'dicabut'
    WHERE trialLicenseKey = ?
  `).bind(trialLicenseKey).run();
  return true;
}
async function unbindBetaRegistrationDeviceD1(db, trialLicenseKey) {
  await db.batch([
    db.prepare("DELETE FROM LicenseDeviceKeys WHERE licenseKey = ?").bind(trialLicenseKey),
    db.prepare("DELETE FROM DeviceTelemetry WHERE licenseKey = ?").bind(trialLicenseKey),
    db.prepare("UPDATE BetaRegistrations SET boundDeviceId = NULL, deviceName = NULL WHERE trialLicenseKey = ?").bind(trialLicenseKey)
  ]);
  return true;
}
async function bindBetaRegistrationToDeviceD1(db, trialLicenseKey, deviceId, deviceName, activatedAt, expiresAt) {
  await db.prepare(`
    UPDATE BetaRegistrations 
    SET boundDeviceId = ?, deviceName = ?, activatedAt = ?, expiresAt = ?, lastConnectedAt = ?
    WHERE trialLicenseKey = ? AND status = 'disetujui' AND (boundDeviceId IS NULL OR boundDeviceId = ?)
  `).bind(deviceId, deviceName, activatedAt, expiresAt, activatedAt, trialLicenseKey, deviceId).run();
  const current = await getBetaRegistrationByLicenseKeyD1(db, trialLicenseKey);
  if (current?.boundDeviceId !== deviceId || current.status !== "disetujui") return false;
  return true;
}
async function extendBetaRegistrationTrialD1(db, registrationId, extraDays, newExpiresAt, auditLog) {
  await db.prepare(`
    UPDATE BetaRegistrations 
    SET durationDays = durationDays + ?, expiresAt = ?, auditLog = ?
    WHERE registrationId = ?
  `).bind(extraDays, newExpiresAt, auditLog, registrationId).run();
  return true;
}
function calculatePromoDiscount(basePrice, discountType, discountValue) {
  let discountAmount = 0;
  if (discountType === "nominal") {
    discountAmount = Math.min(basePrice - 1e3, Math.max(0, discountValue));
  } else if (discountType === "percent") {
    const pct = Math.min(99, Math.max(1, discountValue));
    discountAmount = Math.round(basePrice * pct / 100);
  } else if (discountType === "fixed_price") {
    const fixed = Math.max(1e3, discountValue);
    discountAmount = Math.max(0, basePrice - fixed);
  }
  const finalAmount = Math.max(1e3, basePrice - discountAmount);
  return { discountAmount, finalAmount };
}
async function getPromoCodeByCodeD1(db, code) {
  const clean = code.trim().toUpperCase();
  return await db.prepare("SELECT * FROM PromoCodes WHERE UPPER(code) = ?").bind(clean).first();
}
async function getAllPromoCodesD1(db) {
  const res = await db.prepare("SELECT * FROM PromoCodes ORDER BY id DESC").all();
  return res.results || [];
}
async function insertPromoCodeD1(db, promo) {
  const cleanCode = promo.code.trim().toUpperCase();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const maxUsage = Number(promo.maxUsage) || 0;
  const discountValue = Number(promo.discountValue) || 0;
  const discountType = promo.discountType || "nominal";
  const description = promo.description ? promo.description.trim() : null;
  await db.prepare(`
      INSERT INTO PromoCodes (code, discountType, discountValue, description, maxUsage, usageCount, active, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, 1, ?)
    `).bind(cleanCode, discountType, discountValue, description, maxUsage, createdAt).run();
  const created = await getPromoCodeByCodeD1(db, cleanCode);
  return created || {
    code: cleanCode,
    discountType,
    discountValue,
    description: description || void 0,
    maxUsage,
    usageCount: 0,
    active: 1,
    createdAt
  };
}
async function togglePromoCodeD1(db, id2, active) {
  await db.prepare("UPDATE PromoCodes SET active = ? WHERE id = ?").bind(active ? 1 : 0, id2).run();
}
async function deletePromoCodeD1(db, id2) {
  await db.prepare("DELETE FROM PromoCodes WHERE id = ?").bind(id2).run();
}
async function incrementPromoUsageD1(db, code) {
  await db.prepare("UPDATE PromoCodes SET usageCount = usageCount + 1 WHERE UPPER(code) = ?").bind(code.trim().toUpperCase()).run();
}
function parseServerUserAgent(ua) {
  if (!ua) return null;
  let os = "";
  if (/Android/i.test(ua)) {
    const verMatch = ua.match(/Android\s+([0-9.]+)/i);
    const modelMatch = ua.match(/Android\s+[0-9.]+;\s*([^;)]+?)(?:\s+Build\/|\))/i);
    const ver = verMatch ? `Android ${verMatch[1]}` : "Android";
    const rawModel = modelMatch?.[1]?.trim();
    const model = rawModel && rawModel !== "K" ? rawModel : "HP Android";
    os = `${model} (${ver})`;
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const isIpad = /iPad/i.test(ua);
    const verMatch = ua.match(/OS\s+([0-9_]+)/i);
    const ver = verMatch ? `iOS ${verMatch[1].replace(/_/g, ".")}` : "iOS";
    os = `${isIpad ? "iPad" : "iPhone"} (${ver})`;
  } else if (/Windows NT/i.test(ua)) {
    os = "PC / Laptop Windows";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "Mac / macOS";
  } else if (/Linux/i.test(ua)) {
    os = "Perangkat Linux";
  } else {
    return null;
  }
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  return `${os} \u2022 ${browser}`;
}
function extractRequestTelemetry(request, clientDeviceModel) {
  const cleanClientModel = typeof clientDeviceModel === "string" && clientDeviceModel.trim().length > 0 ? clientDeviceModel.trim().slice(0, 140) : null;
  if (!request) {
    return { deviceModel: cleanClientModel, location: null, ipAddress: null };
  }
  const headers = request.headers;
  const getHeader = /* @__PURE__ */ __name((name) => {
    if (!headers) return "";
    if (typeof headers.get === "function") return headers.get(name) || "";
    return headers[name] || headers[name.toLowerCase()] || "";
  }, "getHeader");
  const ua = getHeader("user-agent");
  const rawIp = getHeader("cf-connecting-ip") || getHeader("x-forwarded-for");
  const ipAddress = rawIp ? rawIp.split(",")[0].trim().slice(0, 64) : null;
  const cf = request.cf || {};
  const city = (cf.city || getHeader("cf-ipcity") || "").trim();
  const region = (cf.region || getHeader("cf-region") || "").trim();
  const countryCode = (cf.country || getHeader("cf-ipcountry") || "").trim().toUpperCase();
  const country = countryCode === "ID" ? "Indonesia" : countryCode;
  const locParts = [city, region && region !== city ? region : "", country].filter(Boolean);
  const location = locParts.length > 0 ? locParts.join(", ").slice(0, 120) : null;
  const deviceModel = cleanClientModel || parseServerUserAgent(ua);
  return { deviceModel, location, ipAddress };
}
async function upsertDeviceTelemetryD1(db, data) {
  if (!data.licenseKey || !data.deviceId) return;
  const now = data.lastSeenAt || (/* @__PURE__ */ new Date()).toISOString();
  try {
    await db.prepare(`
      INSERT INTO DeviceTelemetry (licenseKey, deviceId, deviceModel, location, ipAddress, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(licenseKey) DO UPDATE SET
        deviceId = excluded.deviceId,
        deviceModel = COALESCE(excluded.deviceModel, DeviceTelemetry.deviceModel),
        location = COALESCE(excluded.location, DeviceTelemetry.location),
        ipAddress = COALESCE(excluded.ipAddress, DeviceTelemetry.ipAddress),
        lastSeenAt = excluded.lastSeenAt
    `).bind(
      data.licenseKey.trim().toUpperCase(),
      data.deviceId.trim(),
      data.deviceModel || null,
      data.location || null,
      data.ipAddress || null,
      now
    ).run();
  } catch (_) {
  }
}
var fallbackD1;
var init_d1 = __esm({
  "src/lib/server/d1.ts"() {
    "use strict";
    fallbackD1 = null;
    __name(createD1NodeAdapter, "createD1NodeAdapter");
    __name(getD1, "getD1");
    __name(initD1Tables, "initD1Tables");
    __name(insertOrderD1, "insertOrderD1");
    __name(getAllOrdersD1, "getAllOrdersD1");
    __name(getOrderByIdD1, "getOrderByIdD1");
    __name(updateOrderProofD1, "updateOrderProofD1");
    __name(updateOrderPaymentLinkD1, "updateOrderPaymentLinkD1");
    __name(cancelOrderD1, "cancelOrderD1");
    __name(archiveOrderD1, "archiveOrderD1");
    __name(deleteTestOrderD1, "deleteTestOrderD1");
    __name(getAllLicensesD1, "getAllLicensesD1");
    __name(getLicenseD1, "getLicenseD1");
    __name(unbindLicenseDeviceD1, "unbindLicenseDeviceD1");
    __name(revokeLicenseD1, "revokeLicenseD1");
    __name(bindLicenseToDeviceD1, "bindLicenseToDeviceD1");
    __name(createSessionD1, "createSessionD1");
    __name(isSessionValidD1, "isSessionValidD1");
    __name(revokeSessionD1, "revokeSessionD1");
    __name(checkAuthLockD1, "checkAuthLockD1");
    __name(recordFailedAuthD1, "recordFailedAuthD1");
    __name(resetAuthAttemptsD1, "resetAuthAttemptsD1");
    __name(getMetricsD1, "getMetricsD1");
    __name(resetDatabaseCleanD1, "resetDatabaseCleanD1");
    __name(insertTesterLicenseD1, "insertTesterLicenseD1");
    __name(getAllTesterLicensesD1, "getAllTesterLicensesD1");
    __name(getTesterLicenseD1, "getTesterLicenseD1");
    __name(revokeTesterLicenseD1, "revokeTesterLicenseD1");
    __name(extendTesterLicenseD1, "extendTesterLicenseD1");
    __name(unbindTesterLicenseDeviceD1, "unbindTesterLicenseDeviceD1");
    __name(bindTesterLicenseToDeviceD1, "bindTesterLicenseToDeviceD1");
    __name(insertBetaRegistrationD1, "insertBetaRegistrationD1");
    __name(normalizeBetaRow, "normalizeBetaRow");
    __name(getAllBetaRegistrationsD1, "getAllBetaRegistrationsD1");
    __name(getBetaRegistrationByIdD1, "getBetaRegistrationByIdD1");
    __name(getBetaRegistrationByLicenseKeyD1, "getBetaRegistrationByLicenseKeyD1");
    __name(getBetaRegistrationByWhatsappD1, "getBetaRegistrationByWhatsappD1");
    __name(approveBetaRegistrationD1, "approveBetaRegistrationD1");
    __name(rejectBetaRegistrationD1, "rejectBetaRegistrationD1");
    __name(revokeBetaRegistrationD1, "revokeBetaRegistrationD1");
    __name(unbindBetaRegistrationDeviceD1, "unbindBetaRegistrationDeviceD1");
    __name(bindBetaRegistrationToDeviceD1, "bindBetaRegistrationToDeviceD1");
    __name(extendBetaRegistrationTrialD1, "extendBetaRegistrationTrialD1");
    __name(calculatePromoDiscount, "calculatePromoDiscount");
    __name(getPromoCodeByCodeD1, "getPromoCodeByCodeD1");
    __name(getAllPromoCodesD1, "getAllPromoCodesD1");
    __name(insertPromoCodeD1, "insertPromoCodeD1");
    __name(togglePromoCodeD1, "togglePromoCodeD1");
    __name(deletePromoCodeD1, "deletePromoCodeD1");
    __name(incrementPromoUsageD1, "incrementPromoUsageD1");
    __name(parseServerUserAgent, "parseServerUserAgent");
    __name(extractRequestTelemetry, "extractRequestTelemetry");
    __name(upsertDeviceTelemetryD1, "upsertDeviceTelemetryD1");
  }
});

// src/lib/server/sakunotaServer.ts
var sakunotaServer_exports = {};
__export(sakunotaServer_exports, {
  activateLicenseOnDevice: () => activateLicenseOnDevice,
  approveBetaRegistration: () => approveBetaRegistration,
  archiveOwnerOrder: () => archiveOwnerOrder,
  authenticateOwner: () => authenticateOwner,
  cancelOwnerOrder: () => cancelOwnerOrder,
  checkCustomerOrderStatus: () => checkCustomerOrderStatus,
  convertBetaTrialToPaid: () => convertBetaTrialToPaid,
  createCustomerOrder: () => createCustomerOrder,
  createOwnerPromo: () => createOwnerPromo,
  createTesterLicense: () => createTesterLicense,
  deleteOwnerPromo: () => deleteOwnerPromo,
  deleteOwnerTestOrder: () => deleteOwnerTestOrder,
  extendBetaTrial: () => extendBetaTrial,
  extendTesterLicense: () => extendTesterLicense,
  extractBearerToken: () => extractBearerToken,
  generateGenuineLicenseKey: () => generateGenuineLicenseKey,
  getD1: () => getD1,
  getOwnerMetrics: () => getOwnerMetrics,
  getOwnerPassword: () => getOwnerPassword,
  getOwnerSalt: () => getOwnerSalt,
  getOwnerUsername: () => getOwnerUsername,
  getServerSecret: () => getServerSecret,
  hashPassword: () => hashPassword,
  initD1Tables: () => initD1Tables,
  listBetaRegistrations: () => listBetaRegistrations,
  listOwnerLicenses: () => listOwnerLicenses,
  listOwnerOrders: () => listOwnerOrders,
  listOwnerPromos: () => listOwnerPromos,
  listTesterLicenses: () => listTesterLicenses,
  registerBetaAccount: () => registerBetaAccount,
  rejectBetaRegistration: () => rejectBetaRegistration,
  resetDatabaseCleanD1: () => resetDatabaseCleanD1,
  revokeBetaTrial: () => revokeBetaTrial,
  revokeOwnerLicense: () => revokeOwnerLicense,
  revokeOwnerSession: () => revokeOwnerSession,
  revokeTesterLicense: () => revokeTesterLicense,
  signDeviceActivation: () => signDeviceActivation,
  signLicenseKey: () => signLicenseKey,
  signOwnerSession: () => signOwnerSession,
  syncMidtransOrderStatus: () => syncMidtransOrderStatus,
  toggleOwnerPromo: () => toggleOwnerPromo,
  unbindBetaTrialDevice: () => unbindBetaTrialDevice,
  unbindOwnerLicense: () => unbindOwnerLicense,
  unbindTesterLicense: () => unbindTesterLicense,
  updateOrderPaymentLinkD1: () => updateOrderPaymentLinkD1,
  updateOrderProofD1: () => updateOrderProofD1,
  validatePromoCode: () => validatePromoCode,
  verifyDeviceActivationToken: () => verifyDeviceActivationToken,
  verifyDeviceLicense: () => verifyDeviceLicense,
  verifyOrderAndIssueLicense: () => verifyOrderAndIssueLicense,
  verifyOwnerSession: () => verifyOwnerSession
});
import crypto2 from "node:crypto";
function getServerSecret() {
  const secret = process.env.SAKUNOTA_SERVER_SECRET;
  if (!secret) {
    throw new Error("Configuration Error: SAKUNOTA_SERVER_SECRET is not configured on server.");
  }
  return secret.trim();
}
function getOwnerSalt() {
  const salt = process.env.SAKUNOTA_OWNER_SALT;
  if (!salt) {
    throw new Error("Configuration Error: SAKUNOTA_OWNER_SALT is not configured on server.");
  }
  return salt.trim();
}
function getOwnerUsername() {
  const user = process.env.SAKUNOTA_OWNER_USERNAME;
  if (!user) {
    throw new Error("Configuration Error: SAKUNOTA_OWNER_USERNAME is not configured on server.");
  }
  return user.trim();
}
function getOwnerPassword() {
  const pass = process.env.SAKUNOTA_OWNER_PASSWORD;
  if (!pass) {
    throw new Error("Configuration Error: SAKUNOTA_OWNER_PASSWORD is not configured on server.");
  }
  return pass.trim();
}
function hashPassword(pass) {
  return crypto2.createHmac("sha256", getOwnerSalt()).update(pass).digest("hex");
}
function extractBearerToken(authHeader) {
  if (!authHeader) return "";
  const clean = authHeader.trim();
  const match = clean.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return clean.replace(/^Bearer\s*/i, "").trim();
}
function isD1(arg) {
  return arg && typeof arg === "object" && typeof arg.prepare === "function";
}
function signLicenseKey(licenseKey) {
  return crypto2.createHmac("sha256", getServerSecret()).update(`license:${licenseKey}`).digest("hex").slice(0, 8);
}
function generateGenuineLicenseKey(orderId) {
  const hash = crypto2.createHmac("sha256", getServerSecret()).update(`order:${orderId}`).digest("hex");
  const p1 = hash.slice(0, 4).toUpperCase();
  const p2 = hash.slice(4, 8).toUpperCase();
  const p3 = hash.slice(8, 12).toUpperCase();
  return `SN-${p1}-${p2}-${p3}`;
}
function signOwnerSession(username, sessionId) {
  const expiry = Date.now() + 24 * 60 * 60 * 1e3;
  const payload = `${username}:${sessionId}:${expiry}`;
  const sig = crypto2.createHmac("sha256", getServerSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}
async function verifyOwnerSession(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const token = isD1(dbOrToken) ? maybeToken : dbOrToken;
  if (!token) return { valid: false, error: "Token sesi tidak ditemukan. Silakan login terlebih dahulu." };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [username, sessionId, expiryStr, sig] = raw.split(":");
    if (!username || !sessionId || !expiryStr || !sig) {
      return { valid: false, error: "Format token tidak valid." };
    }
    const expectedSig = crypto2.createHmac("sha256", getServerSecret()).update(`${username}:${sessionId}:${expiryStr}`).digest("hex");
    if (sig !== expectedSig) {
      return { valid: false, error: "Tanda tangan token tidak sah." };
    }
    if (Date.now() > Number(expiryStr)) {
      return { valid: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }
    const valid = await isSessionValidD1(db, sessionId);
    if (!valid) {
      return { valid: false, error: "Sesi telah dicabut (logged out) atau kedaluwarsa. Silakan login kembali." };
    }
    return { valid: true, username, sessionId };
  } catch {
    return { valid: false, error: "Gagal memverifikasi token sesi." };
  }
}
async function revokeOwnerSession(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const token = isD1(dbOrToken) ? maybeToken : dbOrToken;
  if (!token) return { success: false, error: "Token tidak diberikan." };
  try {
    const auth = await verifyOwnerSession(db, token);
    if (!auth.valid) return { success: false, error: "Sesi Owner tidak sah." };
    const sessionId = auth.sessionId;
    if (sessionId) {
      await revokeSessionD1(db, sessionId);
      return { success: true };
    }
    return { success: false, error: "Session ID tidak ditemukan." };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
function signDeviceActivation(licenseKey, deviceId, licenseType = "berbayar", expiresAt = null) {
  const exp = expiresAt || "0";
  const payload = `${licenseKey}:${deviceId}:${licenseType}:${exp}`;
  const sig = crypto2.createHmac("sha256", getServerSecret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}
function verifyDeviceActivationToken(token) {
  if (!token) return { valid: false, error: "Token tidak ada" };
  try {
    const parts = token.split(":");
    if (parts.length === 3) {
      const [key, devId, sig] = parts;
      const expectedSig = crypto2.createHmac("sha256", getServerSecret()).update(`${key}:${devId}`).digest("hex");
      if (sig !== expectedSig) return { valid: false, error: "Tanda tangan token tidak sah" };
      return { valid: true, licenseKey: key, deviceId: devId, licenseType: "berbayar", expiresAt: null, isExpired: false };
    }
    if (parts.length >= 5) {
      const [key, devId, type] = parts;
      const exp = parts.slice(3, -1).join(":");
      const sig = parts[parts.length - 1];
      if (!["berbayar", "trial", "tester"].includes(type) || exp !== "0" && !Number.isFinite(Date.parse(exp))) return { valid: false, error: "Metadata aktivasi tidak valid" };
      const expectedSig = crypto2.createHmac("sha256", getServerSecret()).update(`${key}:${devId}:${type}:${exp}`).digest("hex");
      if (sig !== expectedSig) return { valid: false, error: "Tanda tangan token tidak sah" };
      const expiresAt = exp === "0" ? null : exp;
      const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
      return { valid: true, licenseKey: key, deviceId: devId, licenseType: type, expiresAt, isExpired };
    }
    return { valid: false, error: "Format token tidak valid" };
  } catch {
    return { valid: false, error: "Gagal memverifikasi token" };
  }
}
async function authenticateOwner(dbOrUser, userOrPass, passOrIp, maybeIp) {
  const db = isD1(dbOrUser) ? dbOrUser : getD1();
  const usernameInput = (isD1(dbOrUser) ? userOrPass : dbOrUser) || "";
  const passwordInput = (isD1(dbOrUser) ? passOrIp : userOrPass) || "";
  const clientIp = (isD1(dbOrUser) ? maybeIp : passOrIp) || "127.0.0.1";
  const lock = await checkAuthLockD1(db, clientIp);
  if (lock.locked) {
    return {
      success: false,
      error: `Akses diblokir sementara karena terlalu banyak percobaan gagal. Silakan coba lagi dalam ${lock.remainingSec} detik.`,
      remainingLockSec: lock.remainingSec
    };
  }
  let ownerUser;
  let ownerPass;
  try {
    ownerUser = getOwnerUsername();
    ownerPass = getOwnerPassword();
  } catch (err) {
    return {
      success: false,
      error: "Konfigurasi autentikasi server belum disetel oleh Administrator."
    };
  }
  const isUserValid = usernameInput.trim().toLowerCase() === ownerUser.toLowerCase();
  const inputHash = hashPassword(passwordInput);
  const candidatePasswords = [ownerPass];
  let isPassValid = false;
  for (const candidate of candidatePasswords) {
    try {
      const targetHash = hashPassword(candidate);
      const bufA = Buffer.from(inputHash, "hex");
      const bufB = Buffer.from(targetHash, "hex");
      if (bufA.length === bufB.length && crypto2.timingSafeEqual(bufA, bufB)) {
        isPassValid = true;
        break;
      }
    } catch {
    }
  }
  if (!isUserValid || !isPassValid) {
    const failStatus = await recordFailedAuthD1(db, clientIp);
    if (failStatus.locked) {
      return {
        success: false,
        error: `Akses diblokir karena 5 kali percobaan gagal. Terkunci selama ${failStatus.remainingSec} detik.`,
        remainingLockSec: failStatus.remainingSec
      };
    }
    return {
      success: false,
      error: "Username atau Password salah! Akses khusus Owner."
    };
  }
  await resetAuthAttemptsD1(db, clientIp);
  const sessionId = crypto2.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
  await createSessionD1(db, sessionId, ownerUser, expiresAt);
  const token = signOwnerSession(ownerUser, sessionId);
  return { success: true, token };
}
async function createCustomerOrder(dbOrData, maybeData) {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : dbOrData) || {};
  let orderId = "";
  let isUnique = false;
  let attempts = 0;
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  while (!isUnique && attempts < 10) {
    attempts++;
    const timePart = Date.now().toString(36).toUpperCase().slice(-4);
    const randPart = crypto2.randomBytes(2).toString("hex").toUpperCase();
    orderId = `SN-${year}-${timePart}${randPart}`;
    const existing = await getOrderByIdD1(db, orderId);
    if (!existing) {
      isUnique = true;
    }
  }
  const randomCode2 = crypto2.randomBytes(3).toString("hex").toUpperCase();
  const accessCode = `KOD-${randomCode2}`;
  let finalAmount = 5e4;
  let discountAmount = 0;
  let appliedPromoCode = void 0;
  if (data.promoCode && typeof data.promoCode === "string") {
    const cleanCode = data.promoCode.trim().toUpperCase();
    if (cleanCode) {
      const promo = await getPromoCodeByCodeD1(db, cleanCode);
      if (promo && promo.active === 1) {
        const quotaExceeded = promo.maxUsage && promo.maxUsage > 0 && promo.usageCount >= promo.maxUsage;
        if (!quotaExceeded) {
          const calc = calculatePromoDiscount(5e4, promo.discountType, promo.discountValue);
          finalAmount = calc.finalAmount;
          discountAmount = calc.discountAmount;
          appliedPromoCode = promo.code;
          try {
            await incrementPromoUsageD1(db, promo.code);
          } catch (_) {
          }
        }
      }
    }
  }
  const newOrder = {
    orderId,
    accessCode,
    buyerName: (data.buyerName || "").trim(),
    businessName: (data.businessName || "").trim(),
    whatsapp: (data.whatsapp || "").trim(),
    email: data.email?.trim() || void 0,
    npwp: data.npwp?.trim() || void 0,
    amount: finalAmount,
    originalAmount: 5e4,
    discountAmount,
    promoCode: appliedPromoCode,
    paymentMethod: "Transfer Bank BCA",
    bankAccount: "2582118451 a.n. REZA RESTU RENGGA HARDIANTO",
    transferProofName: data.transferProofName || void 0,
    transferProofData: data.transferProofData || void 0,
    status: "menunggu_verifikasi",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await insertOrderD1(db, newOrder);
  return { success: true, order: newOrder };
}
async function syncMidtransOrderStatus(db, orderId, serverKey) {
  const order = await getOrderByIdD1(db, orderId);
  if (!order) {
    return { success: false, error: "Pesanan tidak ditemukan." };
  }
  if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
    return { success: true, order, updated: false };
  }
  const key = serverKey || process.env.MIDTRANS_SERVER_KEY || "";
  if (!key) {
    return { success: true, order, updated: false, error: "MIDTRANS_SERVER_KEY belum dikonfigurasi." };
  }
  try {
    const isSandbox = key.startsWith("SB-");
    const midtransUrl = isSandbox ? `https://api.sandbox.midtrans.com/v2/${orderId}/status` : `https://api.midtrans.com/v2/${orderId}/status`;
    const authHeader = "Basic " + (typeof btoa !== "undefined" ? btoa(key + ":") : Buffer.from(key + ":").toString("base64"));
    const resp = await fetch(midtransUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      }
    });
    if (!resp.ok) {
      return { success: true, order, updated: false };
    }
    const midtransData = await resp.json();
    const { status_code, transaction_status, fraud_status } = midtransData || {};
    const isSuccess = status_code === "200" && (transaction_status === "settlement" || transaction_status === "capture" && fraud_status === "accept");
    if (isSuccess) {
      const licenseKey = generateGenuineLicenseKey(orderId);
      const verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      const stmtOrder = db.prepare(`
        UPDATE CustomerOrders 
        SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
        WHERE orderId = ?
      `).bind(licenseKey, verifiedAt, orderId);
      const stmtLicense = db.prepare(`
        INSERT OR IGNORE INTO Licenses (
          licenseKey, orderId, businessName, issuedAt, signature
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(licenseKey, orderId, order.businessName, verifiedAt, signLicenseKey(licenseKey));
      await db.batch([stmtOrder, stmtLicense]);
      const refreshed = await getOrderByIdD1(db, orderId);
      return { success: true, order: refreshed || order, updated: true };
    }
    if (["cancel", "deny", "expire"].includes(transaction_status)) {
      await cancelOrderD1(db, orderId);
      const refreshed = await getOrderByIdD1(db, orderId);
      return { success: true, order: refreshed || order, updated: true };
    }
    return { success: true, order, updated: false };
  } catch (err) {
    return { success: true, order, updated: false, error: err.message };
  }
}
async function checkCustomerOrderStatus(dbOrOrderId, orderIdOrCode, maybeAccessCode, serverKey) {
  const db = isD1(dbOrOrderId) ? dbOrOrderId : getD1();
  const orderId = (isD1(dbOrOrderId) ? orderIdOrCode : dbOrOrderId) || "";
  const accessCode = (isD1(dbOrOrderId) ? maybeAccessCode : orderIdOrCode) || "";
  let order = await getOrderByIdD1(db, orderId.trim());
  if (!order) {
    return { success: false, error: "Pesanan dengan nomor tersebut tidak ditemukan." };
  }
  const cleanInput = accessCode.trim().toUpperCase();
  const cleanOrderAccess = (order.accessCode || "").trim().toUpperCase();
  const inputDigits = accessCode.replace(/\D/g, "");
  const orderDigits = (order.whatsapp || "").replace(/\D/g, "");
  const phoneMatches = inputDigits.length >= 8 && (orderDigits.endsWith(inputDigits) || inputDigits.endsWith(orderDigits));
  if (cleanOrderAccess !== cleanInput && !phoneMatches) {
    return {
      success: false,
      error: "Kode akses tidak cocok dengan pesanan ini. Masukkan Kode Akses Rahasia (KOD-XXXX) atau nomor WhatsApp yang Anda gunakan saat memesan."
    };
  }
  if (order.status === "menunggu_verifikasi" && serverKey) {
    const syncRes = await syncMidtransOrderStatus(db, orderId.trim(), serverKey);
    if (syncRes.updated && syncRes.order) {
      order = syncRes.order;
    }
  }
  return { success: true, order };
}
async function listOwnerOrders(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : dbOrToken;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  const list = await getAllOrdersD1(db);
  return { success: true, orders: list };
}
async function verifyOrderAndIssueLicense(dbOrToken, tokenOrOrderId, maybeOrderId) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  let ownerToken = null;
  let orderId = "";
  if (isD1(dbOrToken)) {
    if (maybeOrderId) {
      ownerToken = tokenOrOrderId;
      orderId = maybeOrderId;
    } else {
      orderId = tokenOrOrderId || "";
    }
  } else {
    ownerToken = dbOrToken;
    orderId = tokenOrOrderId || "";
  }
  if (ownerToken) {
    const auth = await verifyOwnerSession(db, ownerToken);
    if (!auth.valid) {
      return {
        success: false,
        error: auth.error || "Akses ditolak. Hanya Owner yang dapat memverifikasi pembayaran."
      };
    }
  }
  const order = await getOrderByIdD1(db, orderId);
  if (!order) {
    return { success: false, error: "Pesanan tidak ditemukan." };
  }
  if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
    return { success: true, order, licenseKey: order.licenseKey };
  }
  const licenseKey = generateGenuineLicenseKey(orderId);
  const verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
  const stmtOrder = db.prepare(`
    UPDATE CustomerOrders 
    SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
    WHERE orderId = ?
  `).bind(licenseKey, verifiedAt, orderId);
  const stmtLicense = db.prepare(`
    INSERT OR IGNORE INTO Licenses (
      licenseKey, orderId, businessName, issuedAt, signature, licenseType
    ) VALUES (?, ?, ?, ?, ?, 'berbayar')
  `).bind(licenseKey, orderId, order.businessName, verifiedAt, signLicenseKey(licenseKey));
  await db.batch([stmtOrder, stmtLicense]);
  const refreshed = await getOrderByIdD1(db, orderId);
  return { success: true, order: refreshed || order, licenseKey };
}
async function activateLicenseOnDevice(dbOrData, maybeData) {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : dbOrData) || {};
  const key = (data.licenseKey || "").trim().toUpperCase();
  const devId = (data.deviceId || "").trim();
  const lic = await getLicenseD1(db, key);
  if (lic) {
    if (lic.revoked === 1) {
      return {
        success: false,
        error: "Lisensi resmi ini telah dicabut oleh Owner SakuNota.",
        status: 403
      };
    }
    if (lic.boundDeviceId && lic.boundDeviceId !== devId) {
      return {
        success: false,
        error: `Lisensi ini sudah aktif pada perangkat lain (${lic.deviceName || "Perangkat Kasir Utama"}). Hubungi dukungan jika ingin memindahkan perangkat.`,
        status: 409
        // Conflict / Device binding rejection
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const deviceName = data.deviceName || "Perangkat Kasir";
    const activatedAt = lic.activatedAt || now;
    if (!await bindLicenseToDeviceD1(db, key, devId, deviceName, activatedAt)) return { success: false, status: 409, error: "Lisensi sudah diaktifkan oleh perangkat lain." };
    const token = signDeviceActivation(key, devId, "berbayar", null);
    return {
      success: true,
      activationToken: token,
      activatedAt,
      expiresAt: null,
      licenseType: "berbayar",
      businessName: lic.businessName,
      status: 200
    };
  }
  const testerLic = await getTesterLicenseD1(db, key);
  if (testerLic) {
    if (testerLic.revoked === 1) {
      return {
        success: false,
        error: "Lisensi tester ini telah dicabut oleh Owner SakuNota.",
        status: 403
      };
    }
    if (testerLic.expiresAt && new Date(testerLic.expiresAt).getTime() < Date.now()) {
      return {
        success: false,
        error: "Masa berlaku lisensi tester ini telah berakhir.",
        status: 403
      };
    }
    if (testerLic.boundDeviceId && testerLic.boundDeviceId !== devId) {
      return {
        success: false,
        error: `Lisensi tester ini sudah aktif pada perangkat lain (${testerLic.deviceName || "Perangkat Tester"}). Hubungi Owner untuk melepas perangkat.`,
        status: 409
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const deviceName = data.deviceName || "Perangkat Kasir Tester";
    const activatedAt = testerLic.activatedAt || now;
    if (!await bindTesterLicenseToDeviceD1(db, key, devId, deviceName, activatedAt)) return { success: false, status: 409, error: "Lisensi tester sudah terikat pada perangkat lain." };
    const token = signDeviceActivation(key, devId, "tester", testerLic.expiresAt || null);
    return {
      success: true,
      activationToken: token,
      activatedAt,
      expiresAt: testerLic.expiresAt || null,
      licenseType: "tester",
      businessName: testerLic.recipientName,
      status: 200
    };
  }
  const betaReg = await getBetaRegistrationByLicenseKeyD1(db, key);
  if (betaReg) {
    if (betaReg.status === "pending") {
      return {
        success: false,
        error: "Pendaftaran Closed Beta Anda masih menunggu persetujuan Owner SakuNota. Anda akan dihubungi via WhatsApp setelah disetujui.",
        status: 403
      };
    }
    if (betaReg.status === "ditolak") {
      return {
        success: false,
        error: `Pendaftaran Beta Anda tidak disetujui${betaReg.rejectionReason ? `: ${betaReg.rejectionReason}` : ""}.`,
        status: 403
      };
    }
    if (betaReg.status === "dicabut") {
      return {
        success: false,
        error: "Akses Trial Beta ini telah dicabut oleh Owner SakuNota.",
        status: 403
      };
    }
    if (betaReg.expiresAt && new Date(betaReg.expiresAt).getTime() < Date.now()) {
      return {
        success: false,
        error: "Masa uji coba 7 hari telah berakhir. Silakan beli lisensi resmi SakuNota untuk melanjutkan berjualan.",
        status: 403
      };
    }
    if (betaReg.boundDeviceId && betaReg.boundDeviceId !== devId) {
      return {
        success: false,
        error: `Akses trial ini sudah aktif pada perangkat lain (${betaReg.deviceName || "Perangkat Kasir Beta"}). SakuNota memberlakukan batas 1 perangkat untuk trial 7 hari. Hubungi Owner untuk memindahkan perangkat.`,
        status: 409
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const deviceName = data.deviceName || "Perangkat Kasir Beta";
    const activatedAt = betaReg.activatedAt || now;
    const durationDays = betaReg.durationDays || 7;
    const expiresAt = betaReg.expiresAt || new Date(new Date(activatedAt).getTime() + durationDays * 24 * 60 * 60 * 1e3).toISOString();
    if (!await bindBetaRegistrationToDeviceD1(db, key, devId, deviceName, activatedAt, expiresAt)) return { success: false, status: 409, error: "Trial sudah terikat pada perangkat lain." };
    const token = signDeviceActivation(key, devId, "trial", expiresAt);
    return {
      success: true,
      activationToken: token,
      activatedAt,
      expiresAt,
      licenseType: "trial",
      businessName: betaReg.businessName,
      status: 200
    };
  }
  return {
    success: false,
    error: "Kode lisensi tidak valid atau belum terdaftar di sistem SakuNota.",
    status: 404
  };
}
async function createTesterLicense(dbOrToken, tokenOrData, maybeData) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrData : dbOrToken;
  const data = (isD1(dbOrToken) ? maybeData : tokenOrData) || {};
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  if (!data.recipientName || !data.whatsapp) {
    return { success: false, error: "Nama penerima dan nomor WhatsApp wajib diisi." };
  }
  const created = await insertTesterLicenseD1(db, {
    recipientName: data.recipientName,
    whatsapp: data.whatsapp,
    durationDays: Number(data.durationDays) || 0,
    notes: data.notes
  });
  return { success: true, testerLicense: created };
}
async function listTesterLicenses(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : dbOrToken;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  const list = await getAllTesterLicensesD1(db);
  return { success: true, testerLicenses: list };
}
async function revokeTesterLicense(dbOrToken, tokenOrKey, maybeKey) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  await revokeTesterLicenseD1(db, licenseKey);
  return { success: true };
}
async function unbindTesterLicense(dbOrToken, tokenOrKey, maybeKey) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  await unbindTesterLicenseDeviceD1(db, licenseKey);
  return { success: true };
}
async function extendTesterLicense(dbOrToken, tokenOrKey, maybeKeyOrDays, maybeDaysOrReason, maybeReason) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKeyOrDays : tokenOrKey) || "";
  const extraDays = Number(isD1(dbOrToken) ? maybeDaysOrReason : maybeKeyOrDays) || 7;
  const reason = (isD1(dbOrToken) ? maybeReason : maybeDaysOrReason) || "Perpanjangan lisensi tester";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  const tester = await getTesterLicenseD1(db, licenseKey);
  if (!tester) {
    return { success: false, error: "Lisensi tester tidak ditemukan." };
  }
  const currentBase = tester.expiresAt ? new Date(tester.expiresAt).getTime() : Date.now();
  const baseTime = currentBase > Date.now() ? currentBase : Date.now();
  const newExpiresAt = new Date(baseTime + extraDays * 24 * 60 * 60 * 1e3).toISOString();
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const updatedNotes = `${tester.notes ? tester.notes + " | " : ""}[${dateStr}] +${extraDays} hari: ${reason}`;
  const newDuration = (tester.durationDays || 0) + extraDays;
  await extendTesterLicenseD1(db, licenseKey, extraDays, newExpiresAt, updatedNotes);
  return { success: true, newExpiresAt, durationDays: newDuration };
}
async function getOwnerMetrics(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : dbOrToken;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak." };
  }
  const metrics = await getMetricsD1(db);
  return { success: true, metrics };
}
async function cancelOwnerOrder(dbOrToken, tokenOrId, maybeId) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const orderId = (isD1(dbOrToken) ? maybeId : tokenOrId) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await cancelOrderD1(db, orderId);
  return { success: true };
}
async function archiveOwnerOrder(dbOrToken, tokenOrId, maybeId) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const orderId = (isD1(dbOrToken) ? maybeId : tokenOrId) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await archiveOrderD1(db, orderId);
  return { success: true };
}
async function deleteOwnerTestOrder(dbOrToken, tokenOrId, maybeId, maybeNote, maybePassword) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const orderId = (isD1(dbOrToken) ? maybeId : tokenOrId) || "";
  const passwordConfirm = (isD1(dbOrToken) ? maybePassword : maybeNote) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  if (passwordConfirm) {
    try {
      const inputHash = hashPassword(passwordConfirm);
      const candidatePasswords = [getOwnerPassword()];
      let isPassValid = false;
      for (const candidate of candidatePasswords) {
        try {
          const targetHash = hashPassword(candidate);
          const bufA = Buffer.from(inputHash, "hex");
          const bufB = Buffer.from(targetHash, "hex");
          if (bufA.length === bufB.length && crypto2.timingSafeEqual(bufA, bufB)) {
            isPassValid = true;
            break;
          }
        } catch {
        }
      }
      if (!isPassValid) {
        return { success: false, error: "Konfirmasi sandi Owner salah." };
      }
    } catch {
      return { success: false, error: "Konfigurasi sandi server belum disetel." };
    }
  }
  return await deleteTestOrderD1(db, orderId);
}
async function listOwnerLicenses(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : dbOrToken;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  const licenses = await getAllLicensesD1(db);
  return { success: true, licenses };
}
async function unbindOwnerLicense(dbOrToken, tokenOrKey, maybeKey) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await unbindLicenseDeviceD1(db, licenseKey);
  return { success: true };
}
async function revokeOwnerLicense(dbOrToken, tokenOrKey, maybeKey) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await revokeLicenseD1(db, licenseKey);
  return { success: true };
}
async function registerBetaAccount(dbOrData, maybeData) {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : dbOrData) || {};
  if (data.honeypot && data.honeypot.trim().length > 0) {
    return { success: false, error: "Deteksi bot aktif. Permintaan ditolak.", status: 400 };
  }
  const ownerName = (data.ownerName || "").trim();
  const businessName = (data.businessName || "").trim();
  const rawWhatsapp = (data.whatsapp || "").trim();
  const cleanPhone = rawWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "");
  if (!ownerName || !businessName || !cleanPhone) {
    return { success: false, error: "Nama Pemilik, Nama Usaha, dan Nomor WhatsApp wajib diisi." };
  }
  if (cleanPhone.length < 9) {
    return { success: false, error: "Nomor WhatsApp tidak valid." };
  }
  const existing = await getBetaRegistrationByWhatsappD1(db, cleanPhone) || await getBetaRegistrationByWhatsappD1(db, rawWhatsapp);
  if (existing && existing.status !== "ditolak") {
    return {
      success: false,
      error: "Nomor WhatsApp ini sudah pernah didaftarkan. Gunakan bukti pendaftaran Anda atau hubungi dukungan resmi."
    };
  }
  const registrationId = `REG-${crypto2.randomBytes(24).toString("hex").toUpperCase()}`;
  const reg = {
    id: registrationId,
    registrationId,
    trialLicenseKey: null,
    ownerName,
    businessName,
    whatsapp: cleanPhone,
    email: data.email?.trim() || void 0,
    status: "pending",
    notes: data.notes?.trim() || void 0,
    durationDays: 7,
    registeredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await insertBetaRegistrationD1(db, reg);
  return { success: true, registration: reg };
}
async function listBetaRegistrations(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : dbOrToken;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  const registrations = await getAllBetaRegistrationsD1(db);
  return { success: true, registrations };
}
async function approveBetaRegistration(dbOrToken, tokenOrId, maybeId) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  let ownerToken = null;
  let regId = "";
  if (isD1(dbOrToken)) {
    if (maybeId) {
      ownerToken = tokenOrId;
      regId = maybeId;
    } else {
      regId = tokenOrId || "";
    }
  } else {
    ownerToken = dbOrToken;
    regId = tokenOrId || "";
  }
  if (ownerToken) {
    const auth = await verifyOwnerSession(db, ownerToken);
    if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  }
  const reg = await getBetaRegistrationByIdD1(db, regId);
  if (!reg) return { success: false, error: "Pendaftaran beta tidak ditemukan." };
  const approvedAt = (/* @__PURE__ */ new Date()).toISOString();
  const randPart1 = crypto2.randomBytes(2).toString("hex").toUpperCase();
  const randPart2 = crypto2.randomBytes(2).toString("hex").toUpperCase();
  const licenseKey = `SN-TRIAL-${randPart1}-${randPart2}`;
  await approveBetaRegistrationD1(db, regId, licenseKey, approvedAt);
  const updated = await getBetaRegistrationByIdD1(db, regId);
  return { success: true, registration: updated || reg };
}
async function rejectBetaRegistration(dbOrToken, tokenOrId, maybeIdOrReason, maybeReason) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const regId = (isD1(dbOrToken) ? maybeIdOrReason : tokenOrId) || "";
  const reason = (isD1(dbOrToken) ? maybeReason : maybeIdOrReason) || "Data usaha tidak memenuhi kriteria beta.";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await rejectBetaRegistrationD1(db, regId, reason);
  return { success: true };
}
async function extendBetaTrial(dbOrToken, tokenOrId, maybeIdOrDays, maybeDaysOrReason, maybeReason) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const regId = (isD1(dbOrToken) ? maybeIdOrDays : tokenOrId) || "";
  const extraDays = Number(isD1(dbOrToken) ? maybeDaysOrReason : maybeIdOrDays) || 7;
  const reason = (isD1(dbOrToken) ? maybeReason : maybeDaysOrReason) || "Perpanjangan atas permintaan tester";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  const reg = await getBetaRegistrationByIdD1(db, regId);
  if (!reg) return { success: false, error: "Pendaftaran beta tidak ditemukan." };
  const currentBase = reg.expiresAt ? new Date(reg.expiresAt).getTime() : Date.now();
  const baseTime = currentBase > Date.now() ? currentBase : Date.now();
  const newExpiresAt = new Date(baseTime + extraDays * 24 * 60 * 60 * 1e3).toISOString();
  const auditLog = `${reg.auditLog ? reg.auditLog + " | " : ""}[${(/* @__PURE__ */ new Date()).toISOString()}] Perpanjang +${extraDays} hari (${reason}) oleh Owner`;
  await extendBetaRegistrationTrialD1(db, regId, extraDays, newExpiresAt, auditLog);
  return { success: true, newExpiresAt };
}
async function revokeBetaTrial(dbOrToken, tokenOrKey, maybeKey) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await revokeBetaRegistrationD1(db, licenseKey);
  return { success: true };
}
async function unbindBetaTrialDevice(dbOrToken, tokenOrKey, maybeKey) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrKey : dbOrToken;
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  await unbindBetaRegistrationDeviceD1(db, licenseKey);
  return { success: true };
}
async function convertBetaTrialToPaid(dbOrToken, tokenOrId, maybeId) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  let ownerToken = null;
  let regId = "";
  if (isD1(dbOrToken)) {
    if (maybeId) {
      ownerToken = tokenOrId;
      regId = maybeId;
    } else {
      regId = tokenOrId || "";
    }
  } else {
    ownerToken = dbOrToken;
    regId = tokenOrId || "";
  }
  if (ownerToken) {
    const auth = await verifyOwnerSession(db, ownerToken);
    if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  }
  const reg = await getBetaRegistrationByIdD1(db, regId);
  if (!reg) return { success: false, error: "Pendaftaran beta tidak ditemukan." };
  const commercialKey = generateGenuineLicenseKey(regId);
  if (reg.status === "dikonversi_berbayar") {
    return { success: true, status: "dikonversi_berbayar", licenseKey: commercialKey, commercialLicenseKey: commercialKey };
  }
  const verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
  const auditNote = `Dikonversi ke berbayar lisensi ${commercialKey} pada ${verifiedAt} oleh Owner`;
  const stmtBeta = db.prepare(`
    UPDATE BetaRegistrations 
    SET status = 'dikonversi_berbayar', auditLog = ?, expiresAt = NULL
    WHERE registrationId = ?
  `).bind(auditNote, regId);
  const stmtLicense = db.prepare(`
    INSERT OR IGNORE INTO Licenses (
      licenseKey, orderId, businessName, boundDeviceId, deviceName, issuedAt, activatedAt, signature, licenseType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'berbayar')
  `).bind(
    commercialKey,
    regId,
    reg.businessName,
    reg.boundDeviceId || null,
    reg.deviceName || null,
    verifiedAt,
    reg.activatedAt || verifiedAt,
    signLicenseKey(commercialKey)
  );
  await db.batch([stmtBeta, stmtLicense, db.prepare("INSERT OR IGNORE INTO LicenseDeviceKeys (licenseKey, deviceId, publicKey) SELECT ?, deviceId, publicKey FROM LicenseDeviceKeys WHERE licenseKey = ?").bind(commercialKey, reg.trialLicenseKey || "")]);
  return { success: true, status: "dikonversi_berbayar", licenseKey: commercialKey, commercialLicenseKey: commercialKey };
}
async function verifyDeviceLicense(db, dataOrKey, maybeDeviceId, maybeToken) {
  const data = typeof dataOrKey === "string" ? { licenseKey: dataOrKey, deviceId: maybeDeviceId || "", token: maybeToken } : dataOrKey;
  const key = (data.licenseKey || "").trim().toUpperCase();
  const devId = (data.deviceId || "").trim();
  if (!key) {
    return { valid: false, status: "unregistered", error: "Nomor lisensi tidak disertakan." };
  }
  const lic = await getLicenseD1(db, key);
  if (lic) {
    if (lic.revoked === 1) {
      return { valid: false, status: "revoked", error: "Lisensi resmi ini telah dicabut oleh Owner SakuNota." };
    }
    if (lic.boundDeviceId && devId && lic.boundDeviceId !== devId) {
      return { valid: false, status: "revoked", error: `Lisensi resmi ini terikat pada perangkat lain (${lic.deviceName || "Perangkat Utama"}).` };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await db.prepare("UPDATE Licenses SET lastConnectedAt = ? WHERE licenseKey = ?").bind(now, key).run();
    } catch (_) {
    }
    return {
      valid: true,
      status: "paid_active",
      licenseType: "berbayar",
      businessName: lic.businessName,
      expiresAt: null
    };
  }
  const tester = await getTesterLicenseD1(db, key);
  if (tester) {
    if (tester.revoked === 1) {
      return { valid: false, status: "revoked", error: "Lisensi tester ini telah dicabut oleh Owner SakuNota." };
    }
    if (tester.boundDeviceId && devId && tester.boundDeviceId !== devId) {
      return { valid: false, status: "revoked", error: `Lisensi tester ini terikat pada perangkat lain (${tester.deviceName || "Perangkat Tester"}).` };
    }
    const isExpired = tester.expiresAt ? new Date(tester.expiresAt).getTime() < Date.now() : false;
    if (isExpired) {
      return {
        valid: false,
        status: "tester_expired",
        licenseType: "tester",
        businessName: tester.recipientName,
        expiresAt: tester.expiresAt,
        error: "Masa berlaku lisensi tester ini telah berakhir."
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await db.prepare("UPDATE TesterLicenses SET activatedAt = COALESCE(activatedAt, ?) WHERE licenseKey = ?").bind(now, key).run();
    } catch (_) {
    }
    const diffMs = tester.expiresAt ? new Date(tester.expiresAt).getTime() - Date.now() : 0;
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (1e3 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.floor(hoursRemaining / 24));
    return {
      valid: true,
      status: "tester_active",
      licenseType: "tester",
      businessName: tester.recipientName,
      expiresAt: tester.expiresAt,
      daysRemaining,
      hoursRemaining
    };
  }
  const beta = await getBetaRegistrationByLicenseKeyD1(db, key);
  if (beta) {
    if (beta.status === "pending") {
      return { valid: false, status: "pending_approval", error: "Pendaftaran Closed Beta masih menunggu persetujuan Owner." };
    }
    if (beta.status === "ditolak") {
      return { valid: false, status: "revoked", error: `Pendaftaran Closed Beta ditolak${beta.rejectionReason ? `: ${beta.rejectionReason}` : ""}.` };
    }
    if (beta.status === "dicabut") {
      return { valid: false, status: "revoked", error: "Akses Trial Beta ini telah dicabut oleh Owner." };
    }
    if (beta.status === "dikonversi_berbayar") {
      const paid = await getLicenseD1(db, generateGenuineLicenseKey(beta.registrationId));
      if (!paid || paid.revoked === 1) return { valid: false, status: "revoked", error: "Lisensi resmi hasil konversi telah dicabut oleh Owner SakuNota." };
      if (devId && paid.boundDeviceId && paid.boundDeviceId !== devId) return { valid: false, status: "revoked", error: `Lisensi resmi ini terikat pada perangkat lain (${paid.deviceName || "Perangkat Utama"}).` };
      return {
        valid: true,
        status: "paid_active",
        licenseType: "berbayar",
        businessName: beta.businessName,
        expiresAt: null
      };
    }
    if (beta.boundDeviceId && devId && beta.boundDeviceId !== devId) {
      return { valid: false, status: "revoked", error: `Akses trial ini terikat pada perangkat lain (${beta.deviceName || "Perangkat Beta"}).` };
    }
    const isExpired = beta.expiresAt ? new Date(beta.expiresAt).getTime() < Date.now() : false;
    if (isExpired) {
      return {
        valid: false,
        status: "trial_expired",
        licenseType: "trial",
        businessName: beta.businessName,
        expiresAt: beta.expiresAt,
        error: "Masa coba 7 hari telah berakhir. Akses kasir terkunci sampai lisensi dibeli atau diperpanjang Owner."
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await db.prepare("UPDATE BetaRegistrations SET lastConnectedAt = ? WHERE trialLicenseKey = ?").bind(now, key).run();
    } catch (_) {
    }
    const diffMs = beta.expiresAt ? new Date(beta.expiresAt).getTime() - Date.now() : 7 * 24 * 3600 * 1e3;
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (1e3 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.floor(hoursRemaining / 24));
    return {
      valid: true,
      status: "trial_active",
      licenseType: "trial",
      businessName: beta.businessName,
      expiresAt: beta.expiresAt,
      daysRemaining,
      hoursRemaining
    };
  }
  return { valid: false, status: "unregistered", error: "Nomor lisensi tidak terdaftar di sistem SakuNota." };
}
async function validatePromoCode(dbOrCode, maybeCode) {
  const db = isD1(dbOrCode) ? dbOrCode : getD1();
  const code = (isD1(dbOrCode) ? maybeCode : dbOrCode) || "";
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: "Kode promo tidak boleh kosong." };
  }
  const promo = await getPromoCodeByCodeD1(db, cleanCode);
  if (!promo || promo.active !== 1) {
    return { valid: false, error: "Kode promo tidak ditemukan atau sudah tidak aktif." };
  }
  if (promo.maxUsage && promo.maxUsage > 0 && promo.usageCount >= promo.maxUsage) {
    return { valid: false, error: "Kuota penggunaan kode promo ini sudah habis." };
  }
  const calc = calculatePromoDiscount(5e4, promo.discountType, promo.discountValue);
  return {
    valid: true,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount: calc.discountAmount,
    finalAmount: calc.finalAmount,
    description: promo.description || void 0
  };
}
async function listOwnerPromos(dbOrToken, maybeToken) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : dbOrToken;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  const list = await getAllPromoCodesD1(db);
  return { success: true, promos: list };
}
async function createOwnerPromo(dbOrToken, tokenOrData, maybeData) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrData : dbOrToken;
  const data = (isD1(dbOrToken) ? maybeData : tokenOrData) || {};
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  const cleanCode = (data.code || "").trim().toUpperCase();
  if (!cleanCode || cleanCode.length < 3) {
    return { success: false, error: "Kode promo minimal 3 karakter." };
  }
  const existing = await getPromoCodeByCodeD1(db, cleanCode);
  if (existing) {
    return { success: false, error: `Kode promo "${cleanCode}" sudah ada di sistem.` };
  }
  const discountType = data.discountType || "nominal";
  const discountValue = Number(data.discountValue) || 0;
  if (discountValue <= 0) {
    return { success: false, error: "Nilai diskon harus lebih besar dari 0." };
  }
  if (discountType === "percent" && (discountValue < 1 || discountValue > 99)) {
    return { success: false, error: "Persentase diskon harus antara 1% sampai 99%." };
  }
  if (discountType === "fixed_price" && (discountValue < 1e3 || discountValue >= 5e4)) {
    return { success: false, error: "Harga tetap harus antara Rp 1.000 sampai Rp 49.999." };
  }
  if (discountType === "nominal" && (discountValue < 1e3 || discountValue >= 5e4)) {
    return { success: false, error: "Potongan nominal harus antara Rp 1.000 sampai Rp 49.000." };
  }
  const created = await insertPromoCodeD1(db, {
    code: cleanCode,
    discountType,
    discountValue,
    description: data.description,
    maxUsage: Number(data.maxUsage) || 0
  });
  return { success: true, promo: created };
}
async function toggleOwnerPromo(dbOrToken, tokenOrId, idOrActive, maybeActive) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const id2 = isD1(dbOrToken) ? idOrActive : typeof tokenOrId === "number" ? tokenOrId : Number(tokenOrId);
  const active = isD1(dbOrToken) ? maybeActive : idOrActive;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  await togglePromoCodeD1(db, Number(id2), Number(active) ? 1 : 0);
  return { success: true };
}
async function deleteOwnerPromo(dbOrToken, tokenOrId, maybeId) {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? tokenOrId : dbOrToken;
  const id2 = (isD1(dbOrToken) ? maybeId : tokenOrId) || 0;
  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }
  await deletePromoCodeD1(db, Number(id2));
  return { success: true };
}
var init_sakunotaServer = __esm({
  "src/lib/server/sakunotaServer.ts"() {
    "use strict";
    init_d1();
    __name(getServerSecret, "getServerSecret");
    __name(getOwnerSalt, "getOwnerSalt");
    __name(getOwnerUsername, "getOwnerUsername");
    __name(getOwnerPassword, "getOwnerPassword");
    __name(hashPassword, "hashPassword");
    __name(extractBearerToken, "extractBearerToken");
    __name(isD1, "isD1");
    __name(signLicenseKey, "signLicenseKey");
    __name(generateGenuineLicenseKey, "generateGenuineLicenseKey");
    __name(signOwnerSession, "signOwnerSession");
    __name(verifyOwnerSession, "verifyOwnerSession");
    __name(revokeOwnerSession, "revokeOwnerSession");
    __name(signDeviceActivation, "signDeviceActivation");
    __name(verifyDeviceActivationToken, "verifyDeviceActivationToken");
    __name(authenticateOwner, "authenticateOwner");
    __name(createCustomerOrder, "createCustomerOrder");
    __name(syncMidtransOrderStatus, "syncMidtransOrderStatus");
    __name(checkCustomerOrderStatus, "checkCustomerOrderStatus");
    __name(listOwnerOrders, "listOwnerOrders");
    __name(verifyOrderAndIssueLicense, "verifyOrderAndIssueLicense");
    __name(activateLicenseOnDevice, "activateLicenseOnDevice");
    __name(createTesterLicense, "createTesterLicense");
    __name(listTesterLicenses, "listTesterLicenses");
    __name(revokeTesterLicense, "revokeTesterLicense");
    __name(unbindTesterLicense, "unbindTesterLicense");
    __name(extendTesterLicense, "extendTesterLicense");
    __name(getOwnerMetrics, "getOwnerMetrics");
    __name(cancelOwnerOrder, "cancelOwnerOrder");
    __name(archiveOwnerOrder, "archiveOwnerOrder");
    __name(deleteOwnerTestOrder, "deleteOwnerTestOrder");
    __name(listOwnerLicenses, "listOwnerLicenses");
    __name(unbindOwnerLicense, "unbindOwnerLicense");
    __name(revokeOwnerLicense, "revokeOwnerLicense");
    __name(registerBetaAccount, "registerBetaAccount");
    __name(listBetaRegistrations, "listBetaRegistrations");
    __name(approveBetaRegistration, "approveBetaRegistration");
    __name(rejectBetaRegistration, "rejectBetaRegistration");
    __name(extendBetaTrial, "extendBetaTrial");
    __name(revokeBetaTrial, "revokeBetaTrial");
    __name(unbindBetaTrialDevice, "unbindBetaTrialDevice");
    __name(convertBetaTrialToPaid, "convertBetaTrialToPaid");
    __name(verifyDeviceLicense, "verifyDeviceLicense");
    __name(validatePromoCode, "validatePromoCode");
    __name(listOwnerPromos, "listOwnerPromos");
    __name(createOwnerPromo, "createOwnerPromo");
    __name(toggleOwnerPromo, "toggleOwnerPromo");
    __name(deleteOwnerPromo, "deleteOwnerPromo");
  }
});

// functions/api/license/activate.ts
init_sakunotaServer();
init_d1();

// src/lib/server/licenseDeviceAccess.ts
init_sakunotaServer();
init_d1();

// src/lib/server/licenseSigning.ts
import crypto3 from "node:crypto";

// src/lib/licenseProtocol.ts
function proofMessage(action, key, deviceId, token, timestamp, nonce) {
  return JSON.stringify([action, key.trim().toUpperCase(), deviceId.trim(), token, timestamp, nonce]);
}
__name(proofMessage, "proofMessage");
function publicKeyIdentity(jwk) {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !/^[A-Za-z0-9_-]{43}$/.test(jwk.x || "") || !/^[A-Za-z0-9_-]{43}$/.test(jwk.y || "") || jwk.d) throw new Error("Kunci perangkat tidak valid.");
  return JSON.stringify({ kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y });
}
__name(publicKeyIdentity, "publicKeyIdentity");
function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(toBase64Url, "toBase64Url");
function fromBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Format token tidak valid.");
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
__name(fromBase64Url, "fromBase64Url");

// src/lib/server/licenseSigning.ts
function verifyDeviceProof(action, licenseKey, deviceId, token, proof, onReason) {
  try {
    if (!proof) {
      onReason?.("missing_proof");
      return null;
    }
    if (!Number.isFinite(proof.timestamp)) {
      onReason?.("invalid_timestamp");
      return null;
    }
    if (Math.abs(Date.now() - proof.timestamp) > 18e5) {
      onReason?.(`skew:${Date.now()}-${proof.timestamp}`);
      return null;
    }
    if (!/^[\w-]{20,80}$/.test(proof.nonce)) {
      onReason?.("invalid_nonce");
      return null;
    }
    if (!/^[\w-]{80,100}$/.test(proof.signature)) {
      onReason?.(`invalid_sig_len:${proof.signature?.length}`);
      return null;
    }
    const identity = publicKeyIdentity(proof.publicKey);
    const publicKey = crypto3.createPublicKey({ key: JSON.parse(identity), format: "jwk" });
    const pem = publicKey.export({ type: "spki", format: "pem" });
    const message = proofMessage(action, licenseKey, deviceId, token, proof.timestamp, proof.nonce);
    const ok = crypto3.verify("sha256", Buffer.from(message), { key: pem, dsaEncoding: "ieee-p1363" }, Buffer.from(proof.signature, "base64url"));
    if (!ok) onReason?.("crypto_verify_false");
    return ok ? identity : null;
  } catch (err) {
    onReason?.(`exception:${err?.message || err}`);
    return null;
  }
}
__name(verifyDeviceProof, "verifyDeviceProof");
function signOfflineLicense(claims) {
  const rawKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
  if (!rawKey) throw new Error("Konfigurasi penandatangan lisensi belum tersedia.");
  const privateKey = crypto3.createPrivateKey({ key: JSON.parse(rawKey), format: "jwk" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto3.sign("sha256", Buffer.from(payload), { key: pem, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `SN2.${payload}.${signature}`;
}
__name(signOfflineLicense, "signOfflineLicense");
function readSignedLicense(token) {
  try {
    const [version, payload, signature, extra] = token.split(".");
    if (version !== "SN2" || !payload || !signature || extra || token.length > 8192) return null;
    const rawKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
    if (!rawKey) return null;
    const privateKey = crypto3.createPrivateKey({ key: JSON.parse(rawKey), format: "jwk" });
    const publicKey = crypto3.createPublicKey(privateKey);
    const pem = publicKey.export({ type: "spki", format: "pem" });
    if (!crypto3.verify("sha256", Buffer.from(payload), { key: pem, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return claims.v === 2 ? claims : null;
  } catch {
    return null;
  }
}
__name(readSignedLicense, "readSignedLicense");

// src/lib/server/licenseDeviceAccess.ts
async function binding(db, key) {
  return db.prepare("SELECT * FROM LicenseDeviceKeys WHERE licenseKey = ?").bind(key).first();
}
__name(binding, "binding");
async function claim(db, key, deviceId, publicKey) {
  await db.prepare("INSERT OR IGNORE INTO LicenseDeviceKeys (licenseKey, deviceId, publicKey) VALUES (?, ?, ?)").bind(key, deviceId, publicKey).run();
  const current = await binding(db, key);
  return current?.deviceId === deviceId && current?.publicKey === publicKey;
}
__name(claim, "claim");
async function currentRecord(db, key) {
  return await getLicenseD1(db, key) || await getTesterLicenseD1(db, key) || await getBetaRegistrationByLicenseKeyD1(db, key);
}
__name(currentRecord, "currentRecord");
async function authorized(db, data, action) {
  const key = data.licenseKey.trim().toUpperCase();
  const deviceId = data.deviceId.trim();
  const identity = verifyDeviceProof(action, key, deviceId, data.token || "", data.deviceProof);
  if (!identity) return { identity: null, error: "Bukti perangkat atau aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan.", status: 403 };
  const record = await currentRecord(db, key);
  if (!record) return { identity: null, error: "Nomor lisensi tidak ditemukan di sistem. Periksa kembali penulisan kode lisensi Anda.", status: 404 };
  if (record.revoked) return { identity: null, error: "Lisensi ini telah dicabut atau dinonaktifkan.", status: 403 };
  const saved = await binding(db, key);
  if (saved) {
    if (saved.deviceId !== deviceId || saved.publicKey !== identity) {
      return { identity: null, error: "Lisensi ini sudah terikat pada perangkat lain. Jika Anda berganti HP, silakan lepas ikatan perangkat pada Portal Owner.", status: 403 };
    }
    return { identity };
  }
  if (record.boundDeviceId) {
    if (record.boundDeviceId !== deviceId) {
      return { identity: null, error: `Lisensi ini sudah terikat pada perangkat lain (${record.deviceName || record.boundDeviceId}). Silakan lepas ikatan perangkat pada Portal Owner jika Anda berganti HP.`, status: 403 };
    }
    const legacy = verifyDeviceActivationToken(data.token || "");
    if (!legacy.valid || legacy.licenseKey !== key || legacy.deviceId !== deviceId) {
      return { identity: null, error: "Bukti aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan.", status: 403 };
    }
    return { identity };
  }
  return action === "activate" ? { identity } : { identity: null, error: "Aksi verifikasi tidak diizinkan sebelum lisensi diaktifkan.", status: 403 };
}
__name(authorized, "authorized");
async function activateSecureDevice(db, data) {
  const auth = await authorized(db, data, "activate");
  if (!auth.identity) return { success: false, status: auth.status || 403, error: auth.error || "Bukti perangkat atau aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan." };
  const identity = auth.identity;
  const result = await activateLicenseOnDevice(db, data);
  if (!result.success) return result;
  const key = data.licenseKey.trim().toUpperCase();
  if (!await claim(db, key, data.deviceId, identity)) return { success: false, status: 409, error: "Lisensi sudah terikat pada kunci perangkat lain." };
  await upsertDeviceTelemetryD1(db, {
    licenseKey: key,
    deviceId: data.deviceId,
    deviceModel: data.deviceModel || null,
    location: data.location || null,
    ipAddress: data.ipAddress || null
  });
  return { ...result, activationToken: signOfflineLicense({ v: 2, licenseKey: key, deviceId: data.deviceId, deviceKey: identity, licenseType: result.licenseType, expiresAt: result.expiresAt || null, businessName: result.businessName || "Usaha Saya", issuedAt: Date.now() }) };
}
__name(activateSecureDevice, "activateSecureDevice");
async function verifySecureDevice(db, data) {
  const auth = await authorized(db, data, "verify");
  if (!auth.identity) return { valid: false, status: "unregistered", error: auth.error || "Bukti lisensi atau perangkat tidak sah. Sambungkan dari perangkat yang diaktifkan." };
  const identity = auth.identity;
  if (!identity) return { valid: false, status: "unregistered", error: "Bukti lisensi atau perangkat tidak sah. Sambungkan dari perangkat yang diaktifkan." };
  const key = data.licenseKey.trim().toUpperCase();
  const current = await binding(db, key);
  if (current) {
    const token = readSignedLicense(data.token || "");
    const legacy = token ? null : verifyDeviceActivationToken(data.token || "");
    const signedMatches = token?.licenseKey === key && token.deviceId === data.deviceId && token.deviceKey === identity;
    const legacyMatches = legacy?.valid && legacy.licenseKey === key && legacy.deviceId === data.deviceId;
    if (!signedMatches && !legacyMatches) return { valid: false, status: "unregistered", error: "Token aktivasi tidak sah." };
  }
  const result = await verifyDeviceLicense(db, data);
  if (!result.valid) return result;
  if (!await claim(db, key, data.deviceId, identity)) return { valid: false, status: "revoked", error: "Lisensi terikat pada perangkat lain." };
  await upsertDeviceTelemetryD1(db, {
    licenseKey: key,
    deviceId: data.deviceId,
    deviceModel: data.deviceModel || null,
    location: data.location || null,
    ipAddress: data.ipAddress || null
  });
  return { ...result, activationToken: signOfflineLicense({ v: 2, licenseKey: key, deviceId: data.deviceId, deviceKey: identity, licenseType: result.licenseType, expiresAt: result.expiresAt || null, businessName: result.businessName || "Usaha Saya", issuedAt: Date.now() }) };
}
__name(verifySecureDevice, "verifySecureDevice");

// functions/api/license/activate.ts
async function onRequestPost(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { licenseKey, deviceId, deviceName, deviceModel, token, deviceProof } = body || {};
    if (typeof licenseKey !== "string" || typeof deviceId !== "string" || !licenseKey.trim() || !deviceId.trim() || !deviceProof || licenseKey.length > 200 || deviceId.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor lisensi dan ID perangkat wajib disertakan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const telemetry = extractRequestTelemetry(context.request, deviceModel);
    const res = await activateSecureDevice(db, {
      licenseKey: licenseKey.trim().toUpperCase(),
      deviceId: deviceId.trim(),
      deviceName,
      deviceModel: telemetry.deviceModel || void 0,
      location: telemetry.location || void 0,
      ipAddress: telemetry.ipAddress || void 0,
      token,
      deviceProof
    });
    return new Response(
      JSON.stringify({
        success: res.success,
        error: res.error,
        activationToken: res.activationToken,
        activatedAt: res.activatedAt,
        licenseType: res.licenseType,
        businessName: res.businessName,
        expiresAt: res.expiresAt
      }),
      {
        status: res.status,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost, "onRequestPost");

// functions/api/license/verify.ts
init_sakunotaServer();
init_d1();
async function onRequestPost2(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { licenseKey, deviceId, deviceModel, token, deviceProof } = body || {};
    if (typeof licenseKey !== "string" || typeof deviceId !== "string" || typeof token !== "string" || !licenseKey.trim() || !deviceId.trim() || !token || !deviceProof || licenseKey.length > 200 || deviceId.length > 200 || token.length > 8192) {
      return new Response(JSON.stringify({ valid: false, status: "unregistered", error: "Nomor lisensi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const telemetry = extractRequestTelemetry(context.request, deviceModel);
    const res = await verifySecureDevice(db, {
      licenseKey: licenseKey.trim().toUpperCase(),
      deviceId: deviceId.trim(),
      deviceModel: telemetry.deviceModel || void 0,
      location: telemetry.location || void 0,
      ipAddress: telemetry.ipAddress || void 0,
      token,
      deviceProof
    });
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, status: "unregistered", error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost2, "onRequestPost");

// functions/api/orders/check.ts
init_sakunotaServer();
async function onRequestPost3(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { orderId, accessCode } = body || {};
    if (!orderId || !accessCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nomor Pesanan dan Kode Akses Rahasia Pembeli wajib disertakan demi keamanan lisensi Anda."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
    const res = await checkCustomerOrderStatus(db, orderId, accessCode, serverKey);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: res.error?.includes("tidak cocok") ? 403 : 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, order: res.order }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost3, "onRequestPost");

// functions/api/orders/create.ts
init_sakunotaServer();
async function onRequestPost4(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { buyerName, businessName, whatsapp, email, npwp, transferProofName, transferProofData, promoCode } = body || {};
    if (!buyerName || !businessName || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Nama, Nama Usaha, dan WhatsApp wajib diisi." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const res = await createCustomerOrder(db, { buyerName, businessName, whatsapp, email, npwp, transferProofName, transferProofData, promoCode });
    return new Response(JSON.stringify({ success: true, order: res.order }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost4, "onRequestPost");

// functions/api/orders/upload-proof.ts
init_sakunotaServer();
init_d1();
async function onRequestPost5(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { orderId, accessCode, transferProofName, transferProofData } = body || {};
    if (!orderId || !accessCode || !transferProofData) {
      return new Response(
        JSON.stringify({ success: false, error: "Order ID, kode akses, dan data foto bukti transfer wajib dilampirkan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const order = await getOrderByIdD1(db, orderId.trim());
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Pesanan tidak ditemukan." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (order.accessCode.toUpperCase() !== accessCode.trim().toUpperCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "Kode akses rahasia tidak cocok." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const updatedOrder = await updateOrderProofD1(
      db,
      order.orderId,
      transferProofName || "bukti_transfer.jpg",
      transferProofData
    );
    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message || "Gagal mengunggah bukti transfer." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(onRequestPost5, "onRequestPost");

// functions/api/owner/devices.ts
init_sakunotaServer();

// src/lib/server/ownerDevices.ts
async function listOwnerStores(db, after = "") {
  const stores = await db.prepare("SELECT id,licenseKey FROM MdStores WHERE id>? ORDER BY id LIMIT 21").bind(after).all();
  const page = stores.results.slice(0, 20);
  const items = await Promise.all(page.map(async (store) => {
    const devices = await db.prepare(`SELECT d.id,d.name,d.role,
      (SELECT MAX(e.receivedAt) FROM MdEvents e WHERE e.storeId=d.storeId AND e.deviceId=d.id) AS lastReceivedAt
      FROM MdDevices d WHERE d.storeId=? AND d.revoked=0 ORDER BY d.role DESC,d.id`).bind(store.id).all();
    return { licenseKey: store.licenseKey, devices: devices.results };
  }));
  return { items, next: stores.results.length > 20 ? page[page.length - 1].id : null };
}
__name(listOwnerStores, "listOwnerStores");

// functions/api/owner/devices.ts
async function onRequestGet(context) {
  const reply = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }), "reply");
  try {
    const db = getD1(context.env?.DB);
    const auth = await verifyOwnerSession(db, extractBearerToken(context.request.headers.get("Authorization") || ""));
    if (!auth.valid) return reply({ error: "Silakan login kembali." }, 401);
    if (context.env?.SAKUNOTA_MULTI_DEVICE !== "enabled") return reply({ enabled: false, items: [], next: null });
    const after = new URL(context.request.url).searchParams.get("after") || "";
    if (after && !/^[a-f0-9]{64}$/.test(after)) return reply({ error: "Halaman tidak tersedia." }, 400);
    return reply({ enabled: true, ...await listOwnerStores(db, after) });
  } catch {
    return reply({ error: "Daftar perangkat belum dapat dimuat." }, 503);
  }
}
__name(onRequestGet, "onRequestGet");

// functions/api/owner/licenses.ts
init_sakunotaServer();
async function onRequestGet2(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const res = await listOwnerLicenses(db, token);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet2, "onRequestGet");
async function onRequestPut(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json();
    const { action, licenseKey } = body || {};
    if (!licenseKey) {
      return new Response(JSON.stringify({ success: false, error: "Kode lisensi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "unbind") {
      const res = await unbindOwnerLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "revoke") {
      const res = await revokeOwnerLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: false, error: "Aksi tidak dikenal." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPut, "onRequestPut");

// functions/api/owner/login.ts
init_sakunotaServer();
async function onRequestPost6(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { username, password } = body || {};
    const clientIp = context.request.headers.get("CF-Connecting-IP") || context.request.headers.get("x-forwarded-for") || "127.0.0.1";
    const res = await authenticateOwner(db, username || "", password || "", clientIp);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error, remainingLockSec: res.remainingLockSec }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, token: res.token }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost6, "onRequestPost");

// functions/api/owner/logout.ts
init_sakunotaServer();
async function onRequestPost7(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const res = await revokeOwnerSession(db, token);
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost7, "onRequestPost");

// functions/api/owner/metrics.ts
init_sakunotaServer();
async function onRequestGet3(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const res = await getOwnerMetrics(db, token);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, metrics: res.metrics }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet3, "onRequestGet");

// functions/api/owner/orders.ts
init_sakunotaServer();
async function onRequestGet4(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const res = await listOwnerOrders(db, token);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, orders: res.orders }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPut2(context) {
  try {
    const { getD1: getD12, initD1Tables: initD1Tables2, extractBearerToken: extractBearerToken2, cancelOwnerOrder: cancelOwnerOrder2, archiveOwnerOrder: archiveOwnerOrder2 } = await Promise.resolve().then(() => (init_sakunotaServer(), sakunotaServer_exports));
    const db = getD12(context.env?.DB);
    await initD1Tables2(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken2(authHeader);
    const body = await context.request.json();
    const { action, orderId } = body || {};
    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "Nomor pesanan diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "cancel") {
      const res = await cancelOwnerOrder2(db, token, orderId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "archive") {
      const res = await archiveOwnerOrder2(db, token, orderId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "sync_midtrans") {
      const { verifyOwnerSession: verifyOwnerSession2 } = await Promise.resolve().then(() => (init_sakunotaServer(), sakunotaServer_exports));
      if (!(await verifyOwnerSession2(db, token)).valid) return Response.json({ success: false, error: "Sesi Owner tidak sah." }, { status: 401 });
      const { syncMidtransOrderStatus: syncMidtransOrderStatus2 } = await Promise.resolve().then(() => (init_sakunotaServer(), sakunotaServer_exports));
      const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
      const res = await syncMidtransOrderStatus2(db, orderId, serverKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: false, error: "Aksi tidak dikenal." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPut2, "onRequestPut");
async function onRequestDelete(context) {
  try {
    const { getD1: getD12, initD1Tables: initD1Tables2, extractBearerToken: extractBearerToken2, deleteOwnerTestOrder: deleteOwnerTestOrder2 } = await Promise.resolve().then(() => (init_sakunotaServer(), sakunotaServer_exports));
    const db = getD12(context.env?.DB);
    await initD1Tables2(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken2(authHeader);
    const body = await context.request.json().catch(() => ({}));
    const { orderId, auditNote, passwordConfirm } = body || {};
    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "Nomor pesanan diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const res = await deleteOwnerTestOrder2(db, token, orderId, auditNote, passwordConfirm);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestDelete, "onRequestDelete");

// functions/api/owner/drive-restore.ts
init_sakunotaServer();
var tables = [
  { name: "MdEntities", field: "entities", columns: ["kind", "id", "revision", "payload"] },
  { name: "MdEvents", field: "events", columns: ["id", "deviceId", "operatorId", "kind", "entityId", "payload", "digest", "receivedAt"] },
  { name: "MdPayloadChunks", field: "payloadChunks", columns: ["kind", "id", "part", "payload"] }
];
async function onRequestPost8({ request, env }) {
  const reply = /* @__PURE__ */ __name((body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } }), "reply");
  try {
    const db = getD1(env.DB);
    const auth = await verifyOwnerSession(db, extractBearerToken(request.headers.get("Authorization") || ""));
    if (!auth.valid) return reply({ error: "Silakan login kembali." }, 401);
    const recoveryKey = env.SAKUNOTA_RECOVERY_KEY || JSON.parse(env.SAKUNOTA_DRIVE_BACKUP || "{}").encryptionKey;
    if (!/^[a-f0-9]{64}$/i.test(recoveryKey || "")) return reply({ error: "Kunci cadangan belum disiapkan." }, 503);
    const body = await request.json().catch(() => null);
    if (typeof body?.licenseKey !== "string" || !/^SN-[A-Z0-9-]{3,100}$/i.test(body.licenseKey)) {
      return reply({ error: "Pilih lisensi toko yang valid." }, 400);
    }
    const file = body.archive;
    if (file?.format !== "sakunota-d1-backup-v1" || file.algorithm !== "aes-256-gcm" || typeof file.iv !== "string" || typeof file.tag !== "string" || typeof file.ciphertext !== "string" || file.iv.length > 24 || file.tag.length > 32 || file.ciphertext.length > 5e6) {
      return reply({ error: "Pilih file cadangan SakuNota yang sesuai, maksimal 5 MB." }, 400);
    }
    let archive;
    try {
      const decode = /* @__PURE__ */ __name((value) => fromBase64Url(value.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")), "decode");
      const ciphertext = decode(file.ciphertext);
      const tag = decode(file.tag);
      const iv = decode(file.iv);
      if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid archive");
      const encrypted = new Uint8Array(ciphertext.length + tag.length);
      encrypted.set(ciphertext);
      encrypted.set(tag, ciphertext.length);
      const bytes = Uint8Array.from(recoveryKey.match(/../g), (pair) => parseInt(pair, 16));
      const key = await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["decrypt"]);
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
      archive = JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
      return reply({ error: "Cadangan tidak bisa dibuka dengan kunci yang tersedia." }, 400);
    }
    const store = await db.prepare("SELECT id, revision FROM MdStores WHERE licenseKey = ?").bind(body.licenseKey.toUpperCase()).first();
    if (!store || archive?.version !== 1 || archive.store?.id !== store.id) {
      return reply({ error: "Cadangan ini tidak cocok dengan toko yang dipilih." }, 409);
    }
    const revision = archive.store.revision;
    if (!Number.isSafeInteger(revision) || revision < 1 || !Number.isSafeInteger(store.revision + revision) || tables.some(({ field }) => !Array.isArray(archive[field]) || archive[field].some((row) => row?.storeId !== store.id)) || !archive.entities.length || archive.entities.some((row) => !Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > revision)) {
      return reply({ error: "Isi cadangan belum lengkap." }, 400);
    }
    const marker = crypto.randomUUID();
    const statements = [db.prepare(`UPDATE MdStores SET revision = ?, mutation = ? WHERE id = ? AND revision = ?
      AND NOT EXISTS (SELECT 1 FROM MdEntities WHERE storeId = MdStores.id)
      AND NOT EXISTS (SELECT 1 FROM MdEvents WHERE storeId = MdStores.id)
      AND NOT EXISTS (SELECT 1 FROM MdPayloadChunks WHERE storeId = MdStores.id) RETURNING revision`).bind(store.revision + revision, marker, store.id, store.revision)];
    const encoder = new TextEncoder();
    for (const { name, field, columns } of tables) {
      const rows = field === "events" ? [...archive[field]].sort((a, b) => Number(a.sequence) - Number(b.sequence)) : archive[field];
      const fields = columns.map((column) => column === "revision" ? "json_extract(value, '$.revision') + " + store.revision : "json_extract(value, '$." + column + "')");
      const insert = db.prepare(`INSERT INTO ${name}(storeId, ${columns.join(", ")})
        SELECT ?, ${fields.join(", ")} FROM json_each(?)
        WHERE EXISTS (SELECT 1 FROM MdStores WHERE id = ? AND mutation = ?) ORDER BY CAST(key AS INTEGER)`);
      let lines = [];
      let size = 2;
      for (const row of rows) {
        const line = JSON.stringify(row);
        const length = encoder.encode(line).byteLength + 1;
        if (length > 9e4) return reply({ error: "Ada bagian cadangan yang terlalu besar untuk dipulihkan." }, 400);
        if (size + length > 9e4) {
          statements.push(insert.bind(store.id, "[" + lines.join(",") + "]", store.id, marker));
          lines = [];
          size = 2;
        }
        lines.push(line);
        size += length;
      }
      if (lines.length) statements.push(insert.bind(store.id, "[" + lines.join(",") + "]", store.id, marker));
    }
    if (statements.length > 90) return reply({ error: "Cadangan terlalu besar untuk dipulihkan sekaligus." }, 400);
    const results = await db.batch(statements);
    if (results.some((result) => !result.success)) return reply({ error: "Data belum berhasil dipulihkan." }, 503);
    if (!results[0]?.results?.length) return reply({ error: "Toko sudah berisi data. Pemulihan dihentikan agar transaksi tetap aman." }, 409);
    return reply({ success: true });
  } catch {
    return reply({ error: "Data belum berhasil dipulihkan. Coba lagi." }, 503);
  }
}
__name(onRequestPost8, "onRequestPost");

// functions/api/owner/drive-backup.ts
init_sakunotaServer();
async function onRequestPost9({ request, env }) {
  const reply = /* @__PURE__ */ __name((body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } }), "reply");
  try {
    const db = getD1(env.DB);
    const auth = await verifyOwnerSession(db, extractBearerToken(request.headers.get("Authorization") || ""));
    if (!auth.valid) return reply({ error: "Silakan login kembali." }, 401);
    const body = await request.json().catch(() => null);
    if (typeof body?.licenseKey !== "string" || !/^SN-[A-Z0-9-]{3,100}$/i.test(body.licenseKey)) {
      return reply({ error: "Pilih lisensi toko yang valid." }, 400);
    }
    const recoveryKey = env.SAKUNOTA_RECOVERY_KEY;
    if (!recoveryKey || !/^[a-f0-9]{64}$/i.test(recoveryKey)) {
      return reply({ error: "Kunci cadangan belum disiapkan." }, 503);
    }
    const licenseKey = body.licenseKey.toUpperCase();
    const store = await db.prepare("SELECT id FROM MdStores WHERE licenseKey = ?").bind(licenseKey).first();
    if (!store) return reply({ error: "Toko ini belum memiliki data yang tersinkron." }, 404);
    const results = await db.batch([
      db.prepare("SELECT id, revision FROM MdStores WHERE id = ?").bind(store.id),
      db.prepare("SELECT * FROM MdEntities WHERE storeId = ? ORDER BY kind, id").bind(store.id),
      db.prepare("SELECT * FROM MdEvents WHERE storeId = ? ORDER BY sequence").bind(store.id),
      db.prepare("SELECT * FROM MdPayloadChunks WHERE storeId = ? ORDER BY kind, id, part").bind(store.id),
      db.prepare("SELECT id, storeId, name, epoch, active FROM MdEmployees WHERE storeId = ? ORDER BY id").bind(store.id)
    ]);
    const [stores, entities, events, payloadChunks, employees] = results.map((result) => result.results);
    if (!stores[0] || results.some((result) => !result.success)) return reply({ error: "Data toko belum dapat dibaca." }, 503);
    if (!entities.length && !events.length) return reply({ error: "Toko ini belum memiliki data yang tersinkron." }, 404);
    const capturedAt = (/* @__PURE__ */ new Date()).toISOString();
    const rawKey = Uint8Array.from(recoveryKey.match(/../g), (pair) => parseInt(pair, 16));
    const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const archive = new TextEncoder().encode(JSON.stringify({ version: 1, capturedAt, store: stores[0], entities, events, payloadChunks, employees }));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, archive));
    const file = JSON.stringify({
      format: "sakunota-d1-backup-v1",
      algorithm: "aes-256-gcm",
      iv: toBase64Url(iv),
      tag: toBase64Url(encrypted.subarray(-16)),
      ciphertext: Array.from({ length: Math.ceil((encrypted.length - 16) / 24576) }, (_, i) => toBase64Url(encrypted.subarray(i * 24576, Math.min((i + 1) * 24576, encrypted.length - 16)))).join("")
    });
    if (file.length > 5e6) return reply({ error: "Data terlalu besar untuk dicadangkan dengan cara ini." }, 413);
    const name = "SakuNota-" + store.id.slice(0, 12) + "-" + capturedAt.replace(/[:.]/g, "-") + ".encrypted.json";
    return new Response(file, { headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="' + name + '"',
      "Cache-Control": "no-store"
    } });
  } catch {
    return reply({ error: "Cadangan belum berhasil dibuat. Coba lagi." }, 503);
  }
}
__name(onRequestPost9, "onRequestPost");

// functions/api/owner/tester-license.ts
init_sakunotaServer();
async function onRequestGet5(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const auth = context.request.headers.get("authorization") || "";
    const token = extractBearerToken(auth);
    const res = await listTesterLicenses(db, token);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet5, "onRequestGet");
async function onRequestPost10(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const auth = context.request.headers.get("authorization") || "";
    const token = extractBearerToken(auth);
    const body = await context.request.json();
    const res = await createTesterLicense(db, token, body);
    return new Response(JSON.stringify(res), {
      status: res.success ? 201 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost10, "onRequestPost");
async function onRequestPut3(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const auth = context.request.headers.get("authorization") || "";
    const token = extractBearerToken(auth);
    const body = await context.request.json();
    const { action, licenseKey } = body || {};
    if (!licenseKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor lisensi wajib diisi." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (action === "unbind") {
      const res = await unbindTesterLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "revoke") {
      const res = await revokeTesterLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "extend") {
      const extraDays = Number(body?.extraDays) || 7;
      const reason = body?.reason || "Perpanjangan lisensi tester";
      const res = await extendTesterLicense(db, token, licenseKey, extraDays, reason);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(
      JSON.stringify({ success: false, error: "Aksi tidak dikenali." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPut3, "onRequestPut");

// functions/api/owner/secrets.ts
init_sakunotaServer();
async function onRequestGet6(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const auth = await verifyOwnerSession(db, token);
    if (!auth.valid) {
      return new Response(JSON.stringify({ success: false, error: "Akses ditolak. Sesi Owner tidak valid." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const names = ["MIDTRANS_SERVER_KEY", "MIDTRANS_CLIENT_KEY", "MIDTRANS_MERCHANT_ID", "SAKUNOTA_OWNER_USERNAME", "SAKUNOTA_OWNER_PASSWORD", "SAKUNOTA_OWNER_JWT_SECRET", "SAKUNOTA_SERVER_SECRET", "SAKUNOTA_OWNER_SALT"];
    const configured = Object.fromEntries(names.map((name) => [name, Boolean(context.env?.[name])]));
    return new Response(JSON.stringify({ success: true, configured }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet6, "onRequestGet");

// functions/api/owner/verify.ts
init_sakunotaServer();
async function onRequestPost11(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json();
    const { orderId } = body || {};
    const res = await verifyOrderAndIssueLicense(db, token, orderId);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, order: res.order, licenseKey: res.licenseKey }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost11, "onRequestPost");

// functions/api/owner/beta.ts
init_sakunotaServer();
async function onRequestGet7(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const res = await listBetaRegistrations(db, token);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet7, "onRequestGet");
async function onRequestPost12(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json();
    const { action, registrationId, trialLicenseKey, extraDays, reason } = body || {};
    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "Aksi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "approve") {
      const res = await approveBetaRegistration(db, token, registrationId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "reject") {
      const res = await rejectBetaRegistration(db, token, registrationId, reason);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "extend") {
      const res = await extendBetaTrial(db, token, registrationId, extraDays, reason);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "revoke") {
      const res = await revokeBetaTrial(db, token, trialLicenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "unbind") {
      const res = await unbindBetaTrialDevice(db, token, trialLicenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "convert") {
      const res = await convertBetaTrialToPaid(db, token, registrationId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: false, error: "Aksi tidak dikenali." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost12, "onRequestPost");

// functions/api/beta/register.ts
init_sakunotaServer();
async function onRequestPost13(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { ownerName, businessName, whatsapp, email, notes, honeypot } = body || {};
    if (!ownerName || !businessName || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Nama Pemilik, Nama Usaha, dan Nomor WhatsApp wajib diisi." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const res = await registerBetaAccount(db, {
      ownerName,
      businessName,
      whatsapp,
      email,
      notes,
      honeypot
    });
    return new Response(JSON.stringify(res), {
      status: res.success ? 201 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost13, "onRequestPost");

// functions/api/beta/status.ts
init_sakunotaServer();
init_d1();
async function onRequest(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const url = new URL(context.request.url);
    let query = url.searchParams.get("q") || url.searchParams.get("registrationId") || url.searchParams.get("whatsapp") || "";
    if (!query && context.request.method === "POST") {
      try {
        const body = await context.request.json();
        query = body?.q || body?.registrationId || body?.whatsapp || body?.trialLicenseKey || "";
      } catch (_) {
      }
    }
    query = query.trim();
    if (!query) {
      return new Response(JSON.stringify({ success: false, error: "Parameter pencarian diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!query.startsWith("REG-") && !query.toUpperCase().startsWith("SN-TRIAL-")) return Response.json({ success: false, error: "Gunakan nomor pendaftaran rahasia atau kode trial. Pencarian lewat nomor WhatsApp dinonaktifkan demi privasi." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    let reg = await getBetaRegistrationByIdD1(db, query);
    if (!reg && query.toUpperCase().startsWith("SN-TRIAL-")) {
      reg = await getBetaRegistrationByLicenseKeyD1(db, query.toUpperCase());
    }
    if (!reg) {
      return new Response(JSON.stringify({ success: false, error: "Data pendaftaran tidak ditemukan." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(
      JSON.stringify({
        success: true,
        registration: {
          registrationId: reg.registrationId,
          status: reg.status,
          activatedAt: reg.activatedAt,
          expiresAt: reg.expiresAt,
          durationDays: reg.durationDays,
          registeredAt: reg.registeredAt,
          rejectionReason: reg.rejectionReason
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest, "onRequest");
var onRequestGet8 = onRequest;
var onRequestPost14 = onRequest;

// functions/api/payment/config.ts
async function onRequestGet9(context) {
  const clientKey = context.env?.MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
  const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || "";
  const isSandbox = serverKey.startsWith("SB-");
  return new Response(
    JSON.stringify({
      success: true,
      clientKey,
      isSandbox,
      snapJsUrl: isSandbox ? "https://app.sandbox.midtrans.com/snap/snap.js" : "https://app.midtrans.com/snap/snap.js"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    }
  );
}
__name(onRequestGet9, "onRequestGet");

// functions/api/payment/midtrans.ts
init_sakunotaServer();
init_d1();
import crypto4 from "node:crypto";
async function onRequestPost15(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Kunci server Midtrans (MIDTRANS_SERVER_KEY) belum dikonfigurasi pada Cloudflare Secrets."
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await context.request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = body || {};
    if (!order_id) {
      return new Response(JSON.stringify({ success: false, error: "order_id diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!signature_key) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Akses ditolak: signature_key wajib disertakan pada notifikasi webhook Midtrans."
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expectedSig = crypto4.createHash("sha512").update(payload).digest("hex");
    if (signature_key !== expectedSig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Signature Midtrans tidak valid. Notifikasi pembayaran ditolak demi keamanan lisensi."
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const order = await getOrderByIdD1(db, order_id);
    if (!order) {
      return new Response(JSON.stringify({ success: false, error: "Pesanan tidak ditemukan di sistem D1." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const parsedAmount = Number(gross_amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount !== order.amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Nominal pembayaran (Rp ${parsedAmount}) tidak sesuai dengan tagihan pesanan (Rp ${order.amount}).`
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const isSuccess = status_code === "200" && (transaction_status === "settlement" || transaction_status === "capture" && fraud_status === "accept");
    if (isSuccess) {
      if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
        return new Response(
          JSON.stringify({ success: true, message: "Pesanan sudah berstatus lunas sebelumnya (Idempotent)." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      const licenseKey = generateGenuineLicenseKey(order_id);
      const verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      const stmtOrder = db.prepare(`
        UPDATE CustomerOrders 
        SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
        WHERE orderId = ?
      `).bind(licenseKey, verifiedAt, order_id);
      const stmtLicense = db.prepare(`
        INSERT OR IGNORE INTO Licenses (
          licenseKey, orderId, businessName, issuedAt, signature
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(licenseKey, order_id, order.businessName, verifiedAt, signLicenseKey(licenseKey));
      await db.batch([stmtOrder, stmtLicense]);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Pembayaran Midtrans berhasil diverifikasi. Lisensi resmi telah diterbitkan secara atomik di Cloudflare D1.",
          orderId: order_id
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (["cancel", "deny", "expire"].includes(transaction_status)) {
      await db.prepare(`UPDATE CustomerOrders SET status = 'batal' WHERE orderId = ? AND status != 'lunas_lisensi_terbit'`).bind(order_id).run();
      return new Response(JSON.stringify({ success: true, message: `Status pesanan diubah ke ${transaction_status}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, message: `Status transaksi dicatat: ${transaction_status}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost15, "onRequestPost");
async function onRequestGet10() {
  return new Response(
    JSON.stringify({
      gateway: "Midtrans Payment Gateway",
      target: "Cloudflare D1 Edge Relational Database (09a2c118-5c9d-49e8-a199-d14e930d02f2)",
      status: "ONLINE & ENFORCED",
      signatureVerification: "SHA-512 Mandatory",
      webhookUrl: "/api/payment/midtrans"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(onRequestGet10, "onRequestGet");

// functions/api/payment/snap.ts
init_sakunotaServer();
init_d1();
async function onRequestPost16(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json();
    const { orderId, accessCode } = body || {};
    if (!orderId || !accessCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor pesanan dan kode akses diperlukan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const order = await getOrderByIdD1(db, orderId.trim());
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Pesanan tidak ditemukan di sistem D1." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (order.accessCode.trim().toUpperCase() !== accessCode.trim().toUpperCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "Kode akses rahasia tidak cocok dengan pesanan ini." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    await db.prepare(`UPDATE CustomerOrders SET paymentMethod = 'Midtrans Otomatis (QRIS / E-Wallet / VA)' WHERE orderId = ?`).bind(order.orderId).run();
    const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MIDTRANS_SERVER_KEY belum dikonfigurasi di Cloudflare Secrets. Gunakan pembayaran transfer manual BCA."
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    const isSandbox = serverKey.startsWith("SB-");
    const snapUrl = isSandbox ? "https://app.sandbox.midtrans.com/snap/v1/transactions" : "https://app.midtrans.com/snap/v1/transactions";
    const authHeader = "Basic " + (typeof btoa !== "undefined" ? btoa(serverKey + ":") : Buffer.from(serverKey + ":").toString("base64"));
    const requestUrl = new URL(context.request.url);
    const hostOrigin = requestUrl.origin;
    const notificationWebhook = `${hostOrigin}/api/payment/midtrans`;
    const snapPayload = {
      transaction_details: {
        order_id: order.orderId,
        gross_amount: order.amount
      },
      customer_details: {
        first_name: order.buyerName,
        phone: order.whatsapp,
        email: order.email || "buyer@sakunota.com"
      },
      item_details: [
        {
          id: "SAKUNOTA-LIFETIME-PROMO",
          price: order.amount,
          quantity: 1,
          name: "SakuNota Kasir Lifetime (Promo)"
        }
      ],
      callbacks: {
        finish: `${hostOrigin}/?payment=finish&orderId=${encodeURIComponent(order.orderId)}&accessCode=${encodeURIComponent(order.accessCode)}`,
        unfinish: `${hostOrigin}/?payment=unfinish&orderId=${encodeURIComponent(order.orderId)}&accessCode=${encodeURIComponent(order.accessCode)}`,
        error: `${hostOrigin}/?payment=error&orderId=${encodeURIComponent(order.orderId)}&accessCode=${encodeURIComponent(order.accessCode)}`
      }
    };
    if (hostOrigin.startsWith("https://")) {
      snapPayload.override_notification_urls = [notificationWebhook];
    }
    const snapRes = await fetch(snapUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader
      },
      body: JSON.stringify(snapPayload)
    });
    const snapText = await snapRes.text();
    let snapJson = null;
    try {
      snapJson = snapText ? JSON.parse(snapText) : null;
    } catch (_) {
      snapJson = null;
    }
    if (!snapRes.ok || !snapJson || !snapJson.token) {
      const errMsg = snapJson?.error_messages ? snapJson.error_messages.join(", ") : snapJson?.message || snapText || "Gagal menghubungi gateway Midtrans.";
      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    if (snapJson.redirect_url) {
      try {
        await updateOrderPaymentLinkD1(db, order.orderId, snapJson.redirect_url, "Midtrans Otomatis");
      } catch (_) {
      }
    }
    return new Response(
      JSON.stringify({
        success: true,
        token: snapJson.token,
        redirect_url: snapJson.redirect_url
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost16, "onRequestPost");

// functions/api/promo/check.ts
init_sakunotaServer();
async function onRequestPost17(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const body = await context.request.json().catch(() => ({}));
    const { code } = body || {};
    if (!code || typeof code !== "string" || !code.trim()) {
      return new Response(
        JSON.stringify({ valid: false, error: "Kode promo tidak boleh kosong." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const res = await validatePromoCode(db, code);
    return new Response(JSON.stringify(res), {
      status: res.valid ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ valid: false, error: e.message || "Gagal memeriksa kode promo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(onRequestPost17, "onRequestPost");

// functions/api/owner/promos.ts
init_sakunotaServer();
async function onRequestGet11(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const res = await listOwnerPromos(db, token);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message || "Gagal memuat kode promo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(onRequestGet11, "onRequestGet");
async function onRequestPost18(context) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json().catch(() => ({}));
    const { action } = body || {};
    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Aksi diperlukan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (action === "create") {
      const { code, discountType, discountValue, description, maxUsage } = body;
      const res = await createOwnerPromo(db, token, {
        code,
        discountType,
        discountValue,
        description,
        maxUsage
      });
      return new Response(JSON.stringify(res), {
        status: res.success ? 201 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "toggle") {
      const { id: id2, active } = body;
      const res = await toggleOwnerPromo(db, token, id2, active);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "delete") {
      const { id: id2 } = body;
      const res = await deleteOwnerPromo(db, token, id2);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(
      JSON.stringify({ success: false, error: "Aksi tidak dikenali." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message || "Gagal memproses permintaan." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(onRequestPost18, "onRequestPost");

// src/worker.ts
init_sakunotaServer();

// src/lib/multidevice/protocol.ts
var OFFLINE_ACCESS_MS = 24 * 60 * 60 * 1e3;
var PAIRING_MS = 5 * 60 * 1e3;
var AccessError = class extends Error {
  constructor(message = "Akses tidak diizinkan.", status = 403, code, retryAt) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAt = retryAt;
  }
  static {
    __name(this, "AccessError");
  }
};
function requireOwner(claims) {
  if (claims.role !== "owner" || claims.employeeId) throw new AccessError("Tindakan ini memerlukan akses pemilik.");
}
__name(requireOwner, "requireOwner");
function assertId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(value)) throw new AccessError("Data tidak valid.", 400);
}
__name(assertId, "assertId");
function integer(value, positive = false) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new AccessError("Jumlah tidak valid.", 400);
  return value;
}
__name(integer, "integer");
function text(value, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new AccessError("Lengkapi data dengan benar.", 400);
  return value.trim();
}
__name(text, "text");
function validClaims(claims, now = Date.now()) {
  return claims.version === 1 && ["owner", "cashier"].includes(claims.role) && Number.isSafeInteger(claims.deviceEpoch) && claims.deviceEpoch > 0 && Number.isSafeInteger(claims.issuedAt) && Number.isSafeInteger(claims.expiresAt) && now >= claims.issuedAt - 6e4 && now < claims.expiresAt && claims.expiresAt - claims.issuedAt <= OFFLINE_ACCESS_MS && claims.expiresAt > claims.issuedAt && (claims.role !== "owner" || !claims.employeeId) && (!claims.employeeId || Number.isSafeInteger(claims.employeeEpoch) && claims.employeeEpoch > 0 && /^[a-f0-9]{64}$/.test(claims.pinDigest || ""));
}
__name(validClaims, "validClaims");
function validateEnvelope(event, claims) {
  for (const id2 of [event.id, event.entityId, event.storeId, event.deviceId, event.operatorId]) assertId(id2);
  if (event.storeId !== claims.storeId || event.deviceId !== claims.deviceId || event.operatorId !== (claims.employeeId || claims.deviceId)) throw new AccessError();
  if (!event.data || typeof event.data !== "object" || Array.isArray(event.data)) throw new AccessError("Data tidak valid.", 400);
  if (!["catalog.put", "settings.put", "shift.open", "shift.close", "order.create", "payment.record", "refund.record", "stock.adjust", "pos.commit"].includes(event.kind)) throw new AccessError("Tindakan tidak tersedia.", 400);
  if (["catalog.put", "settings.put", "refund.record", "stock.adjust"].includes(event.kind)) requireOwner(claims);
  if (claims.role === "cashier" && !claims.employeeId) throw new AccessError("Silakan masuk kasir.");
}
__name(validateEnvelope, "validateEnvelope");
function lineAmount(quantity, price, basis) {
  integer(quantity, true);
  integer(price);
  integer(basis, true);
  const result = (BigInt(quantity) * BigInt(price) + BigInt(basis) / BigInt(2)) / BigInt(basis);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new AccessError("Jumlah terlalu besar.", 400);
  return Number(result);
}
__name(lineAmount, "lineAmount");

// src/lib/server/multideviceAccess.ts
init_d1();
import crypto6 from "node:crypto";

// src/lib/server/multideviceCrypto.ts
import crypto5 from "node:crypto";
var digest = /* @__PURE__ */ __name((value) => crypto5.createHash("sha256").update(value).digest("hex"), "digest");
var randomCode = /* @__PURE__ */ __name(() => crypto5.randomBytes(32).toString("base64url"), "randomCode");
function pinVerifier(pin) {
  if (!/^\d{4}$/.test(pin)) throw new AccessError("Gunakan PIN 4 angka.", 400);
  const salt = crypto5.randomBytes(24).toString("base64url");
  let hash = Buffer.from(pin);
  for (let round = 0; round < 3; round++) hash = crypto5.pbkdf2Sync(hash, salt, 7e4, 32, "sha256");
  return JSON.stringify({ v: 2, salt, iterations: 7e4, rounds: 3, hash: hash.toString("base64url") });
}
__name(pinVerifier, "pinVerifier");
function verifyPin(pin, verifier) {
  if (!/^(?:\d{4}|\d{6,12})$/.test(pin)) return false;
  try {
    const saved = JSON.parse(verifier);
    const rounds = saved.v === 2 && saved.iterations === 7e4 && saved.rounds === 3 ? 3 : saved.v === 1 && saved.iterations === 21e4 ? 1 : 0;
    if (!rounds || typeof saved.salt !== "string" || saved.salt.length > 64) return false;
    let actual = Buffer.from(pin);
    for (let round = 0; round < rounds; round++) actual = crypto5.pbkdf2Sync(actual, saved.salt, saved.iterations, 32, "sha256");
    const expected = Buffer.from(saved.hash, "base64url");
    return expected.length === actual.length && crypto5.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
__name(verifyPin, "verifyPin");
function signAccess(claims, privateJwk) {
  const key = crypto5.createPrivateKey({ key: JSON.parse(privateJwk), format: "jwk" });
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto5.sign("sha256", Buffer.from(`SNMD1.${payload}`), { key: key.export({ type: "pkcs8", format: "pem" }), dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `SNMD1.${payload}.${signature}`;
}
__name(signAccess, "signAccess");
function readAccess(token, privateJwk, now = Date.now(), renewDevice = false) {
  try {
    if (token.length > 4096) throw new Error();
    const [prefix, payload, signature, extra] = token.split(".");
    if (prefix !== "SNMD1" || !payload || !signature || extra) throw new Error();
    const key = crypto5.createPublicKey(crypto5.createPrivateKey({ key: JSON.parse(privateJwk), format: "jwk" }));
    if (!crypto5.verify("sha256", Buffer.from(`${prefix}.${payload}`), { key: key.export({ type: "spki", format: "pem" }), dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))) throw new Error();
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!validClaims(claims, renewDevice ? claims.issuedAt + 1 : now)) throw new Error();
    if (renewDevice && (claims.role !== "cashier" || claims.employeeId)) throw new Error();
    return claims;
  } catch {
    throw new AccessError("Silakan masuk lagi.", 401);
  }
}
__name(readAccess, "readAccess");

// src/lib/server/multideviceAccess.ts
function signingKey(env) {
  if (env.SAKUNOTA_MULTI_DEVICE !== "enabled" || !env.SAKUNOTA_LICENSE_PRIVATE_JWK) throw new AccessError("Halaman tidak tersedia.", 404);
  return env.SAKUNOTA_LICENSE_PRIVATE_JWK;
}
__name(signingKey, "signingKey");
async function activeLicense(db, licenseKey) {
  const record = await getLicenseD1(db, licenseKey) || await getTesterLicenseD1(db, licenseKey) || await getBetaRegistrationByLicenseKeyD1(db, licenseKey);
  if (!record || "revoked" in record && record.revoked || "status" in record && !["disetujui", "dikonversi_berbayar"].includes(record.status)) throw new AccessError("Lisensi tidak aktif.", 403, "license_revoked");
  if ("expiresAt" in record && record.expiresAt && (!("status" in record) || record.status !== "dikonversi_berbayar") && (!Number.isFinite(Date.parse(record.expiresAt)) || Date.now() >= Date.parse(record.expiresAt))) throw new AccessError("Masa akses berakhir.", 403, "license_revoked");
  return record;
}
__name(activeLicense, "activeLicense");
function originalClaims(token, key) {
  try {
    const [v, p, s, extra] = token.split(".");
    if (v !== "SN2" || !p || !s || extra || token.length > 8192) throw new Error();
    const publicKey = crypto6.createPublicKey(crypto6.createPrivateKey({ key: JSON.parse(key), format: "jwk" }));
    if (!crypto6.verify("sha256", Buffer.from(p), { key: publicKey.export({ type: "spki", format: "pem" }), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))) throw new Error();
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    if (claims.v !== 2 || claims.expiresAt && (!Number.isFinite(Date.parse(claims.expiresAt)) || Date.now() >= Date.parse(claims.expiresAt))) throw new Error();
    return claims;
  } catch {
    throw new AccessError("Aktifkan lisensi pada perangkat pemilik.", 401);
  }
}
__name(originalClaims, "originalClaims");
async function grant(env, device, employee) {
  const store = await env.DB.prepare("SELECT licenseKey FROM MdStores WHERE id=?").bind(device.storeId).first();
  if (!store) throw new AccessError();
  const license = await activeLicense(env.DB, store.licenseKey);
  const issuedAt = Date.now();
  const claims = { version: 1, storeId: device.storeId, deviceId: device.id, deviceKey: device.publicKey, role: device.role, deviceEpoch: device.epoch, issuedAt, expiresAt: issuedAt + OFFLINE_ACCESS_MS };
  if ("expiresAt" in license && license.expiresAt && (!("status" in license) || license.status !== "dikonversi_berbayar")) claims.expiresAt = Math.min(claims.expiresAt, Date.parse(license.expiresAt));
  if (employee) {
    claims.employeeId = employee.id;
    claims.employeeEpoch = employee.epoch;
    claims.pinDigest = digest(employee.verifier);
  }
  return { access: signAccess(claims, signingKey(env)), claims };
}
__name(grant, "grant");
async function enrollOwner(env, data) {
  const claims = originalClaims(data.activation, signingKey(env));
  const identity = verifyDeviceProof("multi.enroll", claims.licenseKey, claims.deviceId, data.activation, data.proof);
  if (!identity || identity !== claims.deviceKey) throw new AccessError();
  await activeLicense(env.DB, claims.licenseKey);
  const binding2 = await env.DB.prepare("SELECT deviceId,publicKey FROM LicenseDeviceKeys WHERE licenseKey=?").bind(claims.licenseKey).first();
  if (binding2?.deviceId !== claims.deviceId || binding2.publicKey !== identity) throw new AccessError("Gunakan perangkat pemilik yang sudah aktif.");
  assertId(claims.deviceId);
  let storeId = digest(`SakuNota/store/v1/${claims.licenseKey}`);
  const convertedBeta = await env.DB.prepare(`SELECT b.trialLicenseKey FROM BetaRegistrations b JOIN Licenses l ON l.orderId = b.registrationId WHERE l.licenseKey = ? AND b.status = 'dikonversi_berbayar'`).bind(claims.licenseKey).first();
  if (convertedBeta?.trialLicenseKey) {
    const originalStoreId = digest(`SakuNota/store/v1/${convertedBeta.trialLicenseKey}`);
    const existingStore = await env.DB.prepare("SELECT id FROM MdStores WHERE id=?").bind(originalStoreId).first();
    if (existingStore) storeId = originalStoreId;
  }
  const currentBinding = "EXISTS(SELECT 1 FROM LicenseDeviceKeys k WHERE k.licenseKey=? AND k.deviceId=? AND k.publicKey=?)";
  const bindingValues = [claims.licenseKey, claims.deviceId, identity];
  await env.DB.batch([
    env.DB.prepare("INSERT INTO MdStores(id,licenseKey) VALUES (?,?) ON CONFLICT(id) DO NOTHING").bind(storeId, claims.licenseKey),
    // LicenseDeviceKeys was checked against the newly activated original-device proof.
    // Rotate the owner slot without replacing the store or any business records.
    env.DB.prepare(`UPDATE MdDevices SET revoked=1,epoch=epoch+1 WHERE storeId=? AND role='owner' AND revoked=0 AND (id<>? OR publicKey<>?) AND ${currentBinding}`).bind(storeId, claims.deviceId, identity, ...bindingValues),
    env.DB.prepare(`INSERT INTO MdDevices(id,storeId,role,publicKey,name) SELECT ?,?,'owner',?,? WHERE ${currentBinding}
      ON CONFLICT(storeId,id) DO UPDATE SET publicKey=excluded.publicKey,name=excluded.name,revoked=0,
      epoch=CASE WHEN MdDevices.revoked=1 OR MdDevices.publicKey<>excluded.publicKey THEN MdDevices.epoch+1 ELSE MdDevices.epoch END
      WHERE MdDevices.role='owner'`).bind(claims.deviceId, storeId, identity, text(data.deviceName), ...bindingValues)
  ]);
  const device = await env.DB.prepare(`SELECT * FROM MdDevices WHERE storeId=? AND id=? AND role='owner' AND revoked=0 AND ${currentBinding}`).bind(storeId, claims.deviceId, ...bindingValues).first();
  if (!device || device.publicKey !== identity) throw new AccessError("Perangkat pemilik perlu diperiksa.");
  return grant(env, device);
}
__name(enrollOwner, "enrollOwner");
async function authorize(env, access, action, body, proof) {
  const claims = readAccess(access, signingKey(env), Date.now(), action === "refresh");
  const identity = verifyDeviceProof(`multi.${action}.${digest(JSON.stringify(body))}`, claims.storeId, claims.deviceId, access, proof);
  if (identity !== claims.deviceKey) throw new AccessError("Silakan masuk lagi.", 401);
  const device = await env.DB.prepare("SELECT * FROM MdDevices WHERE storeId=? AND id=? AND revoked=0").bind(claims.storeId, claims.deviceId).first();
  if (!device || device.epoch !== claims.deviceEpoch || device.publicKey !== identity || device.role !== claims.role) throw new AccessError("Perangkat sudah dilepas.", 403, "device_revoked");
  const store = await env.DB.prepare("SELECT licenseKey FROM MdStores WHERE id=?").bind(claims.storeId).first();
  if (!store) throw new AccessError();
  await activeLicense(env.DB, store.licenseKey);
  const ownerBinding = await env.DB.prepare(`SELECT d.id FROM MdDevices d JOIN LicenseDeviceKeys k ON k.deviceId=d.id AND k.publicKey=d.publicKey
    WHERE d.storeId=? AND d.role='owner' AND d.revoked=0 AND k.licenseKey=?`).bind(claims.storeId, store.licenseKey).first();
  if (!ownerBinding) throw new AccessError("Perangkat toko perlu dihubungkan kembali.", 403, "device_revoked");
  if (claims.employeeId) {
    const employee = await env.DB.prepare("SELECT epoch,active FROM MdEmployees WHERE storeId=? AND id=?").bind(claims.storeId, claims.employeeId).first();
    if (!employee?.active || employee.epoch !== claims.employeeEpoch) throw new AccessError("Akses karyawan berakhir.", 403, "employee_revoked");
  }
  try {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM MdNonces WHERE expiresAt<?").bind(Date.now()),
      env.DB.prepare("INSERT INTO MdNonces(storeId,deviceId,nonce,expiresAt) VALUES (?,?,?,?)").bind(claims.storeId, claims.deviceId, proof.nonce, Date.now() + 36e5)
    ]);
  } catch {
    throw new AccessError("Permintaan sudah digunakan.", 409);
  }
  return claims;
}
__name(authorize, "authorize");
async function createPairing(env, owner) {
  requireOwner(owner);
  const slot = await env.DB.prepare("SELECT id FROM MdDevices WHERE storeId=? AND role='cashier' AND revoked=0").bind(owner.storeId).first();
  if (slot) throw new AccessError("Lepas perangkat kasir terlebih dahulu.", 409);
  const id2 = crypto6.randomUUID(), code = randomCode(), expiresAt = Date.now() + PAIRING_MS;
  await env.DB.prepare("INSERT INTO MdPairings(id,storeId,codeHash,expiresAt) VALUES (?,?,?,?)").bind(id2, owner.storeId, digest(code), expiresAt).run();
  return { id: id2, code, expiresAt };
}
__name(createPairing, "createPairing");
async function requestPairing(env, data) {
  signingKey(env);
  assertId(data.deviceId);
  if (!/^[\w-]{43}$/.test(data.code)) throw new AccessError("Kode penghubung tidak berlaku.", 400);
  const identity = verifyDeviceProof("multi.pair", data.code, data.deviceId, "", data.proof);
  if (!identity) throw new AccessError();
  const pair = await env.DB.prepare("SELECT * FROM MdPairings WHERE codeHash=? AND expiresAt>?").bind(digest(data.code), Date.now()).first();
  if (!pair) throw new AccessError("Kode penghubung tidak berlaku.", 410);
  if (pair.candidateId && (pair.candidateId !== data.deviceId || pair.candidateKey !== identity)) throw new AccessError("Kode penghubung sudah digunakan.", 409);
  await env.DB.prepare("UPDATE MdPairings SET candidateId=?,candidateKey=?,candidateName=? WHERE id=? AND candidateId IS NULL AND consumed=0 AND expiresAt>?").bind(data.deviceId, identity, text(data.deviceName), pair.id, Date.now()).run();
  const current = await env.DB.prepare("SELECT * FROM MdPairings WHERE id=?").bind(pair.id).first();
  if (current?.candidateId !== data.deviceId || current.candidateKey !== identity) throw new AccessError("Kode penghubung sudah digunakan.", 409);
  if (!current.approved) return { pending: true };
  const device = await env.DB.prepare("SELECT * FROM MdDevices WHERE storeId=? AND id=? AND role='cashier' AND revoked=0").bind(pair.storeId, data.deviceId).first();
  if (!device || device.publicKey !== identity) throw new AccessError("Perangkat sudah dilepas.", 403, "device_revoked");
  return { pending: false, ...await grant(env, device) };
}
__name(requestPairing, "requestPairing");
async function approvePairing(env, owner, id2) {
  requireOwner(owner);
  assertId(id2);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO MdDevices(id,storeId,role,publicKey,name)
      SELECT candidateId,storeId,'cashier',candidateKey,candidateName FROM MdPairings
      WHERE id=? AND storeId=? AND expiresAt>? AND consumed=0 AND candidateId IS NOT NULL
      ON CONFLICT(storeId,id) DO UPDATE SET publicKey=excluded.publicKey,name=excluded.name,epoch=MdDevices.epoch+1,revoked=0 WHERE MdDevices.revoked=1 AND MdDevices.role='cashier'`).bind(id2, owner.storeId, Date.now()),
    env.DB.prepare(`UPDATE MdPairings SET approved=1,consumed=1 WHERE id=? AND storeId=? AND expiresAt>?
      AND EXISTS(SELECT 1 FROM MdDevices d WHERE d.storeId=MdPairings.storeId AND d.id=MdPairings.candidateId AND d.publicKey=MdPairings.candidateKey AND d.revoked=0)`).bind(id2, owner.storeId, Date.now())
  ]);
  const row = await env.DB.prepare("SELECT approved FROM MdPairings WHERE id=? AND storeId=?").bind(id2, owner.storeId).first();
  if (!row?.approved) throw new AccessError("Permintaan tidak berlaku.", 409);
  return { success: true };
}
__name(approvePairing, "approvePairing");
async function revokeDevice(env, owner, id2) {
  requireOwner(owner);
  assertId(id2);
  await env.DB.batch([
    env.DB.prepare("UPDATE MdDevices SET revoked=1,epoch=epoch+1 WHERE storeId=? AND id=? AND role='cashier' AND revoked=0").bind(owner.storeId, id2),
    env.DB.prepare("UPDATE MdPairings SET expiresAt=0 WHERE storeId=?").bind(owner.storeId)
  ]);
  return { success: true };
}
__name(revokeDevice, "revokeDevice");
async function saveEmployee(env, owner, data) {
  requireOwner(owner);
  assertId(data.id);
  const name = text(data.name);
  if (typeof data.active !== "boolean") throw new AccessError("Data tidak valid.", 400);
  const existing = await env.DB.prepare("SELECT id FROM MdEmployees WHERE storeId=? AND id=?").bind(owner.storeId, data.id).first();
  const verifier = data.pin ? pinVerifier(data.pin) : void 0;
  if (!existing && !verifier) throw new AccessError("Masukkan PIN karyawan.", 400);
  if (!existing) await env.DB.prepare("INSERT INTO MdEmployees(id,storeId,name,verifier,active) VALUES (?,?,?,?,?)").bind(data.id, owner.storeId, name, verifier, Number(data.active)).run();
  else if (verifier) await env.DB.prepare("UPDATE MdEmployees SET name=?,verifier=?,active=?,epoch=epoch+1,attempts=0,lockedUntil=0 WHERE storeId=? AND id=?").bind(name, verifier, Number(data.active), owner.storeId, data.id).run();
  else await env.DB.prepare("UPDATE MdEmployees SET name=?,active=?,epoch=epoch+1 WHERE storeId=? AND id=?").bind(name, Number(data.active), owner.storeId, data.id).run();
  return { success: true };
}
__name(saveEmployee, "saveEmployee");
async function employeeLogin(env, deviceClaims, data) {
  if (deviceClaims.role !== "cashier") throw new AccessError();
  assertId(data.id);
  await env.DB.prepare("UPDATE MdEmployees SET attempts=CASE WHEN lockedUntil>0 AND lockedUntil<=? THEN 1 ELSE attempts+1 END, lockedUntil=CASE WHEN lockedUntil<=? THEN 0 ELSE lockedUntil END WHERE storeId=? AND id=? AND active=1 AND lockedUntil<=? AND (attempts<5 OR lockedUntil>0)").bind(Date.now(), Date.now(), deviceClaims.storeId, data.id, Date.now()).run();
  const employee = await env.DB.prepare("SELECT * FROM MdEmployees WHERE storeId=? AND id=? AND active=1").bind(deviceClaims.storeId, data.id).first();
  if (!employee) throw new AccessError("Akun karyawan tidak aktif.", 403, "employee_revoked");
  if (employee.lockedUntil > Date.now() || employee.attempts > 5) throw new AccessError("Coba lagi dalam 5 menit.", 429, "account_locked", employee.lockedUntil > Date.now() ? employee.lockedUntil : Date.now() + 3e5);
  if (employee.attempts >= 5 || !verifyPin(data.pin, employee.verifier)) {
    await env.DB.prepare("UPDATE MdEmployees SET lockedUntil=CASE WHEN attempts>=5 THEN ? ELSE lockedUntil END WHERE storeId=? AND id=?").bind(Date.now() + 3e5, deviceClaims.storeId, data.id).run();
    throw new AccessError(employee.attempts >= 5 ? "Coba lagi dalam 5 menit." : "PIN tidak sesuai.", employee.attempts >= 5 ? 429 : 401, employee.attempts >= 5 ? "account_locked" : "pin_invalid", employee.attempts >= 5 ? Date.now() + 3e5 : void 0);
  }
  await env.DB.prepare("UPDATE MdEmployees SET attempts=0,lockedUntil=0 WHERE storeId=? AND id=? AND epoch=? AND active=1").bind(deviceClaims.storeId, data.id, employee.epoch).run();
  const device = await env.DB.prepare("SELECT * FROM MdDevices WHERE storeId=? AND id=? AND revoked=0 AND epoch=?").bind(deviceClaims.storeId, deviceClaims.deviceId, deviceClaims.deviceEpoch).first();
  if (!device) throw new AccessError("Perangkat sudah dilepas.", 403, "device_revoked");
  return { ...await grant(env, device, employee), offlineVerifier: employee.verifier, name: employee.name };
}
__name(employeeLogin, "employeeLogin");
async function listAccess(env, claims) {
  const employees = await env.DB.prepare(`SELECT id,name,active,epoch FROM MdEmployees WHERE storeId=? ${claims.role === "cashier" ? "AND active=1" : ""} ORDER BY name`).bind(claims.storeId).all();
  if (claims.role === "cashier") return { employees: employees.results };
  const devices = await env.DB.prepare("SELECT id,name,role,revoked FROM MdDevices WHERE storeId=? AND revoked=0 ORDER BY role DESC").bind(claims.storeId).all();
  const pairings = await env.DB.prepare("SELECT id,candidateName,expiresAt FROM MdPairings WHERE storeId=? AND candidateId IS NOT NULL AND consumed=0 AND expiresAt>?").bind(claims.storeId, Date.now()).all();
  return { employees: employees.results, devices: devices.results, pairings: pairings.results };
}
__name(listAccess, "listAccess");
async function renewCashierDevice(env, claims) {
  if (claims.role !== "cashier" || claims.employeeId) throw new AccessError();
  const device = await env.DB.prepare("SELECT * FROM MdDevices WHERE storeId=? AND id=? AND epoch=? AND revoked=0").bind(claims.storeId, claims.deviceId, claims.deviceEpoch).first();
  if (!device) throw new AccessError("Perangkat sudah dilepas.", 403, "device_revoked");
  return grant(env, device);
}
__name(renewCashierDevice, "renewCashierDevice");

// src/lib/server/multideviceSync.ts
import crypto7 from "node:crypto";

// src/lib/businessModes/registry.ts
var SERVICE_CATEGORIES = {
  laundry: "Laundry",
  bengkel: "Bengkel",
  salon: "Barbershop / Salon",
  carWash: "Cuci Kendaraan",
  servisAcElektronik: "Servis AC / Elektronik",
  reparasiHp: "Reparasi HP",
  bimbel: "Bimbel / Les",
  jasaUmum: "Jasa Lainnya"
};
function isServiceCategory(value) {
  return typeof value === "string" && Object.hasOwn(SERVICE_CATEGORIES, value);
}
__name(isServiceCategory, "isServiceCategory");

// src/lib/laundry.ts
var laundryStages = ["received", "processing", "ready", "collected"];
function validateLaundry(order) {
  if (order.serviceCategory !== "laundry") return;
  if (!order.customerName?.trim()) throw new Error("Isi nama pelanggan");
  if (!order.pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(order.pickupDate) || !Number.isFinite(Date.parse(order.pickupDate)) || new Date(order.pickupDate).toISOString().slice(0, 10) !== order.pickupDate) throw new Error("Pilih tanggal selesai");
  if (order.tableId) throw new Error("Pesanan Laundry tidak menggunakan meja");
  if (order.customerPhone && !/^[+\d ()-]{6,20}$/.test(order.customerPhone)) throw new Error("Nomor WhatsApp tidak valid");
}
__name(validateLaundry, "validateLaundry");
function validateLaundryTransition(order, previous, next) {
  if (order.serviceCategory !== "laundry" || order.status === "void" || order.isRefunded) throw new Error("Pesanan sudah tidak tersedia");
  if (laundryStages.indexOf(next) !== laundryStages.indexOf(previous) + 1) throw new Error("Status pesanan berubah. Perbarui lalu coba lagi");
  if (next === "collected" && (order.status !== "paid" || Number(order.remainingBalance || 0) > 0)) throw new Error("Lunasi pesanan sebelum diambil");
}
__name(validateLaundryTransition, "validateLaundryTransition");

// src/lib/weight.ts
function weightEnabled(businessType, serviceCategory) {
  return businessType === "retail" || businessType === "warung" || businessType === "service" && serviceCategory === "laundry";
}
__name(weightEnabled, "weightEnabled");
function ratioMoney(price, quantity, basis) {
  if (![price, quantity, basis].every(Number.isSafeInteger) || price < 0 || quantity < 0 || basis <= 0) throw new Error("Harga atau jumlah tidak valid");
  const numerator = BigInt(price) * BigInt(quantity);
  const result = Number((numerator + BigInt(basis) / BigInt(2)) / BigInt(basis));
  if (!Number.isSafeInteger(result)) throw new Error("Total terlalu besar");
  return result;
}
__name(ratioMoney, "ratioMoney");
function lineTotal(item, qty = item.qty ?? 0) {
  const price = item.hargaSatuan ?? item.harga ?? 0;
  return item.saleUnit === "weight" ? ratioMoney(price, qty, item.priceBasis ?? 1e3) : price * qty;
}
__name(lineTotal, "lineTotal");
function validateMeasure(item) {
  if (item.saleUnit !== void 0 && !["pcs", "weight"].includes(item.saleUnit)) throw new Error("Satuan tidak valid");
  if (item.costPrice != null && (!Number.isSafeInteger(item.costPrice) || item.costPrice < 0)) throw new Error("Modal tidak valid");
  if (item.saleUnit === "weight") {
    if (![100, 1e3].includes(item.priceBasis ?? 1e3)) throw new Error("Satuan harga tidak valid");
    if (!Number.isSafeInteger(item.harga) || (item.harga ?? 0) <= 0) throw new Error("Harga belum tersedia");
    if (item.modifiers?.length) throw new Error("Produk timbang tidak menggunakan pilihan tambahan");
  }
}
__name(validateMeasure, "validateMeasure");

// src/lib/weightRefund.ts
var returnMethods = ["Cash", "QRIS", "Transfer"];
function allocatedAmount(order, items, id2) {
  const subtotal = items.reduce((sum2, item) => sum2 + lineTotal(item), 0);
  if (!subtotal) throw new Error("Nilai nota tidak tersedia.");
  let gross = 0;
  for (const item of items) {
    const before = ratioMoney(order.total, gross, subtotal);
    gross += lineTotal(item);
    if (item.id === id2) return ratioMoney(order.total, gross, subtotal) - before;
  }
  throw new Error("Barang tidak ditemukan.");
}
__name(allocatedAmount, "allocatedAmount");
function measuredSplitAmount(order, items, selections) {
  const seen = /* @__PURE__ */ new Set();
  return selections.reduce((total, selection) => {
    const item = items.find((i) => i.id === selection.orderItemId);
    if (!item || !selection.orderItemId || seen.has(selection.orderItemId) || !Number.isSafeInteger(selection.qty) || selection.qty <= 0 || selection.qty > item.qty - (item.paidQty ?? 0)) throw new Error("Jumlah pembayaran barang tidak valid.");
    seen.add(selection.orderItemId);
    const amount2 = allocatedAmount(order, items, item.id);
    const paid = item.paidQty ?? 0;
    return total + ratioMoney(amount2, paid + selection.qty, item.qty) - ratioMoney(amount2, paid, item.qty);
  }, 0);
}
__name(measuredSplitAmount, "measuredSplitAmount");
function quoteWeightReturn(order, items, payments, returns, itemId, grams) {
  const completed = payments.filter((p) => p.status === "completed");
  if (order.status !== "paid" || order.isHistorical || order.tableId || order.total <= 0 || completed.reduce((sum2, p) => sum2 + p.amount, 0) !== order.total) throw new Error("Pilih nota lunas untuk retur timbang.");
  const item = items.find((line) => line.id === itemId);
  if (item?.saleUnit !== "weight") throw new Error("Barang timbang tidak ditemukan.");
  const returned = returns.filter((r) => r.orderItemId === itemId).reduce((sum2, r) => sum2 + r.grams, 0);
  if (!Number.isSafeInteger(grams) || grams <= 0 || grams > item.qty - returned) throw new Error("Berat melebihi sisa yang bisa diretur.");
  const lineAmount2 = allocatedAmount(order, items, itemId);
  const amount2 = ratioMoney(lineAmount2, returned + grams, item.qty) - ratioMoney(lineAmount2, returned, item.qty);
  const returnPayments = {};
  let remaining = amount2;
  for (const method of returnMethods) {
    const received = completed.filter((p) => p.paymentMethod === method).reduce((sum2, p) => sum2 + p.amount, 0);
    const previous = returns.reduce((sum2, r) => sum2 + (r.returnPayments[method] ?? 0), 0);
    const refund = Math.min(remaining, received - previous);
    if (refund < 0) throw new Error("Catatan retur tidak sesuai pembayaran.");
    if (refund) returnPayments[method] = refund;
    remaining -= refund;
  }
  if (remaining) throw new Error("Nilai retur melebihi sisa pembayaran.");
  return { amount: amount2, returnPayments };
}
__name(quoteWeightReturn, "quoteWeightReturn");

// src/lib/multidevice/posWire.ts
var POS_TABLES = ["menuItems", "tables", "orders", "orderItems", "payments", "paymentProofs", "shifts", "cashMovements", "inventoryMovements", "auditLogs", "operations"];
var FOREIGN_KEYS = { operations: { inventoryMovementId: "inventoryMovements", orderId: "orders", orderItemId: "orderItems", shiftId: "shifts", cashMovementId: "cashMovements" }, orders: { shiftId: "shifts", tableId: "tables" }, orderItems: { orderId: "orders", menuItemId: "menuItems" }, payments: { orderId: "orders", shiftId: "shifts", refundShiftId: "shifts", proofId: "paymentProofs" }, paymentProofs: { orderId: "orders", paymentId: "payments" }, cashMovements: { shiftId: "shifts" }, inventoryMovements: { orderId: "orders", menuItemId: "menuItems" }, auditLogs: { orderId: "orders" } };

// src/lib/productPhoto.ts
var MAX_PRODUCT_PHOTO_BYTES = 256 * 1024;
function validateProductPhoto(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > Math.ceil(MAX_PRODUCT_PHOTO_BYTES / 3) * 4 + 40) {
    throw new Error("Foto produk maksimal 256 KB setelah kompresi.");
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new Error("Foto harus berupa isi gambar JPG, PNG, atau WebP; bukan tautan.");
  const bytes = atob(match[2]);
  if (bytes.length > MAX_PRODUCT_PHOTO_BYTES) throw new Error("Foto produk maksimal 256 KB.");
  const valid = match[1] === "png" ? bytes.startsWith("\x89PNG\r\n\n") : match[1] === "jpeg" ? bytes.startsWith("\xFF\xD8\xFF") : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
  if (!valid) throw new Error("Isi foto produk tidak sesuai format gambar.");
  return value;
}
__name(validateProductPhoto, "validateProductPhoto");

// src/lib/productReference.ts
function validGtin(code) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || /^(\d)\1+$/.test(code)) return false;
  let sum2 = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum2 += Number(code[i]) * weight;
  return (10 - sum2 % 10) % 10 === Number(code.at(-1));
}
__name(validGtin, "validGtin");

// src/lib/retailDraft.ts
function validateRetailDraft(value) {
  if (!value || typeof value.nama !== "string" || !value.nama.trim() || value.nama.trim().length > 120) throw new Error("Isi nama barang, maksimal 120 karakter.");
  if (!Number.isSafeInteger(value.harga) || value.harga <= 0) throw new Error("Isi harga jual dengan rupiah bulat lebih dari nol.");
  if (value.sku !== void 0 && (typeof value.sku !== "string" || !validGtin(value.sku))) throw new Error("Barcode barang tidak valid. Pindai ulang atau gunakan Isi Manual.");
  return { nama: value.nama.trim().replace(/\s+/g, " "), harga: value.harga, imageData: validateProductPhoto(value.imageData), ...value.sku ? { sku: value.sku } : {} };
}
__name(validateRetailDraft, "validateRetailDraft");

// src/lib/quickSale.ts
function validateQuickSaleLine(input) {
  if (input.nama !== void 0 && typeof input.nama !== "string") throw new Error("Nama barang tidak valid.");
  const nama = String(input.nama || "").normalize("NFKC").trim().replace(/\s+/g, " ") || "Penjualan langsung";
  if (nama.length > 120) throw new Error("Nama barang maksimal 120 karakter.");
  if (typeof input.qty !== "number" || !Number.isSafeInteger(input.qty) || input.qty < 1 || input.qty > 9999) throw new Error("Jumlah harus 1 sampai 9.999.");
  if (typeof input.harga !== "number" || !Number.isSafeInteger(input.harga) || input.harga < 1 || input.harga > 1e9 || !Number.isSafeInteger(input.harga * input.qty) || input.harga * input.qty > 1e12) throw new Error("Harga tidak valid.");
  return { nama, qty: input.qty, harga: input.harga };
}
__name(validateQuickSaleLine, "validateQuickSaleLine");

// src/lib/businessModes/resolver.ts
function resolveLegacyBusiness({ businessType, serviceMode }) {
  return {
    tables: serviceMode !== "quick" && businessType !== "warung" && businessType !== "retail" && businessType !== "quick" && businessType !== "service",
    kitchen: ["warung", "restoran", "kafe"].includes(businessType || "warung"),
    retailAdd: businessType === "retail"
  };
}
__name(resolveLegacyBusiness, "resolveLegacyBusiness");
function requiresEmptyTables(previous, next) {
  return resolveLegacyBusiness(previous).tables && !resolveLegacyBusiness(next).tables || next.businessType === "quick" && previous.businessType !== "quick";
}
__name(requiresEmptyTables, "requiresEmptyTables");

// src/lib/operations.ts
function kitchenSignature(item) {
  return JSON.stringify([item.qty, item.namaMenu || "", item.selectedModifiers || []]);
}
__name(kitchenSignature, "kitchenSignature");
var kitchenStages = ["waiting", "preparing", "ready", "served"];
function wholeMoney(value, positive = false) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (positive ? 1 : 0) || value > 1e12) throw new Error("Jumlah tidak valid");
  return value;
}
__name(wholeMoney, "wholeMoney");
function validateOperation(row) {
  if (!["attendance.in", "attendance.out", "loan", "repayment", "commission", "commission.paid", "kitchen", "weight.return", "laundry"].includes(row.kind)) throw new Error("Catatan tidak valid");
  if (typeof row.employeeId !== "string" || !row.employeeId.trim() || row.employeeId.length > 160 || typeof row.employeeName !== "string" || !row.employeeName.trim() || row.employeeName.length > 120) throw new Error("Pilih karyawan");
  if (typeof row.at !== "string" || !Number.isFinite(Date.parse(row.at)) || Date.parse(row.at) > Date.now() + 6e4) throw new Error("Waktu tidak valid");
  if (row.note != null && (typeof row.note !== "string" || row.note.length > 240)) throw new Error("Catatan maksimal 240 karakter");
  if (["loan", "repayment", "commission", "commission.paid"].includes(row.kind)) wholeMoney(row.amount, true);
  if (["loan", "repayment", "commission.paid"].includes(row.kind) && !["laci", "rekening"].includes(row.source || "")) throw new Error("Pilih sumber uang");
  if (row.kind.startsWith("attendance.") && !row.sessionId) throw new Error("Absensi tidak valid");
  if (row.kind === "commission") {
    wholeMoney(row.basisAmount, true);
    wholeMoney(row.rate, true);
    if (row.rate > 1e4 || Math.round(row.basisAmount * row.rate / 1e4) !== row.amount) throw new Error("Komisi tidak valid");
    if (!row.orderId || !row.orderItemId) throw new Error("Pilih layanan");
  }
  if (row.kind === "weight.return") {
    wholeMoney(row.amount);
    if (!row.orderId || !row.orderItemId || !row.shiftId || !row.note?.trim() || !row.sessionId || !Number.isSafeInteger(row.grams) || row.grams <= 0 || typeof row.restock !== "boolean" || row.restock !== !!row.inventoryMovementId || !row.returnPayments || Array.isArray(row.returnPayments) || Object.entries(row.returnPayments).some(([method, amount2]) => !returnMethods.some((m) => m === method) || !Number.isSafeInteger(amount2) || amount2 <= 0) || Object.values(row.returnPayments).reduce((sum2, amount2) => sum2 + amount2, 0) !== row.amount) throw new Error("Rincian retur tidak valid.");
  }
  if (row.kind === "laundry" && (!row.orderId || !laundryStages.includes(row.laundryStage))) throw new Error("Pesanan tidak valid");
  if (row.kind === "kitchen" && (!row.orderId || !row.orderItemId || !kitchenStages.includes(row.stage))) throw new Error("Pesanan tidak valid");
}
__name(validateOperation, "validateOperation");
function earnedCommission(amount2, order) {
  if (!order || order.status === "void" || order.isRefunded) return 0;
  if (order.status === "paid") return amount2;
  if (order.paidAmount === void 0) return order.status === "paid" ? amount2 : 0;
  if (!order.total) return 0;
  return Math.round(amount2 * Math.min(1, Math.max(0, order.paidAmount / order.total)));
}
__name(earnedCommission, "earnedCommission");

// src/lib/multidevice/posProjection.ts
var same = /* @__PURE__ */ __name((a, b) => JSON.stringify(a) === JSON.stringify(b), "same");
var catalogMaster = /* @__PURE__ */ __name((value) => Object.fromEntries(Object.keys(value).sort().filter((key) => !["stockQty", ...value.trackStock ? ["isSoldOut"] : [], "costPrice", "purchasePrice", "totalCost", "stockNeedsReview", "mdVersion", "mdCatalogVersion", "mdId", "mdStoreId", "mdDeviceId", "mdOperatorId"].includes(key)).map((key) => [key, value[key]])), "catalogMaster");
async function projectPosCommit(event, claims, lookup, authorization = {}) {
  const rows = event.data.rows?.map((row) => ({ ...row, value: structuredClone(row.value) }));
  const bootstrap = event.data.bootstrap === true;
  if (bootstrap && claims.role !== "owner") throw new AccessError();
  if (!Array.isArray(rows) || rows.length > 600) throw new AccessError("Jumlah rincian transaksi tidak valid.", 400);
  if (rows.length === 0) return [];
  const changed = /* @__PURE__ */ new Map(), result = /* @__PURE__ */ new Map(), lateClosedShiftIds = /* @__PURE__ */ new Set();
  for (const row of rows) {
    assertId(row.id);
    integer(row.expectedVersion);
    if (!POS_TABLES.includes(row.table) || !row.value || typeof row.value !== "object" || changed.has(`${row.table}:${row.id}`)) throw new AccessError("Rincian transaksi rusak atau tercatat ganda.", 400);
    const value = row.value;
    if (value.mdId !== row.id || value.mdStoreId !== claims.storeId || value.mdVersion !== row.expectedVersion + 1) throw new AccessError("Nomor transaksi tidak sesuai.");
    changed.set(`${row.table}:${row.id}`, row);
  }
  const old = /* @__PURE__ */ __name(async (table, id2) => lookup(`pos_${table}`, id2), "old");
  const get = /* @__PURE__ */ __name(async (table, id2) => changed.get(`${table}:${id2}`)?.value || await old(table, id2), "get");
  const add = /* @__PURE__ */ __name((kind, id2, value) => result.set(`${kind}:${id2}`, { kind, id: id2, value }), "add");
  const own = /* @__PURE__ */ __name((value) => value.mdDeviceId === claims.deviceId && value.mdOperatorId === (claims.employeeId || claims.deviceId), "own");
  const acceptsLate = /* @__PURE__ */ __name((shift) => {
    if (!shift || shift.status !== "closed" || shift.closedBy !== "owner" || !own(shift) || claims.role !== "cashier") return false;
    if (authorization.ownerRecovery) return true;
    const closedAt = shift.mdOwnerClosedAt;
    return Number.isSafeInteger(closedAt) && closedAt > 0 && Number.isSafeInteger(claims.issuedAt) && claims.issuedAt < closedAt && claims.expiresAt <= closedAt + OFFLINE_ACCESS_MS && Date.now() < claims.expiresAt;
  }, "acceptsLate");
  const indices = /* @__PURE__ */ new Map();
  const index = /* @__PURE__ */ __name(async (key) => {
    if (!indices.has(key)) indices.set(key, new Set((await lookup("pos_index", key))?.ids || []));
    return indices.get(key);
  }, "index");
  const staffStates = /* @__PURE__ */ new Map();
  const staff = /* @__PURE__ */ __name(async (id2) => {
    if (!staffStates.has(id2)) staffStates.set(id2, { loanBalance: 0, earned: 0, paid: 0, ...await lookup("pos_employeeState", id2) });
    return staffStates.get(id2);
  }, "staff");
  const commissionOrders = /* @__PURE__ */ new Map();
  const commissions = /* @__PURE__ */ __name(async (id2) => {
    if (!commissionOrders.has(id2)) commissionOrders.set(id2, { entries: (await lookup("pos_orderCommissions", id2))?.entries || [] });
    return commissionOrders.get(id2);
  }, "commissions");
  const sessions = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const prior = await old(row.table, row.id), value = row.value;
    if (bootstrap && prior) throw new AccessError("Data awal sudah tersimpan.", 409);
    if (value.mdDeleted && !["menuItems", "tables", "orderItems"].includes(row.table)) throw new AccessError("Catatan transaksi tidak dapat dihapus. Gunakan pembatalan atau pengembalian.", 403);
    let stockOnly = false;
    const tableStatusOnly = row.table === "tables" && prior && Object.keys({ ...prior, ...value }).every((key) => ["status", "mdVersion"].includes(key) || same(prior[key], value[key]));
    if (row.table === "menuItems" && prior) {
      const historical = await lookup("pos_catalogVersion", `${row.id}_${value.mdCatalogVersion}`);
      stockOnly = !!historical && same(catalogMaster(historical), catalogMaster(value));
      if (!stockOnly && (claims.role !== "owner" || value.mdCatalogVersion !== Number(prior.mdCatalogVersion || 0) + 1)) throw new AccessError("Katalog berubah. Perbarui data lalu coba lagi.", 409);
    }
    if (Number(prior?.mdVersion || 0) !== row.expectedVersion && !tableStatusOnly && !(row.table === "menuItems" && (stockOnly || claims.role === "owner"))) throw new AccessError("Data berubah. Perbarui data lalu coba lagi.", 409);
    if (prior && (prior.mdDeviceId !== value.mdDeviceId || prior.mdOperatorId !== value.mdOperatorId)) throw new AccessError("Pemilik transaksi tidak dapat diganti.");
    if (!prior && !own(value)) throw new AccessError("Transaksi tidak sesuai kasir.");
    for (const [field, parent] of Object.entries(FOREIGN_KEYS[row.table] || {})) {
      if (!value[field]) continue;
      assertId(value[field]);
      if (!await get(parent, value[field])) throw new AccessError("Data transaksi belum diterima.", 409);
      if (parent === "orders" && claims.role === "cashier" && !own(await get(parent, value[field]))) throw new AccessError("Transaksi ini milik kasir lain.");
    }
    if (claims.role === "cashier") {
      if (!claims.employeeId) throw new AccessError("Silakan masuk kasir.");
      if (!["menuItems", "tables"].includes(row.table) && !own(value)) throw new AccessError("Transaksi ini milik kasir lain.");
      if (row.table === "tables" && (!prior || Object.keys({ ...prior, ...value }).some((key) => !["status", "mdVersion"].includes(key) && !same(prior[key], value[key])))) throw new AccessError("Meja hanya dapat diatur pemilik.");
      if (row.table === "menuItems") {
        if (prior) {
          if (!stockOnly) throw new AccessError("Harga dan katalog hanya dapat diubah pemilik.");
        } else {
          if (value.trackStock || value.modifiers?.length || value.costPrice != null || !rows.some((item) => item.table === "orderItems" && item.value.menuItemId === row.id)) throw new AccessError("Tambahkan barang melalui transaksi.");
        }
      }
      if (row.table === "payments" && prior && prior.status !== value.status) throw new AccessError("Pengembalian memerlukan akses pemilik.");
    }
    if (row.table === "operations") {
      delete value.ignored;
      delete value.activeSessionId;
      try {
        validateOperation(value);
      } catch (error) {
        throw new AccessError(error.message, 400);
      }
      if (prior) throw new AccessError("Catatan yang tersimpan tidak dapat diganti.", 409);
      if (claims.role === "cashier" && (!value.kind.startsWith("attendance.") && value.kind !== "laundry" && !(value.kind === "kitchen" && value.stage === "served") || value.employeeId !== claims.employeeId)) throw new AccessError("Tindakan ini memerlukan akses pemilik.");
      if (value.kind === "weight.return") {
        assertId(value.sessionId);
        const order = await get("orders", value.orderId);
        const item = await get("orderItems", value.orderItemId);
        const shift = await get("shifts", value.shiftId);
        const returnIds = await index("weightReturns_" + value.orderId);
        const previous = await Promise.all([...returnIds].map((id2) => get("operations", id2)));
        if (!order || !item || item.mdDeleted || item.orderId !== value.orderId || !shift || !bootstrap && (shift.status !== "open" || !own(shift)) || previous.some((record) => record?.sessionId === value.sessionId)) throw new AccessError("Retur sudah tercatat atau nota berubah.", 409);
        returnIds.add(row.id);
        (await index("shiftWeightReturns_" + value.shiftId)).add(row.id);
        add("pos_operations", row.id, value);
        continue;
      }
      const state = await staff(value.employeeId);
      if (value.kind.startsWith("attendance.")) {
        const key = `${value.employeeId}_${value.sessionId}`, session = sessions.get(key) || await lookup("pos_attendanceSession", key);
        const active = state.activeSession;
        if (value.kind === "attendance.in") {
          if (active || session) {
            value.ignored = true;
            if (active) {
              value.activeSessionId = active.sessionId;
              if (Date.parse(value.at) < Date.parse(active.at)) active.at = value.at;
            }
          } else state.activeSession = { sessionId: value.sessionId, at: value.at };
          if (!session) sessions.set(key, { employeeId: value.employeeId, activeSessionId: active?.sessionId || value.sessionId, at: active?.at || value.at });
        } else {
          if (!session) throw new AccessError("Absensi masuk belum tersedia.", 409);
          if (!active) value.ignored = true;
          else if (session.activeSessionId !== active.sessionId) value.ignored = true;
          else {
            if (Date.parse(value.at) < Date.parse(active.at)) throw new AccessError("Waktu pulang sebelum waktu masuk.", 409);
            value.sessionId = active.sessionId;
            state.activeSession = null;
          }
        }
      }
      if (value.kind === "repayment" && value.amount > state.loanBalance) throw new AccessError("Pembayaran melebihi sisa kasbon.", 409);
      if (value.kind === "loan") state.loanBalance += value.amount;
      if (value.kind === "repayment") state.loanBalance -= value.amount;
      if (value.kind === "commission") {
        const order = await get("orders", value.orderId), item = await get("orderItems", value.orderItemId);
        if (!order || order.status !== "paid" || order.isRefunded || !item || item.orderId !== value.orderId || item.mdDeleted) throw new AccessError("Pilih layanan dari nota lunas.", 409);
        const basis = Math.floor(lineAmount(item.qty, item.hargaSatuan, item.saleUnit === "weight" ? item.priceBasis || 1e3 : 1) * Math.max(0, order.subtotal - (order.discount || 0)) / order.subtotal);
        if (value.basisAmount !== basis || (await index(`commissionItem_${value.orderItemId}`)).size) throw new AccessError("Komisi layanan sudah tercatat atau nilai berubah.", 409);
        (await index(`commissionItem_${value.orderItemId}`)).add(row.id);
        const earned = earnedCommission(value.amount, order);
        state.earned += earned;
        (await commissions(value.orderId)).entries.push({ id: row.id, employeeId: value.employeeId, amount: value.amount, earned });
      }
      if (value.kind === "commission.paid") {
        if (value.amount > state.earned - state.paid) throw new AccessError("Pembayaran melebihi komisi tersedia.", 409);
        state.paid += value.amount;
      }
      if (["loan", "repayment", "commission.paid"].includes(value.kind) && value.source === "laci" && !bootstrap) {
        const movement = changed.get(`cashMovements:${value.cashMovementId}`)?.value;
        const direction = value.kind === "repayment" ? "in" : "out";
        if (!movement || movement.amount !== value.amount || movement.type !== direction || movement.category !== (value.kind === "commission.paid" ? "komisi" : "kasbon_karyawan") || movement.shiftId !== value.shiftId) throw new AccessError("Catatan uang laci tidak sesuai.", 409);
        if (rows.filter((r) => r.table === "operations" && r.value.cashMovementId === value.cashMovementId).length !== 1) throw new AccessError("Catatan uang laci sudah dipakai.", 409);
      }
      if (value.kind === "laundry") {
        const order = await get("orders", value.orderId);
        if (!order) throw new AccessError("Pesanan tidak ditemukan", 409);
        if (claims.role === "cashier" && !own(order)) throw new AccessError("Pesanan ini milik kasir lain");
        const ids = await index(`laundryOrder_${value.orderId}`), last = [...ids].at(-1), previous = last ? await get("operations", last) : void 0;
        if ((value.previousId || void 0) !== last) throw new AccessError("Status pesanan berubah. Perbarui lalu coba lagi", 409);
        try {
          validateLaundryTransition(order, previous?.laundryStage || "received", value.laundryStage);
        } catch (error) {
          throw new AccessError(error.message, 409);
        }
        value.mdTargetDeviceId = order.mdDeviceId;
        value.mdTargetOperatorId = order.mdOperatorId;
        ids.add(row.id);
      }
      if (value.kind === "kitchen") {
        const item = await get("orderItems", value.orderItemId), order = await get("orders", value.orderId);
        if (!item || item.orderId !== value.orderId || item.mdDeleted || !order || order.status === "void" || order.isHistorical) throw new AccessError("Pesanan sudah tidak tersedia.", 409);
        if (claims.role === "cashier" && !own(order)) throw new AccessError("Pesanan ini milik kasir lain.");
        const ids = await index(`kitchenItem_${value.orderItemId}`), last = [...ids].at(-1), previous = last ? await get("operations", last) : void 0;
        if ((value.previousId || void 0) !== last || kitchenStages.indexOf(value.stage) !== kitchenStages.indexOf(previous?.lineSignature === kitchenSignature(item) ? previous.stage : "waiting") + 1) throw new AccessError("Status pesanan berubah. Perbarui lalu coba lagi.", 409);
        if (value.lineSignature !== kitchenSignature(item)) throw new AccessError("Pesanan berubah. Periksa kembali.", 409);
        value.mdTargetDeviceId = order.mdDeviceId;
        value.mdTargetOperatorId = order.mdOperatorId;
        ids.add(row.id);
      }
    }
    if (row.table === "shifts") {
      if (prior?.status === "closed") throw new AccessError("Shift yang ditutup tidak dapat diubah.", 409);
      if (prior && ["startingCash", "startTime", "operatorName"].some((key) => !same(prior[key], value[key]))) throw new AccessError("Modal dan kasir shift tidak dapat diganti.", 409);
      if (!["open", "closed"].includes(value.status)) throw new AccessError("Shift tidak valid.", 400);
      integer(value.startingCash);
      delete value.mdOwnerClosedAt;
      if (value.status === "closed") {
        integer(value.actualCash);
        if (!value.endTime) throw new AccessError("Waktu tutup belum tersedia.", 400);
        if (!bootstrap) {
          value.closedBy = claims.role;
          if (claims.role === "owner") value.mdOwnerClosedAt = Date.now();
        }
      }
    }
    if (row.table === "menuItems") {
      try {
        validateMeasure(value);
      } catch (error) {
        throw new AccessError(error.message, 400);
      }
      if (prior && (prior.saleUnit ?? "pcs") !== (value.saleUnit ?? "pcs")) throw new AccessError("Buat produk baru untuk mengganti satuan.", 409);
      if (!prior && value.saleUnit === "weight" && (claims.role === "cashier" || value.trackStock && value.stockUnit !== "g")) throw new AccessError("Satuan produk tidak valid.", 400);
      integer(value.harga);
      if (typeof value.nama !== "string" || !value.nama.trim() || value.nama.length > 120) throw new AccessError("Nama barang tidak valid.", 400);
      if (value.trackStock && !Number.isSafeInteger(value.stockQty)) throw new AccessError("Stok tidak valid.", 400);
    }
    if (row.table === "orderItems") {
      const order = await get("orders", value.orderId), before = prior && await old("orders", prior.orderId);
      const resolvingDraft = !!prior?.pendingRetailProduct && !value.pendingRetailProduct && !!value.menuItemId;
      if ((before?.paidAmount > 0 || before?.status === "paid") && prior && Object.keys({ ...prior, ...value }).some((key) => !["paidQty", "mdVersion", "costPrice", ...resolvingDraft ? ["menuItemId", "pendingRetailProduct", "mdCatalogVersion"] : []].includes(key) && !same(prior[key], value[key]))) throw new AccessError("Barang pada nota yang sudah dibayar tidak dapat diganti.", 409);
      if (!order) throw new AccessError("Nota tidak tersedia.", 409);
      if (!value.mdDeleted) {
        integer(value.qty, true);
        integer(value.hargaSatuan);
        if (order.isHistorical) {
          if (claims.role === "cashier") throw new AccessError("Riwayat lama hanya dapat dimasukkan pemilik.", 403);
          if (value.saleUnit === "weight") throw new AccessError("Impor nota timbang belum tersedia.", 409);
          value.costPrice = null;
        } else if (value.isQuickSale === true) {
          const settings = await lookup(bootstrap ? "settings" : "settingsVersion", bootstrap ? claims.storeId : `${claims.storeId}_${order.mdSettingsVersion}`);
          const profile = settings?.profile;
          let line;
          try {
            line = validateQuickSaleLine({ nama: value.namaMenu, qty: value.qty, harga: value.hargaSatuan });
          } catch (error) {
            throw new AccessError(error.message, 400);
          }
          if (profile?.businessType !== "quick" || order.tableId || value.menuItemId || value.pendingRetailProduct || value.selectedModifiers?.length || line.nama !== value.namaMenu || value.saleUnit === "weight") throw new AccessError("Penjualan langsung tidak valid.", 400);
          value.costPrice = null;
        } else {
          const product = await get("menuItems", value.menuItemId);
          const version = Number(value.mdCatalogVersion || 0);
          const historical = product?.mdCatalogVersion === version ? product : await lookup("pos_catalogVersion", `${value.menuItemId}_${version}`);
          if (resolvingDraft && (historical?.harga !== prior.hargaSatuan || historical?.nama !== prior.pendingRetailProduct.nama)) throw new AccessError("Barang berbeda dari nota semula.", 409);
          const draft = value.pendingRetailProduct && !value.menuItemId ? validateRetailDraft(value.pendingRetailProduct) : void 0;
          if (draft && (draft.harga !== value.hargaSatuan || value.selectedModifiers?.length)) throw new AccessError("Harga barang tidak sesuai.", 409);
          if (!bootstrap && !draft && (!historical || Number(historical.harga) + (value.selectedModifiers || []).reduce((sum2, item) => sum2 + Number(item.harga), 0) !== value.hargaSatuan)) throw new AccessError("Harga barang tidak sesuai.", 409);
          for (const modifier of value.selectedModifiers || []) {
            if (!bootstrap && (!Array.isArray(historical?.modifiers) || !historical.modifiers.some((group) => group.nama === modifier.groupName && group.options?.some((option) => option.nama === modifier.optionName && option.harga === modifier.harga)))) throw new AccessError("Pilihan barang tidak sesuai.", 409);
          }
          if (!bootstrap) {
            if ((value.saleUnit ?? "pcs") !== (historical?.saleUnit ?? "pcs") || value.saleUnit === "weight" && (value.priceBasis !== (historical?.priceBasis ?? 1e3) || value.selectedModifiers?.length)) {
              throw new AccessError("Satuan barang tidak sesuai.", 409);
            }
            if (value.saleUnit === "weight") {
              const settings = await lookup("settingsVersion", claims.storeId + "_" + order.mdSettingsVersion);
              if (settings?.profile?.serviceCategory === "laundry" && historical?.trackStock) throw new AccessError("Gunakan layanan Laundry tanpa penghitungan stok", 409);
              if (!weightEnabled(settings?.profile?.businessType, settings?.profile?.serviceCategory)) throw new AccessError("Barang timbang hanya tersedia di Retail, Warung, dan Laundry.", 409);
            }
            value.costPrice = historical?.costPrice ?? null;
          }
        }
      }
      (await index(`orderItems_${value.orderId}`)).add(row.id);
    }
    if (row.table === "orders") {
      try {
        validateLaundry(value);
      } catch (error) {
        throw new AccessError(error.message, 400);
      }
      if (prior && !same(prior.serviceCategory, value.serviceCategory)) throw new AccessError("Jenis pesanan tidak dapat diganti", 409);
      if (!bootstrap && !prior && !value.isHistorical && value.tableId) {
        const table = await get("tables", value.tableId);
        const attached = await Promise.all(Array.from(await index("tableOrders_" + value.tableId), (id2) => get("orders", id2)));
        if (attached.some((order) => order && order.mdId !== row.id && order.tableId === value.tableId && !order.isTableCleared && !order.isHistorical && ["paid", "unpaid"].includes(order.status))) {
          throw new AccessError("Meja masih digunakan. Buka tagihan yang ada atau lepas meja setelah pelanggan pulang.", 409);
        }
        if (!table || table.mdDeleted) throw new AccessError("Meja tidak tersedia.", 409);
      }
      if (claims.role === "cashier" && value.isHistorical) throw new AccessError("Riwayat lama hanya dapat dimasukkan pemilik.", 403);
      if (value.tableId) (await index(`tableOrders_${value.tableId}`)).add(row.id);
      for (const field of ["subtotal", "discount", "tax", "serviceCharge", "total"]) if (value[field] != null) integer(value[field]);
      if (prior && Number(prior.paidAmount) > 0 && ["total", "subtotal", "discount", "tax", "serviceCharge", "shiftId"].some((field) => !same(prior[field], value[field]))) throw new AccessError("Nilai nota yang dibayar tidak dapat diganti.", 409);
      if (value.status === "void" && claims.role !== "owner") throw new AccessError("Pembatalan memerlukan akses pemilik.");
      if (!bootstrap && !prior && !value.isHistorical) {
        const settings = await lookup("settingsVersion", `${claims.storeId}_${value.mdSettingsVersion}`), profile = settings?.profile;
        if (value.serviceCategory === "laundry" && (profile?.businessType !== "service" || profile?.serviceCategory !== "laundry")) throw new AccessError("Pilih usaha Laundry terlebih dahulu", 409);
        const net = Number(value.subtotal) - Number(value.discount || 0), service = profile?.enableService ? Math.round(net * Number(profile.servicePercent || 0) / 100) : 0;
        const tax = profile?.enableTax ? Math.round((net + (profile.taxAppliesToService ? service : 0)) * Number(profile.taxPercent || 0) / 100) : 0;
        if (Number(value.serviceCharge || 0) !== service || Number(value.tax || 0) !== tax) throw new AccessError("Pajak atau biaya layanan tidak sesuai.", 409);
      }
    }
    if (row.table === "payments") {
      integer(value.amount, true);
      if (!["completed", "refunded"].includes(value.status)) throw new AccessError("Pembayaran tidak valid.", 400);
      if (!["Cash", "QRIS", "Transfer"].includes(value.paymentMethod)) throw new AccessError("Pembayaran tidak valid.", 400);
      if (!bootstrap && !prior && value.status !== "completed") throw new AccessError("Pengembalian harus berasal dari pembayaran yang sudah diterima.", 403);
      if (!bootstrap && !prior && ["mdRefundAmount", "cashRefundAmount", "mdRefundMethod", "refundShiftId", "refundedAt"].some((key) => value[key] != null)) throw new AccessError("Pembayaran baru tidak dapat berisi pengembalian.", 400);
      if (claims.role === "cashier" && value.paymentMethod !== "Cash" && value.proofStatus === "terverifikasi") {
        const proof = value.proofId ? await get("paymentProofs", value.proofId) : void 0;
        if (prior?.proofStatus !== "terverifikasi" || !same(prior.proofId, value.proofId) || proof && proof.status !== "terverifikasi") throw new AccessError("Konfirmasi pembayaran memerlukan akses pemilik.", 403);
      }
      if (prior && ["amount", "orderId", "shiftId", "paymentMethod", "paidAt", "itemsPaid"].some((field) => !same(prior[field], value[field]))) throw new AccessError("Pembayaran yang tersimpan tidak dapat diganti.", 409);
      const paymentOrder = await get("orders", value.orderId);
      const isHistoricalPayment = !!paymentOrder?.isHistorical;
      const shift = value.shiftId ? await get("shifts", value.shiftId) : null, beforeShift = value.shiftId ? await old("shifts", value.shiftId) : null;
      const isLateCashierPayment = acceptsLate(beforeShift);
      if (isLateCashierPayment && value.shiftId) lateClosedShiftIds.add(value.shiftId);
      const shiftClosedRejection = beforeShift?.status === "closed" && !isLateCashierPayment;
      if (!bootstrap && !prior && !isHistoricalPayment && (!shift || shiftClosedRejection || shift.mdDeviceId !== claims.deviceId || shift.mdOperatorId !== event.operatorId)) throw new AccessError("Mulai shift kasir terlebih dahulu.", 409);
      if (isHistoricalPayment && claims.role === "cashier") throw new AccessError("Riwayat lama hanya dapat dimasukkan pemilik.", 403);
      if (prior?.status === "refunded" && value.status !== "refunded") throw new AccessError("Pengembalian tidak dapat dibatalkan.", 409);
      if (prior?.status === "refunded" && ["mdRefundAmount", "cashRefundAmount", "mdRefundMethod", "refundShiftId", "refundedAt"].some((key) => !same(prior[key], value[key]))) throw new AccessError("Pengembalian yang tersimpan tidak dapat diganti.", 409);
      if (prior && prior.status !== value.status) {
        if (claims.role !== "owner") throw new AccessError();
        const refundShift = await get("shifts", value.refundShiftId);
        if (!refundShift || refundShift.status !== "open" || !own(refundShift)) throw new AccessError("Mulai shift pengembalian terlebih dahulu.", 409);
        integer(value.cashRefundAmount);
        integer(value.mdRefundAmount);
        if (value.cashRefundAmount > value.mdRefundAmount || value.mdRefundAmount > value.amount) throw new AccessError("Pengembalian tidak sesuai pembayaran.", 400);
      }
      (await index(`payments_${value.orderId}`)).add(row.id);
      if (value.shiftId) (await index(`shiftPayments_${value.shiftId}`)).add(row.id);
      if (value.refundShiftId) (await index(`shiftRefunds_${value.refundShiftId}`)).add(row.id);
    }
    if (row.table === "inventoryMovements") {
      if (prior) throw new AccessError("Catatan stok yang tersimpan tidak dapat diganti.", 409);
      if (!Number.isSafeInteger(value.delta)) throw new AccessError("Jumlah stok tidak valid.", 400);
      if (!["opening", "in", "out", "count", "sale", "return"].includes(value.type)) throw new AccessError("Catatan stok tidak valid.", 400);
      if (value.type === "sale" && value.delta >= 0 || value.type === "return" && value.delta <= 0) throw new AccessError("Jumlah stok tidak sesuai nota.", 400);
      if (value.type === "count") {
        const product = await old("menuItems", value.menuItemId);
        if (Number(value.balance) - value.delta !== Number(product?.stockQty || 0)) throw new AccessError("Stok berubah. Muat ulang opname.", 409);
      }
      if (claims.role === "cashier" && !["sale", "return"].includes(value.type)) throw new AccessError("Stok hanya dapat diubah pemilik.");
      if (["sale", "return"].includes(value.type) && !value.orderId) throw new AccessError("Nota stok tidak tersedia.", 400);
    }
    if (row.table === "cashMovements") {
      integer(value.amount, true);
      const shift = await get("shifts", value.shiftId);
      const isLateCashierMovement = acceptsLate(shift);
      if (isLateCashierMovement && value.shiftId) lateClosedShiftIds.add(value.shiftId);
      if (!shift || !bootstrap && shift.status !== "open" && !isLateCashierMovement || !own(shift)) throw new AccessError("Gunakan shift kasir sendiri.");
      if (prior) throw new AccessError("Catatan kas tidak dapat ditimpa.");
      if (!["in", "out"].includes(value.type)) throw new AccessError("Catatan kas tidak valid.", 400);
      if (!bootstrap && ["kasbon_karyawan", "komisi"].includes(value.category) && !rows.some((r) => r.table === "operations" && r.value.cashMovementId === row.id && r.value.source === "laci")) throw new AccessError("Catatan karyawan belum tersedia.", 409);
      (await index(`shiftCash_${value.shiftId}`)).add(row.id);
    }
    if (row.table === "auditLogs" && prior) throw new AccessError("Catatan aktivitas tidak dapat ditimpa.");
    if (row.table === "paymentProofs") {
      if (prior && ["orderId", "paymentId"].some((field) => !same(prior[field], value[field]))) throw new AccessError("Bukti pembayaran tidak dapat dipindahkan.", 403);
      if (claims.role === "cashier" && (value.status === "terverifikasi" || (await get("payments", value.paymentId))?.proofStatus === "terverifikasi")) throw new AccessError("Konfirmasi pembayaran memerlukan akses pemilik.");
    }
    if (row.table === "menuItems" && prior) {
      add("pos_menuItems", row.id, { ...stockOnly ? prior : value, mdVersion: Number(prior.mdVersion) + 1 });
    } else add(`pos_${row.table}`, row.id, { ...value, ...tableStatusOnly ? { mdVersion: Number(prior.mdVersion) + 1 } : {} });
    if (row.table === "menuItems" && !stockOnly) add("pos_catalogVersion", `${row.id}_${value.mdCatalogVersion}`, { ...value });
  }
  const tableIds = new Set(rows.filter((row) => row.table === "tables").map((row) => row.id));
  for (const row of rows) if (row.table === "orders") {
    if (row.value.tableId) tableIds.add(row.value.tableId);
    const prior = await old("orders", row.id);
    if (prior?.tableId) tableIds.add(prior.tableId);
  }
  for (const id2 of tableIds) {
    const table = result.get(`pos_tables:${id2}`)?.value || await get("tables", id2);
    if (!table) continue;
    const notes = await Promise.all(Array.from(await index(`tableOrders_${id2}`), (orderId) => get("orders", orderId)));
    const attached = notes.filter((note) => note && note.tableId === id2 && !note.isTableCleared && note.status !== "void");
    const status = attached.some((note) => note?.status === "unpaid") ? "open" : attached.length ? "lunas" : "kosong";
    add("pos_tables", id2, { ...table, status });
  }
  const affected = new Set(rows.filter((row) => ["orders", "orderItems", "payments", "inventoryMovements"].includes(row.table) && (row.table === "orders" || row.value.orderId)).map((row) => row.table === "orders" ? row.id : String(row.value.orderId)));
  for (const orderId of affected) {
    const order = await get("orders", orderId);
    if (!order) throw new AccessError("Nota tidak tersedia.", 409);
    const itemIds = await index(`orderItems_${orderId}`), paymentIds = await index(`payments_${orderId}`);
    let subtotal = 0, paid = 0;
    const reserved = /* @__PURE__ */ new Map(), previousOrder = await old("orders", orderId);
    const lines = [];
    for (const id2 of itemIds) {
      const item = await get("orderItems", id2);
      if (!item || item.mdDeleted) continue;
      lines.push({ id: id2, qty: Number(item.qty), hargaSatuan: Number(item.hargaSatuan), saleUnit: item.saleUnit, priceBasis: item.priceBasis });
      subtotal += lineAmount(item.qty, Number(item.hargaSatuan), item.saleUnit === "weight" ? Number(item.priceBasis || 1e3) : 1);
      if (!order.isHistorical && (order.status !== "void" || Number(previousOrder?.paidAmount) > 0) && item.menuItemId) {
        reserved.set(item.menuItemId, (reserved.get(item.menuItemId) || 0) + item.qty);
      }
    }
    const stockBefore = await lookup("pos_reservation", orderId), oldReserved = stockBefore?.quantities || {};
    for (const productId of /* @__PURE__ */ new Set([...Object.keys(oldReserved), ...reserved.keys(), ...rows.filter((row) => row.table === "inventoryMovements" && row.value.orderId === orderId).map((row) => String(row.value.menuItemId))])) {
      const product = await get("menuItems", productId);
      const movements = rows.filter((row) => row.table === "inventoryMovements" && row.value.orderId === orderId && row.value.menuItemId === productId);
      if (!bootstrap && movements.some((row) => !["sale", "return"].includes(row.value.type))) throw new AccessError("Penyesuaian stok tidak dapat memakai nota penjualan.", 403);
      if (!product?.trackStock) {
        if (!bootstrap && movements.length) throw new AccessError("Produk pada nota tidak memakai stok.", 409);
        continue;
      }
      const expected = Number(oldReserved[productId] || 0) - Number(reserved.get(productId) || 0);
      const actual = movements.reduce((n, row) => n + row.value.delta, 0);
      if (!bootstrap && (expected !== actual || movements.some((row) => expected === 0 || (expected < 0 ? row.value.type !== "sale" : row.value.type !== "return")))) throw new AccessError("Perubahan stok tidak sesuai barang pada nota.", 409);
    }
    add("pos_reservation", orderId, { quantities: Object.fromEntries(reserved) });
    if (!bootstrap && (order.subtotal !== subtotal || Number(order.discount || 0) > subtotal || order.total !== subtotal - Number(order.discount || 0) + Number(order.tax || 0) + Number(order.serviceCharge || 0))) throw new AccessError("Perhitungan nota tidak sesuai.", 409);
    const paidItems = /* @__PURE__ */ new Map(), nonCash = [];
    const hasWeight = lines.some((line) => line.saleUnit === "weight");
    for (const id2 of paymentIds) {
      const payment = await get("payments", id2);
      if (payment && payment.status === "completed") {
        if (!bootstrap && hasWeight && payment.splitType === "item" && changed.has("payments:" + id2) && !await old("payments", id2)) {
          try {
            const items = lines.map((line) => ({ ...line, paidQty: paidItems.get(line.id) ?? 0 }));
            const amount2 = measuredSplitAmount({ total: order.total }, items, payment.itemsPaid || []);
            if (payment.amount !== Math.min(order.total - paid, amount2)) throw new Error("Nominal pembayaran barang tidak sesuai.");
          } catch (error) {
            throw new AccessError(error.message, 409);
          }
        }
        paid += Number(payment.amount);
        if (payment.paymentMethod !== "Cash") nonCash.push(payment);
        if (payment.splitType === "item" && !bootstrap) for (const item of payment.itemsPaid || []) {
          integer(item.qty, true);
          integer(item.harga);
          let matched;
          for (const lineId of itemIds) {
            const line = await get("orderItems", lineId);
            if (line && !line.mdDeleted && line.hargaSatuan === item.harga && (item.orderItemId ? lineId === item.orderItemId : line.menuItemId === item.menuItemId)) {
              matched = lineId;
              break;
            }
          }
          if (!matched) throw new AccessError("Barang pembayaran tidak sesuai nota.", 409);
          paidItems.set(matched, (paidItems.get(matched) || 0) + item.qty);
        }
      }
    }
    const legacyPaid = previousOrder?.status === "paid" && previousOrder.paidAmount === 0 && paymentIds.size === 0;
    if (!bootstrap && order.status === "paid" && paid !== order.total && !legacyPaid) throw new AccessError("Nota belum lunas. Lengkapi pembayaran terlebih dahulu.", 409);
    if (paid > order.total) throw new AccessError("Pembayaran melebihi tagihan.", 409);
    if (!bootstrap) for (const id2 of itemIds) {
      const item = await get("orderItems", id2);
      if (!item || item.mdDeleted) continue;
      const paidQty = paidItems.get(id2) || 0;
      if (paidQty > item.qty) throw new AccessError("Jumlah barang sudah dibayar.", 409);
      add("pos_orderItems", id2, { ...item, paidQty: paid === order.total ? item.qty : paidQty });
    }
    const verificationStatus = paid === 0 && !legacyPaid ? "menunggu_bukti" : nonCash.every((p) => p.proofStatus === "terverifikasi") ? "terverifikasi" : nonCash.some((p) => p.proofStatus === "menunggu_verifikasi") ? "menunggu_verifikasi" : "menunggu_bukti";
    add("pos_orders", orderId, { ...order, paidAmount: paid, remainingBalance: order.total - paid, ...!bootstrap ? { verificationStatus } : {} });
  }
  for (const row of rows) if (row.table === "operations" && row.value.kind === "weight.return") {
    const value = row.value;
    const order = await get("orders", value.orderId);
    const item = await get("orderItems", value.orderItemId);
    const ids = [...await index("weightReturns_" + value.orderId)];
    const previous = await Promise.all(ids.slice(0, ids.indexOf(row.id)).map((id2) => get("operations", id2)));
    const items = await Promise.all([...await index("orderItems_" + value.orderId)].map(async (id2) => ({ ...await get("orderItems", id2), id: id2 })));
    const payments = (await Promise.all([...await index("payments_" + value.orderId)].map((id2) => get("payments", id2)))).filter(Boolean);
    if (!bootstrap) {
      try {
        const quote = quoteWeightReturn(order, items.filter((line) => !line.mdDeleted), payments, previous, value.orderItemId, value.grams);
        if (value.amount !== quote.amount || Object.keys(value.returnPayments || {}).length !== Object.keys(quote.returnPayments).length || returnMethods.some((method) => value.returnPayments?.[method] !== quote.returnPayments[method])) throw new Error("Nilai retur tidak sesuai.");
      } catch (error) {
        throw new AccessError(error.message, 409);
      }
    }
    if (value.restock) {
      const movement = changed.get("inventoryMovements:" + value.inventoryMovementId)?.value;
      const product = await get("menuItems", item.menuItemId);
      const reservation = await lookup("pos_reservation", value.orderId);
      const restored = previous.filter((r) => r?.restock && items.some((line) => line.id === r.orderItemId && line.menuItemId === item.menuItemId)).reduce((sum2, r) => sum2 + r.grams, 0);
      if (!movement || movement.type !== "in" || movement.orderId || movement.menuItemId !== item.menuItemId || movement.delta !== value.grams || !bootstrap && (!product?.trackStock || product.mdDeleted || product.saleUnit !== "weight" || Number(reservation?.quantities?.[item.menuItemId] || 0) < restored + value.grams) || rows.filter((r) => r.table === "operations" && r.value.inventoryMovementId === value.inventoryMovementId).length !== 1) {
        throw new AccessError("Stok retur tidak sesuai nota.", 409);
      }
    }
  }
  for (const orderId of affected) {
    const ids = await index("weightReturns_" + orderId);
    if (!ids.size || bootstrap) continue;
    const order = await get("orders", orderId);
    const payments = (await Promise.all([...await index("payments_" + orderId)].map((id2) => get("payments", id2)))).filter(Boolean);
    const returns = await Promise.all([...ids].map((id2) => get("operations", id2)));
    for (const method of returnMethods) {
      const received = payments.filter((p) => p.paymentMethod === method).reduce((sum2, p) => sum2 + p.amount, 0);
      const full = payments.filter((p) => p.status === "refunded" && p.paymentMethod === method).reduce((sum2, p) => sum2 + (p.mdRefundAmount ?? p.amount), 0);
      const partial = returns.reduce((sum2, record) => sum2 + (record?.returnPayments?.[method] ?? 0), 0);
      if (full + partial > received || order.status === "void" && full + partial !== received) throw new AccessError("Nilai retur melebihi sisa pembayaran.", 409);
    }
  }
  for (const orderId of affected) {
    const grants = await commissions(orderId), order = result.get(`pos_orders:${orderId}`)?.value || await get("orders", orderId);
    for (const grant2 of grants.entries) {
      const earned = earnedCommission(grant2.amount, order);
      if (earned !== grant2.earned) {
        const state = await staff(grant2.employeeId);
        state.earned += earned - grant2.earned;
        grant2.earned = earned;
      }
    }
  }
  for (const row of rows) if (row.table === "operations" && row.value.kind === "commission.paid") {
    const state = await staff(row.value.employeeId);
    if (state.paid > state.earned) throw new AccessError("Pembayaran melebihi komisi tersedia.", 409);
  }
  for (const [id2, state] of staffStates) add("pos_employeeState", id2, state);
  for (const [id2, value] of commissionOrders) if (value.entries.length) add("pos_orderCommissions", id2, value);
  for (const [id2, value] of sessions) add("pos_attendanceSession", id2, value);
  for (const row of rows) if (row.table === "shifts" && row.value.status === "closed" && !bootstrap) {
    lateClosedShiftIds.add(row.id);
  }
  for (const shiftId of lateClosedShiftIds) {
    const shiftRow = result.get(`pos_shifts:${shiftId}`)?.value || await get("shifts", shiftId);
    if (!shiftRow || shiftRow.status !== "closed") continue;
    const payments = await Promise.all(Array.from(await index(`shiftPayments_${shiftId}`), (id2) => get("payments", id2)));
    const refunds = await Promise.all(Array.from(await index(`shiftRefunds_${shiftId}`), (id2) => get("payments", id2)));
    const movements = await Promise.all(Array.from(await index(`shiftCash_${shiftId}`), (id2) => get("cashMovements", id2)));
    const sum2 = /* @__PURE__ */ __name((items, filter, field = "amount") => items.reduce((n, v) => n + (v && filter(v) ? Number(v[field] || 0) : 0), 0), "sum");
    const cashSales = sum2(payments, (p) => p.paymentMethod === "Cash"), nonCashSales = sum2(payments, (p) => p.paymentMethod !== "Cash" && p.status === "completed");
    const verifiedNonCashSales = sum2(payments, (p) => p.paymentMethod !== "Cash" && p.status === "completed" && p.proofStatus === "terverifikasi");
    const weightReturns = await Promise.all([...await index("shiftWeightReturns_" + shiftId)].map((id2) => get("operations", id2)));
    const cashRefunds = sum2(refunds, (p) => p.status === "refunded", "cashRefundAmount") + weightReturns.reduce((sum3, r) => sum3 + (r?.returnPayments?.Cash ?? 0), 0), cashIn = sum2(movements, (m) => m.type === "in"), cashOut = sum2(movements, (m) => m.type === "out");
    const expectedCash = shiftRow.startingCash + cashSales - cashRefunds + cashIn - cashOut;
    const stats = { cashSales, nonCashSales, verifiedNonCashSales, unverifiedNonCashSales: nonCashSales - verifiedNonCashSales, cashRefunds, cashIn, cashOut, expectedCash, totalTransactions: payments.filter((p) => p?.status === "completed").length, movements: [] };
    const isDirectShiftCommit = rows.some((r) => r.table === "shifts" && r.id === shiftId);
    const nextVersion = isDirectShiftCommit ? shiftRow.mdVersion : Number(shiftRow.mdVersion || 0) + 1;
    add("pos_shifts", shiftId, { ...shiftRow, ...stats, cashDifference: shiftRow.actualCash - expectedCash, mdClosedStats: stats, ...isDirectShiftCommit ? {} : { mdVersion: nextVersion } });
  }
  for (const [id2, ids] of indices) add("pos_index", id2, { ids: Array.from(ids) });
  const stockChanges = /* @__PURE__ */ new Map();
  for (const row of rows) if (row.table === "inventoryMovements" && !bootstrap) stockChanges.set(row.value.menuItemId, (stockChanges.get(row.value.menuItemId) || 0) + row.value.delta);
  for (const id2 of /* @__PURE__ */ new Set([...stockChanges.keys(), ...rows.filter((row) => row.table === "menuItems").map((row) => row.id)])) {
    const delta = stockChanges.get(id2) || 0, previous = await old("menuItems", id2), product = result.get(`pos_menuItems:${id2}`)?.value || await get("menuItems", id2);
    if (!product) throw new AccessError("Barang stok tidak ditemukan.", 409);
    const stockQty = bootstrap && !previous ? Number(product.stockQty || 0) : Number(previous?.stockQty || 0) + delta;
    add("pos_menuItems", id2, { ...product, stockQty, isSoldOut: product.trackStock ? stockQty <= 0 : product.isSoldOut, stockNeedsReview: !!product.trackStock && stockQty < 0 });
  }
  return Array.from(result.values());
}
__name(projectPosCommit, "projectPosCommit");
function visiblePosEntity(entity, claims) {
  if (!entity.kind.startsWith("pos_")) return void 0;
  if (claims.role === "owner") return entity;
  if (["pos_index", "pos_catalogVersion", "pos_reservation"].includes(entity.kind)) return void 0;
  if (entity.kind === "pos_operations" && entity.value.kind === "kitchen") {
    const fields = ["kind", "employeeId", "employeeName", "at", "orderId", "orderItemId", "stage", "sessionId", "previousId", "lineSignature", "mdId", "mdVersion", "mdStoreId", "mdDeviceId", "mdOperatorId", "mdTargetDeviceId", "mdTargetOperatorId"];
    return { ...entity, value: Object.fromEntries(fields.filter((key) => key in entity.value).map((key) => [key, entity.value[key]])) };
  }
  if (entity.kind === "pos_operations" && entity.value.kind === "laundry") {
    return entity.value.mdTargetDeviceId === claims.deviceId && entity.value.mdTargetOperatorId === claims.employeeId ? entity : void 0;
  }
  if (entity.kind === "pos_operations" && ["attendance.in", "attendance.out"].includes(String(entity.value.kind)) && entity.value.employeeId === claims.employeeId) return entity;
  if (!["pos_menuItems", "pos_tables"].includes(entity.kind) && (entity.value.mdDeviceId !== claims.deviceId || entity.value.mdOperatorId !== claims.employeeId)) return void 0;
  const { costPrice: _cost, purchasePrice: _purchase, totalCost: _total, ...value } = entity.value;
  return { ...entity, value };
}
__name(visiblePosEntity, "visiblePosEntity");

// src/lib/multidevice/posProfile.ts
var POS_PROFILE_FIELDS = ["storeName", "storeAddress", "storePhone", "receiptFooter", "paperWidth", "enableWatermark", "serviceMode", "taxName", "taxPercent", "enableTax", "taxAppliesToService", "servicePercent", "enableService", "businessType", "serviceCategory", "storeLogo", "receiptHeader", "receiptCustomNote", "receiptShowLogo", "receiptShowCashier", "receiptShowCustomer", "receiptShowTable", "receiptShowNotes"];

// src/lib/multidevice/projection.ts
function only(data, keys) {
  if (Object.keys(data).some((key) => !keys.includes(key))) throw new AccessError("Data tidak valid.", 400);
}
__name(only, "only");
function id(value) {
  assertId(value);
  return value;
}
__name(id, "id");
function amount(value) {
  return integer(value);
}
__name(amount, "amount");
function sum(a, b) {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new AccessError("Jumlah terlalu besar.", 400);
  return result;
}
__name(sum, "sum");
async function project(event, claims, lookup, authorization = {}) {
  validateEnvelope(event, claims);
  if (event.kind === "pos.commit") return projectPosCommit(event, claims, lookup, authorization);
  const d = event.data, entityId = event.entityId;
  const existing = await lookup(event.kind.split(".")[0], entityId);
  const owned = /* @__PURE__ */ __name((row) => {
    if (row.deviceId !== claims.deviceId || row.operatorId !== event.operatorId) throw new AccessError("Transaksi ini milik kasir lain.");
  }, "owned");
  const shift = /* @__PURE__ */ __name(async (value) => {
    const shiftId = id(value), row = await lookup("shift", shiftId);
    if (!row || row.status !== "open") throw new AccessError("Mulai shift terlebih dahulu.", 409);
    owned(row);
    return { shiftId, row };
  }, "shift");
  if (event.kind === "catalog.put") {
    only(d, ["expectedVersion", "name", "price", "cost", "unit", "priceBasis", "active"]);
    const expected = integer(d.expectedVersion);
    if (expected !== Number(existing?.version || 0)) throw new AccessError("Data harga sudah berubah. Perbarui data.", 409);
    if (d.unit !== "pcs" && d.unit !== "g") throw new AccessError("Satuan tidak valid.", 400);
    const basis = integer(d.priceBasis, true);
    if (existing && existing.unit !== d.unit) throw new AccessError("Satuan barang yang sudah tersimpan tidak dapat diganti.", 409);
    if (d.unit === "pcs" && basis !== 1 || d.unit === "g" && ![100, 1e3].includes(basis)) throw new AccessError("Satuan tidak valid.", 400);
    if (typeof d.active !== "boolean") throw new AccessError("Data tidak valid.", 400);
    const product = { id: entityId, version: expected + 1, name: text(d.name), price: amount(d.price), cost: d.cost === null ? null : amount(d.cost), unit: d.unit, priceBasis: basis, active: d.active };
    return [{ kind: "catalog", id: entityId, value: { ...product } }, { kind: "catalogVersion", id: `${entityId}_${product.version}`, value: { ...product } }];
  }
  if (event.kind === "settings.put") {
    only(d, ["expectedVersion", "storeName", "receiptFooter", "profile"]);
    const expected = integer(d.expectedVersion);
    if (expected !== Number(existing?.version || 0)) throw new AccessError("Pengaturan sudah berubah. Perbarui data.", 409);
    if (typeof d.receiptFooter !== "string" || d.receiptFooter.length > 200) throw new AccessError("Catatan terlalu panjang.", 400);
    let profile;
    if (d.profile !== void 0) {
      if (!d.profile || typeof d.profile !== "object" || Array.isArray(d.profile)) throw new AccessError("Pengaturan tidak valid.", 400);
      profile = d.profile;
      only(profile, [...POS_PROFILE_FIELDS]);
      for (const key of ["taxPercent", "servicePercent"]) if (profile[key] !== void 0 && (typeof profile[key] !== "number" || !Number.isFinite(profile[key]) || Number(profile[key]) < 0 || Number(profile[key]) > 100)) throw new AccessError("Persentase tidak valid.", 400);
      for (const [key, value] of Object.entries(profile)) {
        if (key.startsWith("enable") || key.startsWith("receiptShow") || key === "taxAppliesToService") {
          if (typeof value !== "boolean") throw new AccessError("Pengaturan tidak valid.", 400);
        } else if (!["taxPercent", "servicePercent"].includes(key) && (typeof value !== "string" || value.length > (key === "storeLogo" ? 4e5 : 1e3))) throw new AccessError("Pengaturan tidak valid.", 400);
      }
      if ((profile.businessType === "service" || profile.serviceCategory !== void 0) && !isServiceCategory(profile.serviceCategory)) {
        throw new AccessError("Pilih bidang jasa.", 400);
      }
      if (profile.serviceMode !== void 0 && !["resto", "quick"].includes(String(profile.serviceMode))) throw new AccessError("Pengaturan tidak valid.", 400);
      if (profile.paperWidth !== void 0 && !["58mm", "80mm"].includes(String(profile.paperWidth))) throw new AccessError("Pengaturan tidak valid.", 400);
    }
    return [{ kind: "settings", id: entityId, value: { version: expected + 1, storeName: text(d.storeName), receiptFooter: d.receiptFooter, ...profile ? { profile } : {} } }, { kind: "settingsVersion", id: `${entityId}_${expected + 1}`, value: { version: expected + 1, profile } }];
  }
  if (event.kind === "shift.open") {
    only(d, ["startingCash"]);
    if (existing) throw new AccessError("Shift sudah tercatat.", 409);
    const live = await lookup("activeShift", `${claims.deviceId}_${event.operatorId}`);
    if (live?.shiftId) throw new AccessError("Tutup shift sebelumnya.", 409);
    return [
      { kind: "shift", id: entityId, value: { deviceId: claims.deviceId, operatorId: event.operatorId, status: "open", startingCash: amount(d.startingCash), cashSales: 0, nonCashSales: 0, cashRefunds: 0, nonCashRefunds: 0 } },
      { kind: "activeShift", id: `${claims.deviceId}_${event.operatorId}`, value: { shiftId: entityId, deviceId: claims.deviceId, operatorId: event.operatorId } }
    ];
  }
  if (event.kind === "shift.close") {
    only(d, ["actualCash"]);
    if (!existing || existing.status !== "open") throw new AccessError("Shift sudah ditutup.", 409);
    owned(existing);
    const actualCash = amount(d.actualCash), expectedCash = sum(Number(existing.startingCash), Number(existing.cashSales)) - Number(existing.cashRefunds);
    return [
      { kind: "shift", id: entityId, value: { ...existing, status: "closed", actualCash, expectedCash, cashDifference: actualCash - expectedCash } },
      { kind: "activeShift", id: `${claims.deviceId}_${event.operatorId}`, value: { shiftId: null, deviceId: claims.deviceId, operatorId: event.operatorId } }
    ];
  }
  if (event.kind === "order.create") {
    only(d, ["shiftId", "lines", "customerName"]);
    if (existing) throw new AccessError("Nota sudah tercatat.", 409);
    const { shiftId } = await shift(d.shiftId);
    if (!Array.isArray(d.lines) || !d.lines.length || d.lines.length > 200) throw new AccessError("Pilih barang terlebih dahulu.", 400);
    const lines = [], stocks = /* @__PURE__ */ new Map();
    let total = 0;
    for (const raw of d.lines) {
      if (!raw || typeof raw !== "object") throw new AccessError("Barang tidak valid.", 400);
      only(raw, ["productId", "catalogVersion", "name", "quantity", "unit", "price", "priceBasis"]);
      const line = raw, productId = id(line.productId), version = integer(line.catalogVersion, true), quantity = integer(line.quantity, true);
      const product = await lookup("catalogVersion", `${productId}_${version}`);
      if (!product || !product.active || line.price !== product.price || line.priceBasis !== product.priceBasis || line.unit !== product.unit || line.name !== product.name) throw new AccessError("Harga barang perlu diperbarui.", 409);
      const lineTotal2 = lineAmount(quantity, Number(product.price), Number(product.priceBasis));
      total = sum(total, lineTotal2);
      lines.push({ ...line, cost: product.cost, lineTotal: lineTotal2, returnedQuantity: 0 });
      const stock = stocks.get(productId) || await lookup("stock", productId) || { quantity: 0 };
      const remaining = sum(Number(stock.quantity), -quantity);
      stocks.set(productId, { quantity: remaining, needsReview: remaining < 0 });
    }
    return [
      { kind: "order", id: entityId, value: { deviceId: claims.deviceId, operatorId: event.operatorId, shiftId, lines, total, paid: 0, refunded: 0, customerName: d.customerName === void 0 ? "" : text(d.customerName), status: "unpaid" } },
      ...Array.from(stocks, ([id2, value]) => ({ kind: "stock", id: id2, value }))
    ];
  }
  if (event.kind === "payment.record") {
    only(d, ["orderId", "shiftId", "amount", "method"]);
    if (existing) throw new AccessError("Pembayaran sudah tercatat.", 409);
    const orderId = id(d.orderId), order = await lookup("order", orderId);
    if (!order) throw new AccessError("Nota belum diterima. Perbarui data.", 409);
    owned(order);
    const { shiftId, row } = await shift(d.shiftId);
    if (order.shiftId !== shiftId) throw new AccessError("Gunakan shift nota ini.", 409);
    const paid = integer(d.amount, true), remaining = Number(order.total) - Number(order.paid);
    if (paid > remaining) throw new AccessError("Pembayaran melebihi tagihan.", 409);
    if (!["Cash", "QRIS", "Transfer"].includes(String(d.method))) throw new AccessError("Pilih pembayaran.", 400);
    const field = d.method === "Cash" ? "cashSales" : "nonCashSales";
    return [
      { kind: "payment", id: entityId, value: { orderId, shiftId, deviceId: claims.deviceId, operatorId: event.operatorId, amount: paid, method: d.method, refunded: 0 } },
      { kind: "order", id: orderId, value: { ...order, paid: sum(Number(order.paid), paid), status: paid === remaining ? "paid" : "unpaid" } },
      { kind: "shift", id: shiftId, value: { ...row, [field]: sum(Number(row[field]), paid) } }
    ];
  }
  if (event.kind === "refund.record") {
    only(d, ["paymentId", "shiftId", "amount", "reason", "returns"]);
    if (existing) throw new AccessError("Pengembalian sudah tercatat.", 409);
    const paymentId = id(d.paymentId), payment = await lookup("payment", paymentId);
    if (!payment) throw new AccessError("Pembayaran belum diterima.", 409);
    const orderId = id(payment.orderId), order = await lookup("order", orderId);
    if (!order) throw new AccessError("Nota belum diterima.", 409);
    const { shiftId, row } = await shift(d.shiftId), refund = integer(d.amount, true);
    if (refund > Number(payment.amount) - Number(payment.refunded)) throw new AccessError("Pengembalian melebihi pembayaran.", 409);
    const lines = structuredClone(order.lines);
    const stocks = /* @__PURE__ */ new Map();
    let returnAmount = 0;
    if (d.returns !== void 0) {
      if (!Array.isArray(d.returns) || d.returns.length > 200) throw new AccessError("Barang tidak valid.", 400);
      for (const returned of d.returns) {
        only(returned, ["line", "quantity"]);
        const index = integer(returned.line), quantity = integer(returned.quantity, true), line = lines[index];
        if (!line || quantity > Number(line.quantity) - Number(line.returnedQuantity)) throw new AccessError("Jumlah pengembalian tidak sesuai.", 409);
        const before = Number(line.returnedQuantity), after = before + quantity;
        returnAmount = sum(returnAmount, lineAmount(after, Number(line.price), Number(line.priceBasis)) - (before === 0 ? 0 : lineAmount(before, Number(line.price), Number(line.priceBasis))));
        line.returnedQuantity = after;
        const productId = id(line.productId), stock = stocks.get(productId) || await lookup("stock", productId) || { quantity: 0 };
        const next = sum(Number(stock.quantity), quantity);
        stocks.set(productId, { quantity: next, needsReview: next < 0 });
      }
      if (returnAmount !== refund) throw new AccessError("Nominal pengembalian tidak sesuai barang.", 409);
    }
    const field = payment.method === "Cash" ? "cashRefunds" : "nonCashRefunds";
    return [
      { kind: "refund", id: entityId, value: { paymentId, orderId, shiftId, amount: refund, reason: text(d.reason, 300), deviceId: claims.deviceId, operatorId: event.operatorId, returns: d.returns || [] } },
      { kind: "payment", id: paymentId, value: { ...payment, refunded: sum(Number(payment.refunded), refund) } },
      { kind: "order", id: orderId, value: { ...order, lines, refunded: sum(Number(order.refunded), refund) } },
      { kind: "shift", id: shiftId, value: { ...row, [field]: sum(Number(row[field]), refund) } },
      ...Array.from(stocks, ([id2, value]) => ({ kind: "stock", id: id2, value }))
    ];
  }
  if (event.kind === "stock.adjust") {
    only(d, ["delta", "reason"]);
    if (typeof d.delta !== "number" || !Number.isSafeInteger(d.delta) || d.delta === 0) throw new AccessError("Jumlah tidak valid.", 400);
    if (!await lookup("catalog", entityId)) throw new AccessError("Barang tidak ditemukan.", 404);
    const quantity = sum(Number(existing?.quantity || 0), d.delta);
    return [{ kind: "stock", id: entityId, value: { quantity, needsReview: quantity < 0, reason: text(d.reason, 300) } }];
  }
  throw new AccessError("Tindakan tidak tersedia.", 400);
}
__name(project, "project");
function visibleEntity(entity, claims) {
  if (entity.kind.startsWith("pos_")) return visiblePosEntity(entity, claims);
  if (claims.role === "owner") return entity;
  if (entity.kind === "catalog" || entity.kind === "catalogVersion") {
    const { cost: _cost, ...value } = entity.value;
    return { ...entity, value };
  }
  if (entity.kind === "settings" || entity.kind === "stock") return entity;
  if (["order", "payment", "shift", "activeShift"].includes(entity.kind) && entity.value.deviceId === claims.deviceId && entity.value.operatorId === claims.employeeId) {
    const value = { ...entity.value };
    if (Array.isArray(value.lines)) value.lines = value.lines.map((line) => {
      const { cost: _cost, ...safe } = line;
      return safe;
    });
    return { ...entity, value };
  }
  return void 0;
}
__name(visibleEntity, "visibleEntity");

// src/lib/multidevice/limits.ts
var MAX_DELIVERY_BYTES = 8 * 1024 * 1024;
var PAYLOAD_CHUNK_CHARS = 128 * 1024;

// src/lib/server/multideviceSync.ts
function chunks(payload) {
  return payload.length <= PAYLOAD_CHUNK_CHARS ? [] : Array.from({ length: Math.ceil(payload.length / PAYLOAD_CHUNK_CHARS) }, (_, i) => payload.slice(i * PAYLOAD_CHUNK_CHARS, (i + 1) * PAYLOAD_CHUNK_CHARS));
}
__name(chunks, "chunks");
async function readPayload(db, storeId, kind, id2, payload) {
  const marker = JSON.parse(payload);
  if (!marker || !Number.isSafeInteger(marker.mdPayloadParts)) return marker;
  const parts = await db.prepare("SELECT payload FROM MdPayloadChunks WHERE storeId=? AND kind=? AND id=? ORDER BY part").bind(storeId, kind, id2).all();
  if (parts.results.length !== marker.mdPayloadParts) throw new AccessError("Data belum lengkap.", 503);
  return JSON.parse(parts.results.map((row) => row.payload).join(""));
}
__name(readPayload, "readPayload");
var LIVE = `EXISTS(SELECT 1 FROM MdDevices d WHERE d.storeId=MdStores.id AND d.id=? AND d.epoch=? AND d.role=? AND d.publicKey=? AND d.revoked=0)
 AND (? IS NULL OR EXISTS(SELECT 1 FROM MdEmployees e WHERE e.storeId=MdStores.id AND e.id=? AND e.epoch=? AND e.active=1))
 AND EXISTS(SELECT 1 FROM MdDevices o JOIN LicenseDeviceKeys k ON k.deviceId=o.id AND k.publicKey=o.publicKey WHERE o.storeId=MdStores.id AND o.role='owner' AND o.revoked=0 AND (k.licenseKey=MdStores.licenseKey OR EXISTS(SELECT 1 FROM BetaRegistrations b JOIN Licenses l ON l.orderId=b.registrationId WHERE b.status='dikonversi_berbayar' AND ((b.trialLicenseKey=MdStores.licenseKey AND l.licenseKey=k.licenseKey) OR (l.licenseKey=MdStores.licenseKey AND b.trialLicenseKey=k.licenseKey)))))`;
function liveValues(c) {
  return [c.deviceId, c.deviceEpoch, c.role, c.deviceKey, c.employeeId || null, c.employeeId || null, c.employeeEpoch || null];
}
__name(liveValues, "liveValues");
async function ensureLive(db, c) {
  if (c.expiresAt <= Date.now()) throw new AccessError("Silakan masuk lagi.", 401);
  if (!await db.prepare(`SELECT id FROM MdStores WHERE id=? AND ${LIVE}`).bind(c.storeId, ...liveValues(c)).first()) throw new AccessError("Akses sudah berakhir.");
}
__name(ensureLive, "ensureLive");
async function submitEvent(db, claims, event) {
  return writeEvent(db, claims, claims, event);
}
__name(submitEvent, "submitEvent");
async function writeEvent(db, actor, claims, event, recovering = false) {
  validateEnvelope(event, claims);
  await ensureLive(db, actor);
  const payload = JSON.stringify(event), hash = digest(payload);
  if (new TextEncoder().encode(payload).length > MAX_DELIVERY_BYTES) throw new AccessError("Nota terlalu besar.", 413);
  for (let attempt = 0; attempt < 8; attempt++) {
    const duplicate = await db.prepare("SELECT digest,sequence,deviceId,operatorId FROM MdEvents WHERE storeId=? AND id=?").bind(claims.storeId, event.id).first();
    if (duplicate) {
      if (duplicate.digest !== hash || duplicate.deviceId !== claims.deviceId || duplicate.operatorId !== event.operatorId) throw new AccessError("Nota berbeda memakai nomor yang sama.", 409);
      return { id: event.id, sequence: duplicate.sequence, duplicate: true };
    }
    const state = await db.prepare("SELECT revision FROM MdStores WHERE id=?").bind(claims.storeId).first();
    if (!state) throw new AccessError();
    let changes;
    try {
      if (event.kind === "settings.put" && event.data.profile) {
        const previous = await db.prepare("SELECT payload FROM MdEntities WHERE storeId=? AND kind='settings' AND id=?").bind(claims.storeId, event.entityId).first();
        const settings = previous ? await readPayload(db, claims.storeId, "settings", event.entityId, previous.payload) : void 0;
        const next = { ...settings?.profile, ...event.data.profile };
        if (requiresEmptyTables(settings?.profile || {}, next)) {
          const tables2 = await db.prepare("SELECT id,payload FROM MdEntities WHERE storeId=? AND kind='pos_tables'").bind(claims.storeId).all();
          for (const row of tables2.results) {
            const table = await readPayload(db, claims.storeId, "pos_tables", row.id, row.payload);
            if (!table.mdDeleted && ["terisi", "open", "lunas"].includes(table.status)) throw new AccessError("Selesaikan pesanan dan lepas meja sebelum mengubah layanan.", 409);
          }
        }
      }
      changes = await project(event, claims, async (kind, id2) => {
        const row = await db.prepare("SELECT payload FROM MdEntities WHERE storeId=? AND kind=? AND id=?").bind(claims.storeId, kind, id2).first();
        return row ? readPayload(db, claims.storeId, kind, id2, row.payload) : void 0;
      }, { ownerRecovery: recovering });
    } catch (error) {
      const latest = await db.prepare("SELECT revision FROM MdStores WHERE id=?").bind(claims.storeId).first();
      if (latest?.revision !== state.revision) continue;
      throw error;
    }
    const mutation = crypto7.randomUUID(), revision = state.revision + 1;
    const guard = "EXISTS(SELECT 1 FROM MdStores WHERE id=? AND mutation=?)";
    const payloadWrites = /* @__PURE__ */ __name((kind, id2, value) => {
      const parts = chunks(value);
      return { stored: parts.length ? JSON.stringify({ mdPayloadParts: parts.length }) : value, statements: [
        db.prepare(`DELETE FROM MdPayloadChunks WHERE storeId=? AND kind=? AND id=? AND ${guard}`).bind(claims.storeId, kind, id2, claims.storeId, mutation),
        ...parts.map((part, index) => db.prepare(`INSERT INTO MdPayloadChunks(storeId,kind,id,part,payload) SELECT ?,?,?,?,? WHERE ${guard}`).bind(claims.storeId, kind, id2, index, part, claims.storeId, mutation))
      ] };
    }, "payloadWrites");
    const storedEvent = payloadWrites("event", event.id, payload);
    const storedEntities = changes.map((entity) => ({ entity, ...payloadWrites(entity.kind, entity.id, JSON.stringify(entity.value)) }));
    const statements = [
      db.prepare(`UPDATE MdStores SET revision=revision+1,mutation=? WHERE id=? AND revision=? AND ${LIVE}`).bind(mutation, claims.storeId, state.revision, ...liveValues(actor)),
      db.prepare(`INSERT INTO MdEvents(storeId,id,deviceId,operatorId,kind,entityId,payload,digest,receivedAt)
        SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(claims.storeId, event.id, claims.deviceId, event.operatorId, event.kind, event.entityId, storedEvent.stored, hash, Date.now(), claims.storeId, mutation),
      ...storedEvent.statements,
      ...storedEntities.flatMap(({ entity, stored: stored2, statements: statements2 }) => [db.prepare(`INSERT INTO MdEntities(storeId,kind,id,revision,payload) SELECT ?,?,?,?,? WHERE ${guard}
        ON CONFLICT(storeId,kind,id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload`).bind(claims.storeId, entity.kind, entity.id, revision, stored2, claims.storeId, mutation), ...statements2]),
      ...recovering ? [db.prepare(`INSERT INTO MdRecoveries(storeId,eventId,authorizedBy,recoveredAt) SELECT ?,?,?,? WHERE ${guard}
        ON CONFLICT(storeId,eventId) DO NOTHING`).bind(claims.storeId, event.id, actor.deviceId, Date.now(), claims.storeId, mutation)] : []
    ];
    try {
      await db.batch(statements);
    } catch (error) {
      const saved = await db.prepare("SELECT id FROM MdEvents WHERE storeId=? AND id=?").bind(claims.storeId, event.id).first();
      if (!saved) throw error;
    }
    const stored = await db.prepare("SELECT sequence,digest FROM MdEvents WHERE storeId=? AND id=?").bind(claims.storeId, event.id).first();
    if (stored) {
      if (stored.digest !== hash) throw new AccessError("Nota berbeda memakai nomor yang sama.", 409);
      return { id: event.id, sequence: stored.sequence, duplicate: false };
    }
    await ensureLive(db, actor);
  }
  throw new AccessError("Data sedang diperbarui. Coba lagi.", 409);
}
__name(writeEvent, "writeEvent");
async function recoverEvent(db, owner, event) {
  requireOwner(owner);
  await ensureLive(db, owner);
  if (!event || event.storeId !== owner.storeId) throw new AccessError("Cadangan berasal dari toko lain.");
  const device = await db.prepare("SELECT publicKey,role,epoch FROM MdDevices WHERE storeId=? AND id=?").bind(owner.storeId, event.deviceId).first();
  if (!device) throw new AccessError("Perangkat asal tidak dikenali.");
  const origin = { ...owner, deviceId: event.deviceId, deviceKey: device.publicKey, role: device.role, deviceEpoch: device.epoch };
  if (device.role === "cashier") {
    const employee = await db.prepare("SELECT epoch FROM MdEmployees WHERE storeId=? AND id=?").bind(owner.storeId, event.operatorId).first();
    if (!employee) throw new AccessError("Karyawan asal tidak dikenali.");
    origin.employeeId = event.operatorId;
    origin.employeeEpoch = employee.epoch;
  } else if (event.operatorId !== event.deviceId) throw new AccessError("Cadangan tidak sesuai.");
  const result = await writeEvent(db, owner, origin, event, true);
  return result;
}
__name(recoverEvent, "recoverEvent");
async function pullEntities(db, claims, cursor) {
  await ensureLive(db, claims);
  if (!Number.isSafeInteger(cursor) || cursor < 0) throw new AccessError("Perbarui data lagi.", 400);
  const page = await db.prepare("SELECT revision FROM MdEntities WHERE storeId=? AND revision>? ORDER BY revision LIMIT 200").bind(claims.storeId, cursor).all();
  if (!page.results.length) return { cursor, entities: [], hasMore: false };
  const upper = page.results[page.results.length - 1].revision;
  const rows = await db.prepare(`SELECT e.kind,e.id,e.payload,receipt.payload AS kitchenOrderPayload
    FROM MdEntities e LEFT JOIN MdEntities receipt ON e.kind='pos_operations'
      AND json_extract(e.payload,'$.kind')='kitchen' AND receipt.storeId=e.storeId
      AND receipt.kind='pos_orders' AND receipt.id=json_extract(e.payload,'$.orderId')
    WHERE e.storeId=? AND e.revision>? AND e.revision<=? ORDER BY e.revision,e.kind,e.id`).bind(claims.storeId, cursor, upper).all();
  const entities = (await Promise.all(rows.results.map(async (row) => {
    const value = await readPayload(db, claims.storeId, row.kind, row.id, row.payload);
    if (claims.role === "cashier" && row.kind === "pos_operations" && value.kind === "kitchen") {
      const order = row.kitchenOrderPayload ? await readPayload(db, claims.storeId, "pos_orders", value.orderId, row.kitchenOrderPayload) : void 0;
      value.mdTargetDeviceId = order?.mdDeviceId;
      value.mdTargetOperatorId = order?.mdOperatorId;
    }
    return visibleEntity({ kind: row.kind, id: row.id, value }, claims);
  }))).filter((row) => !!row);
  const more = await db.prepare("SELECT id FROM MdEntities WHERE storeId=? AND revision>? LIMIT 1").bind(claims.storeId, upper).first();
  return { cursor: upper, entities, hasMore: !!more };
}
__name(pullEntities, "pullEntities");

// src/lib/server/photoRelayR2.ts
var MAX_PHOTO_CIPHERTEXT_BYTES = 512 * 1024;
var MAX_RELAY_TTL_MS = 24 * 60 * 60 * 1e3;
function relayTransferPrefix(storeId, photoId) {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError("Parameter tidak valid.", 400);
  }
  return `relay/${storeId}/transfers/${photoId}/`;
}
__name(relayTransferPrefix, "relayTransferPrefix");
function relayTransferKey(storeId, photoId, transferToken) {
  if (!transferToken || !/^[a-f0-9]{64}$/i.test(transferToken)) {
    throw new AccessError("Token transfer tidak valid.", 400);
  }
  return `${relayTransferPrefix(storeId, photoId)}${transferToken}.json`;
}
__name(relayTransferKey, "relayTransferKey");
function reuploadRequestKey(storeId, photoId) {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError("Parameter tidak valid.", 400);
  }
  return `requests/${storeId}/${photoId}.json`;
}
__name(reuploadRequestKey, "reuploadRequestKey");
function ownerKeyObjectKey(storeId) {
  if (!storeId || /[^a-zA-Z0-9_-]/.test(storeId)) {
    throw new AccessError("Parameter tidak valid.", 400);
  }
  return `keys/${storeId}/owner-e2ee-key.json`;
}
__name(ownerKeyObjectKey, "ownerKeyObjectKey");
async function sha256HexStr(bytes) {
  const digest2 = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest2)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256HexStr, "sha256HexStr");
async function computePacketEnvelopeHash(packet) {
  const canonicalPubKey = packet.ephemeralPublicKeyJwk ? JSON.stringify({
    crv: packet.ephemeralPublicKeyJwk.crv,
    kty: packet.ephemeralPublicKeyJwk.kty,
    x: packet.ephemeralPublicKeyJwk.x,
    y: packet.ephemeralPublicKeyJwk.y
  }) : "";
  const parts = [
    packet.photoId,
    packet.operationId,
    packet.employeeId,
    packet.checksum.toLowerCase(),
    packet.iv,
    packet.ciphertext,
    canonicalPubKey
  ].join("::");
  return sha256HexStr(new TextEncoder().encode(parts));
}
__name(computePacketEnvelopeHash, "computePacketEnvelopeHash");
async function computeTransferToken(storeId, photoId, envelopeHash) {
  const parts = `${storeId}::${photoId}::${envelopeHash}`;
  return sha256HexStr(new TextEncoder().encode(parts));
}
__name(computeTransferToken, "computeTransferToken");
async function pushPhotoToRelayR2(bucket, claims, packet) {
  if (!claims.storeId) throw new AccessError("Akses tidak sah.", 401);
  if (claims.role !== "cashier" || !claims.employeeId) {
    throw new AccessError("Unggah foto hanya diizinkan untuk sesi kasir karyawan aktif.", 403);
  }
  if (!packet.employeeId || packet.employeeId !== claims.employeeId) {
    throw new AccessError("Foto hanya dapat diunggah untuk absensi milik sendiri.", 403);
  }
  if (packet.storeId && packet.storeId !== claims.storeId) {
    throw new AccessError("storeId tidak sesuai.", 403);
  }
  if (!packet.photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(packet.photoId)) {
    throw new AccessError("ID foto tidak valid.", 400);
  }
  if (!packet.operationId || !/^[a-zA-Z0-9_-]{4,80}$/.test(packet.operationId)) {
    throw new AccessError("ID operasi tidak valid.", 400);
  }
  if (!packet.checksum || !/^[a-f0-9]{64}$/i.test(packet.checksum)) {
    throw new AccessError("Checksum foto tidak valid.", 400);
  }
  if (!packet.ciphertext || typeof packet.ciphertext !== "string" || !packet.iv) {
    throw new AccessError("Data enkripsi foto tidak lengkap.", 400);
  }
  if (!packet.ephemeralPublicKeyJwk || typeof packet.ephemeralPublicKeyJwk !== "object") {
    throw new AccessError("Kunci publik sementara tidak valid.", 400);
  }
  if (packet.ciphertext.length > MAX_PHOTO_CIPHERTEXT_BYTES) {
    throw new AccessError("Ukuran data foto melebihi batas maksimal 512 KB.", 413);
  }
  const envelopeHash = await computePacketEnvelopeHash(packet);
  const transferToken = await computeTransferToken(claims.storeId, packet.photoId, envelopeHash);
  const targetKey = relayTransferKey(claims.storeId, packet.photoId, transferToken);
  const prefix = relayTransferPrefix(claims.storeId, packet.photoId);
  const reqKey = reuploadRequestKey(claims.storeId, packet.photoId);
  const now = Date.now();
  const expiresAt = Math.min(now + MAX_RELAY_TTL_MS, packet.expiresAt || now + MAX_RELAY_TTL_MS);
  const reuploadReqObj = await bucket.get(reqKey);
  const hasReuploadRequest = !!reuploadReqObj;
  if (typeof bucket.list === "function") {
    const listRes = await bucket.list({ prefix, limit: 10, include: ["customMetadata"] });
    const existingTransfers = listRes.objects || [];
    for (const obj of existingTransfers) {
      if (obj.key === targetKey) {
        return {
          success: true,
          photoId: packet.photoId,
          expiresAt,
          transferToken,
          idempotent: true
        };
      }
      if (!hasReuploadRequest) {
        const expMeta = obj.customMetadata?.expiresAt;
        const isExpired = expMeta ? Number(expMeta) < now : false;
        if (!isExpired) {
          throw new AccessError("Foto bukti dengan ID ini sudah ada dan tidak dapat diganti.", 409, "photo_exists");
        }
      }
    }
  } else {
    const directObj = await bucket.get(targetKey);
    if (directObj) {
      return {
        success: true,
        photoId: packet.photoId,
        expiresAt,
        transferToken,
        idempotent: true
      };
    }
  }
  const payloadWithExpiry = { ...packet, storeId: claims.storeId, expiresAt, envelopeHash, transferToken };
  const putResult = await bucket.put(targetKey, JSON.stringify(payloadWithExpiry), {
    onlyIf: { etagDoesNotMatch: "*" },
    customMetadata: {
      storeId: claims.storeId,
      employeeId: packet.employeeId,
      operationId: packet.operationId,
      checksum: packet.checksum,
      envelopeHash,
      transferToken,
      expiresAt: String(expiresAt),
      uploadedAt: String(now)
    }
  });
  if (putResult === null) {
    return {
      success: true,
      photoId: packet.photoId,
      expiresAt,
      transferToken,
      idempotent: true
    };
  }
  let finalToken = transferToken;
  if (typeof bucket.list === "function") {
    const postList = await bucket.list({ prefix, limit: 10, include: ["customMetadata"] });
    const activeObjects = (postList.objects || []).filter((obj) => {
      const expMeta = obj.customMetadata?.expiresAt;
      const isExpired = expMeta ? Number(expMeta) < now : false;
      if (isExpired && obj.key !== targetKey) {
        bucket.delete(obj.key).catch(() => {
        });
        return false;
      }
      return true;
    });
    if (activeObjects.length > 1) {
      if (!hasReuploadRequest) {
        activeObjects.sort((a, b) => {
          const timeA = Number(a.customMetadata?.uploadedAt || 0);
          const timeB = Number(b.customMetadata?.uploadedAt || 0);
          if (timeA !== timeB) return timeA - timeB;
          return a.key.localeCompare(b.key);
        });
        const winner = activeObjects[0];
        if (winner.key !== targetKey) {
          await bucket.delete(targetKey).catch(() => {
          });
          throw new AccessError("Foto bukti dengan ID ini sudah ada dan tidak dapat diganti.", 409, "photo_exists");
        }
        for (const loser of activeObjects.slice(1)) {
          await bucket.delete(loser.key).catch(() => {
          });
        }
      } else {
        activeObjects.sort((a, b) => {
          const timeA = Number(a.customMetadata?.uploadedAt || 0);
          const timeB = Number(b.customMetadata?.uploadedAt || 0);
          if (timeB !== timeA) return timeB - timeA;
          return b.key.localeCompare(a.key);
        });
        const winner = activeObjects[0];
        const keyToken = winner.key.slice(prefix.length).replace(/\.json$/, "");
        finalToken = winner.customMetadata?.transferToken || keyToken || transferToken;
        for (const loser of activeObjects.slice(1)) {
          await bucket.delete(loser.key).catch(() => {
          });
        }
      }
    }
  }
  if (hasReuploadRequest) {
    await bucket.delete(reqKey).catch(() => {
    });
  }
  return { success: true, photoId: packet.photoId, expiresAt, transferToken: finalToken };
}
__name(pushPhotoToRelayR2, "pushPhotoToRelayR2");
async function pullPhotoFromRelayR2(bucket, claims, photoId) {
  requireOwner(claims);
  const prefix = relayTransferPrefix(claims.storeId, photoId);
  let targetKey = null;
  let targetMeta;
  if (typeof bucket.list === "function") {
    const listRes = await bucket.list({ prefix, limit: 10, include: ["customMetadata"] });
    const objects = listRes.objects || [];
    if (objects.length === 0) {
      return { found: false };
    }
    objects.sort((a, b) => {
      const timeA = Number(a.customMetadata?.uploadedAt || 0);
      const timeB = Number(b.customMetadata?.uploadedAt || 0);
      if (timeB !== timeA) return timeB - timeA;
      return b.key.localeCompare(a.key);
    });
    targetKey = objects[0].key;
    targetMeta = objects[0].customMetadata;
  } else {
    return { found: false };
  }
  const obj = await bucket.get(targetKey);
  if (!obj) {
    return { found: false };
  }
  const content = await obj.text();
  let packet;
  try {
    packet = JSON.parse(content);
  } catch {
    await bucket.delete(targetKey).catch(() => {
    });
    return { found: false };
  }
  if (Date.now() > packet.expiresAt) {
    await bucket.delete(targetKey).catch(() => {
    });
    return { found: false, expired: true };
  }
  const transferToken = obj.customMetadata?.transferToken || targetMeta?.transferToken;
  const envelopeHash = obj.customMetadata?.envelopeHash || targetMeta?.envelopeHash;
  return { found: true, packet, transferToken, envelopeHash };
}
__name(pullPhotoFromRelayR2, "pullPhotoFromRelayR2");
async function ackPhotoFromRelayR2(bucket, claims, data) {
  requireOwner(claims);
  if (!data.photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(data.photoId)) {
    throw new AccessError("ID foto tidak valid.", 400);
  }
  if (!data.checksum || !/^[a-f0-9]{64}$/i.test(data.checksum)) {
    throw new AccessError("Checksum tidak valid.", 400);
  }
  if (!data.transferToken || typeof data.transferToken !== "string" || !/^[a-f0-9]{64}$/i.test(data.transferToken)) {
    throw new AccessError("Token transfer wajib disertakan untuk konfirmasi penerimaan foto.", 400);
  }
  const targetKey = relayTransferKey(claims.storeId, data.photoId, data.transferToken);
  const prefix = relayTransferPrefix(claims.storeId, data.photoId);
  const existing = await bucket.get(targetKey);
  if (!existing) {
    if (typeof bucket.list === "function") {
      const listRes = await bucket.list({ prefix, limit: 10 });
      const currentTransfers = listRes.objects || [];
      if (currentTransfers.length > 0) {
        throw new AccessError("Token transfer foto sudah kedaluwarsa atau digantikan transfer baru.", 409, "stale_transfer");
      }
    }
    return { success: true, deleted: true, alreadyDeleted: true };
  }
  const content = await existing.text();
  try {
    const existingToken = existing.customMetadata?.transferToken;
    if (existingToken && data.transferToken !== existingToken) {
      throw new AccessError("Token transfer foto sudah kedaluwarsa atau digantikan transfer baru.", 409, "stale_transfer");
    }
    if (data.envelopeHash && existing.customMetadata?.envelopeHash && data.envelopeHash !== existing.customMetadata.envelopeHash) {
      throw new AccessError("Hash paket foto tidak sesuai dengan transfer yang sedang aktif.", 409, "stale_transfer");
    }
    const packet = JSON.parse(content);
    if (packet.checksum && packet.checksum.toLowerCase() !== data.checksum.toLowerCase()) {
      throw new AccessError("Checksum foto tidak sesuai konfirmasi.", 400);
    }
    if (data.operationId && packet.operationId && packet.operationId !== data.operationId) {
      throw new AccessError("ID operasi tidak sesuai konfirmasi transfer.", 400);
    }
    if (data.employeeId && packet.employeeId && packet.employeeId !== data.employeeId) {
      throw new AccessError("ID karyawan tidak sesuai konfirmasi transfer.", 400);
    }
  } catch (e) {
    if (e instanceof AccessError) throw e;
  }
  await bucket.delete(targetKey);
  await bucket.delete(reuploadRequestKey(claims.storeId, data.photoId)).catch(() => {
  });
  return { success: true, deleted: true };
}
__name(ackPhotoFromRelayR2, "ackPhotoFromRelayR2");
async function requestPhotoReuploadR2(bucket, claims, data) {
  requireOwner(claims);
  if (!data.photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(data.photoId)) {
    throw new AccessError("ID foto tidak valid.", 400);
  }
  if (!data.employeeId || !/^[a-zA-Z0-9_-]{4,80}$/.test(data.employeeId)) {
    throw new AccessError("ID karyawan tidak valid.", 400);
  }
  const prefix = relayTransferPrefix(claims.storeId, data.photoId);
  if (typeof bucket.list === "function") {
    const listRes = await bucket.list({ prefix, limit: 10 });
    for (const obj of listRes.objects || []) {
      await bucket.delete(obj.key).catch(() => {
      });
    }
  }
  const reqKey = reuploadRequestKey(claims.storeId, data.photoId);
  const payload = {
    storeId: claims.storeId,
    photoId: data.photoId,
    employeeId: data.employeeId,
    operationId: data.operationId,
    reason: data.reason || "Pemilik toko meminta unggah ulang bukti foto absensi",
    requestedAt: Date.now(),
    ownerPublicKeyJwk: data.ownerPublicKeyJwk
  };
  await bucket.put(reqKey, JSON.stringify(payload), {
    customMetadata: {
      storeId: claims.storeId,
      employeeId: data.employeeId,
      photoId: data.photoId,
      requestedAt: String(Date.now())
    }
  });
  return { success: true, requested: true, photoId: data.photoId };
}
__name(requestPhotoReuploadR2, "requestPhotoReuploadR2");
async function checkPhotoReuploadR2(bucket, claims, photoId) {
  if (!claims.storeId || !claims.employeeId) {
    throw new AccessError("Akses tidak sah.", 401);
  }
  if (!photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(photoId)) {
    throw new AccessError("ID foto tidak valid.", 400);
  }
  const reqKey = reuploadRequestKey(claims.storeId, photoId);
  const obj = await bucket.get(reqKey);
  if (!obj) return { hasRequest: false };
  try {
    const text2 = await obj.text();
    const req = JSON.parse(text2);
    if (req.employeeId !== claims.employeeId) {
      return { hasRequest: false };
    }
    return { hasRequest: true, request: req };
  } catch {
    return { hasRequest: false };
  }
}
__name(checkPhotoReuploadR2, "checkPhotoReuploadR2");
async function listPendingReuploadRequestsR2(bucket, claims) {
  if (!claims.storeId || !claims.employeeId) {
    throw new AccessError("Akses tidak sah.", 401);
  }
  const prefix = `requests/${claims.storeId}/`;
  const requests = [];
  if (typeof bucket.list === "function") {
    const listRes = await bucket.list({ prefix, limit: 100 });
    for (const item of listRes.objects || []) {
      const obj = await bucket.get(item.key);
      if (obj) {
        try {
          const req = JSON.parse(await obj.text());
          if (req.employeeId === claims.employeeId) {
            requests.push(req);
          }
        } catch {
        }
      }
    }
  }
  return { success: true, requests };
}
__name(listPendingReuploadRequestsR2, "listPendingReuploadRequestsR2");
async function setOwnerE2eeKeyR2(bucket, claims, data) {
  requireOwner(claims);
  if (!data.publicKeyJwk || typeof data.publicKeyJwk !== "object") {
    throw new AccessError("Kunci publik tidak valid.", 400);
  }
  if (data.publicKeyJwk.kty !== "EC" || data.publicKeyJwk.crv !== "P-256") {
    throw new AccessError("Format kunci ECDH P-256 tidak sesuai.", 400);
  }
  const canonicalJwkStr = JSON.stringify({
    crv: data.publicKeyJwk.crv,
    kty: data.publicKeyJwk.kty,
    x: data.publicKeyJwk.x,
    y: data.publicKeyJwk.y
  });
  const fingerprint = await sha256HexStr(new TextEncoder().encode(canonicalJwkStr));
  const key = ownerKeyObjectKey(claims.storeId);
  const existing = await bucket.get(key);
  let currentEpoch = 0;
  let existingDeviceEpoch = 0;
  if (existing) {
    let existingData = null;
    try {
      existingData = JSON.parse(await existing.text());
      if (typeof existingData.keyEpoch === "number") {
        currentEpoch = existingData.keyEpoch;
      }
      if (typeof existingData.deviceEpoch === "number") {
        existingDeviceEpoch = existingData.deviceEpoch;
      }
    } catch {
    }
    if (existingData && existingData.fingerprint === fingerprint) {
      return {
        success: true,
        fingerprint: existingData.fingerprint,
        keyEpoch: existingData.keyEpoch,
        rotatedAt: existingData.rotatedAt,
        idempotent: true
      };
    }
    if (typeof data.expectedCurrentEpoch === "number" && data.expectedCurrentEpoch !== currentEpoch) {
      throw new AccessError("Versi kunci toko sudah berubah. Muat ulang dan coba lagi.", 409, "epoch_conflict");
    }
  }
  const nextEpoch = typeof data.keyEpoch === "number" && data.keyEpoch > currentEpoch ? data.keyEpoch : currentEpoch + 1;
  const now = Date.now();
  const identity = {
    storeId: claims.storeId,
    deviceId: claims.deviceId,
    deviceEpoch: claims.deviceEpoch,
    publicKeyJwk: data.publicKeyJwk,
    fingerprint,
    keyEpoch: nextEpoch,
    rotatedAt: now
  };
  const putResult = await bucket.put(key, JSON.stringify(identity), {
    onlyIf: existing?.etag ? { etagMatches: existing.etag } : { etagDoesNotMatch: "*" },
    customMetadata: {
      storeId: claims.storeId,
      deviceId: claims.deviceId,
      deviceEpoch: String(claims.deviceEpoch),
      fingerprint,
      keyEpoch: String(nextEpoch),
      rotatedAt: String(now)
    }
  });
  if (putResult === null) {
    throw new AccessError("Terjadi konflik perubahan kunci bersamaan. Coba lagi.", 409, "epoch_conflict");
  }
  return { success: true, fingerprint, keyEpoch: nextEpoch, rotatedAt: now };
}
__name(setOwnerE2eeKeyR2, "setOwnerE2eeKeyR2");
async function getOwnerE2eeKeyR2(bucket, claims) {
  if (!claims.storeId) throw new AccessError("Akses tidak sah.", 401);
  const key = ownerKeyObjectKey(claims.storeId);
  const obj = await bucket.get(key);
  if (!obj) return { found: false };
  try {
    const text2 = await obj.text();
    const identity = JSON.parse(text2);
    if (identity.storeId !== claims.storeId) return { found: false };
    return { found: true, identity };
  } catch {
    return { found: false };
  }
}
__name(getOwnerE2eeKeyR2, "getOwnerE2eeKeyR2");

// src/lib/server/multideviceHttp.ts
function response(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
__name(response, "response");
async function boundedBody(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new AccessError("Permintaan tidak sesuai.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError("Lengkapi data.", 400);
  const chunks2 = [], limit = 8 * 1024 * 1024 + 16384;
  let total = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new AccessError("Data terlalu besar.", 413);
      }
      chunks2.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks2) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AccessError("Permintaan tidak sesuai.", 400);
  }
}
__name(boundedBody, "boundedBody");
async function handleMultiDevice(request, env) {
  try {
    signingKey(env);
    if (request.method !== "POST") return response({ error: "Permintaan tidak sesuai." }, 405);
    const ingress = env.MULTI_DEVICE_RATE_LIMITER || env.PUBLIC_RATE_LIMITER;
    if (ingress) {
      const limit = await ingress.limit({ key: `multi:${request.headers.get("CF-Connecting-IP") || "local"}` });
      if (!limit.success) return response({ error: "Terlalu banyak percobaan. Coba lagi nanti.", code: "rate_limited", retryAt: Date.now() + 6e4 }, 429);
    }
    const body = await boundedBody(request);
    if (!body || typeof body !== "object" || typeof body.action !== "string" || !body.data || typeof body.data !== "object" || Array.isArray(body.data) || !body.proof) throw new AccessError("Permintaan tidak sesuai.", 400);
    const action = body.action, data = body.data, proof = body.proof;
    if (env.MULTI_DEVICE_RATE_LIMITER && env.PUBLIC_RATE_LIMITER && !["send", "pull", "recover"].includes(action)) {
      const limit = await env.PUBLIC_RATE_LIMITER.limit({ key: `multi-auth:${request.headers.get("CF-Connecting-IP") || "local"}` });
      if (!limit.success) return response({ error: "Terlalu banyak percobaan. Coba lagi nanti.", code: "rate_limited", retryAt: Date.now() + 6e4 }, 429);
    }
    if (action === "enroll") return response(await enrollOwner(env, { activation: String(data.activation || ""), deviceName: String(data.deviceName || ""), proof }));
    if (action === "pair.request") return response(await requestPairing(env, { code: String(data.code || ""), deviceId: String(data.deviceId || ""), deviceName: String(data.deviceName || ""), proof }));
    if (typeof body.access !== "string") throw new AccessError("Silakan masuk lagi.", 401);
    const claims = await authorize(env, body.access, action, data, proof);
    if (action === "list") return response(await listAccess(env, claims));
    if (action === "refresh") return response(await renewCashierDevice(env, claims));
    if (action === "employee.login") return response(await employeeLogin(env, claims, { id: String(data.id || ""), pin: String(data.pin || "") }));
    if (action === "pull") return response(await pullEntities(env.DB, claims, Number(data.cursor)));
    if (action === "photo.relay.push") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await pushPhotoToRelayR2(env.PHOTOS_BUCKET, claims, data.packet));
    }
    if (action === "photo.relay.pull") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await pullPhotoFromRelayR2(env.PHOTOS_BUCKET, claims, String(data.photoId || "")));
    }
    if (action === "photo.relay.ack") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await ackPhotoFromRelayR2(env.PHOTOS_BUCKET, claims, {
        photoId: String(data.photoId || ""),
        checksum: String(data.checksum || ""),
        transferToken: data.transferToken ? String(data.transferToken) : void 0,
        envelopeHash: data.envelopeHash ? String(data.envelopeHash) : void 0,
        operationId: data.operationId ? String(data.operationId) : void 0,
        employeeId: data.employeeId ? String(data.employeeId) : void 0
      }));
    }
    if (action === "photo.relay.reupload") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await requestPhotoReuploadR2(env.PHOTOS_BUCKET, claims, { photoId: String(data.photoId || ""), employeeId: String(data.employeeId || ""), operationId: String(data.operationId || ""), reason: data.reason ? String(data.reason) : void 0, ownerPublicKeyJwk: data.ownerPublicKeyJwk }));
    }
    if (action === "photo.relay.reupload_check") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await checkPhotoReuploadR2(env.PHOTOS_BUCKET, claims, String(data.photoId || "")));
    }
    if (action === "photo.relay.reupload_pending") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await listPendingReuploadRequestsR2(env.PHOTOS_BUCKET, claims));
    }
    if (action === "photo.relay.owner_key.set") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await setOwnerE2eeKeyR2(env.PHOTOS_BUCKET, claims, {
        publicKeyJwk: data.publicKeyJwk,
        keyEpoch: typeof data.keyEpoch === "number" ? data.keyEpoch : void 0,
        expectedCurrentEpoch: typeof data.expectedCurrentEpoch === "number" ? data.expectedCurrentEpoch : void 0
      }));
    }
    if (action === "photo.relay.owner_key.get") {
      if (!env.PHOTOS_BUCKET) throw new AccessError("Layanan relay foto belum diaktifkan.", 503);
      return response(await getOwnerE2eeKeyR2(env.PHOTOS_BUCKET, claims));
    }
    if (action === "send") return response(await submitEvent(env.DB, claims, data.event));
    requireOwner(claims);
    if (action === "recover") return response(await recoverEvent(env.DB, claims, data.event));
    if (action === "pair.create") return response(await createPairing(env, claims));
    if (action === "pair.approve") return response(await approvePairing(env, claims, String(data.id || "")));
    if (action === "device.revoke") return response(await revokeDevice(env, claims, String(data.id || "")));
    if (action === "employee.save") return response(await saveEmployee(env, claims, { id: String(data.id || ""), name: String(data.name || ""), pin: data.pin === void 0 ? void 0 : String(data.pin), active: data.active }));
    return response({ error: "Halaman tidak tersedia." }, 404);
  } catch (error) {
    if (error instanceof AccessError) return response({ error: error.message, ...error.code ? { code: error.code } : {}, ...error.retryAt ? { retryAt: error.retryAt } : {} }, error.status);
    return response({ error: "Data belum dapat diproses. Coba lagi." }, 503);
  }
}
__name(handleMultiDevice, "handleMultiDevice");

// src/worker.ts
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsHeaders, "corsHeaders");
function withCors(response2) {
  const newHeaders = new Headers(response2.headers);
  newHeaders.set("Cache-Control", "no-store");
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set("Referrer-Policy", "no-referrer");
  const cors = corsHeaders();
  for (const [key, val] of Object.entries(cors)) {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, val);
    }
  }
  return new Response(response2.body, {
    status: response2.status,
    statusText: response2.statusText,
    headers: newHeaders
  });
}
__name(withCors, "withCors");
var worker_default = {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.replace(/\/$/, "") === "/api/store") {
      return handleMultiDevice(request, env);
    }
    if (env) {
      if (env.SAKUNOTA_SERVER_SECRET) process.env.SAKUNOTA_SERVER_SECRET = env.SAKUNOTA_SERVER_SECRET;
      if (env.SAKUNOTA_OWNER_SALT) process.env.SAKUNOTA_OWNER_SALT = env.SAKUNOTA_OWNER_SALT;
      if (env.SAKUNOTA_OWNER_PASSWORD) process.env.SAKUNOTA_OWNER_PASSWORD = env.SAKUNOTA_OWNER_PASSWORD;
      if (env.SAKUNOTA_OWNER_USERNAME) process.env.SAKUNOTA_OWNER_USERNAME = env.SAKUNOTA_OWNER_USERNAME;
      if (env.SAKUNOTA_OWNER_JWT_SECRET) process.env.SAKUNOTA_OWNER_JWT_SECRET = env.SAKUNOTA_OWNER_JWT_SECRET;
      if (env.SAKUNOTA_LICENSE_PRIVATE_JWK) process.env.SAKUNOTA_LICENSE_PRIVATE_JWK = env.SAKUNOTA_LICENSE_PRIVATE_JWK;
    }
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS" && pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }
    if (pathname.startsWith("/api/")) {
      const publicAction = /^\/api\/(license|orders|beta|promo)\//.test(pathname) || pathname === "/api/owner/login" || pathname === "/api/payment/snap";
      if (publicAction && env.PUBLIC_RATE_LIMITER) {
        try {
          const result = await env.PUBLIC_RATE_LIMITER.limit({ key: `${pathname}:${request.headers.get("CF-Connecting-IP") || "local"}` });
          if (!result.success) return withCors(Response.json({ success: false, error: "Terlalu banyak permintaan. Coba lagi dalam satu menit." }, { status: 429, headers: { "Retry-After": "60" } }));
        } catch {
          return withCors(Response.json({ success: false, error: "Layanan sementara sibuk. Coba lagi." }, { status: 503 }));
        }
      }
      if (pathname.startsWith("/api/owner/") && pathname !== "/api/owner/login" && !/^Bearer\s+\S+\s*$/i.test(request.headers.get("Authorization") || "")) {
        return withCors(Response.json({ success: false, error: "Sesi Owner diperlukan. Silakan login terlebih dahulu." }, { status: 401, headers: { "Cache-Control": "no-store" } }));
      }
      if (pathname.startsWith("/api/owner/") && pathname !== "/api/owner/login") {
        try {
          const database = getD1(env.DB);
          const token = request.headers.get("Authorization").replace(/^Bearer\s+/i, "").trim();
          const auth = await verifyOwnerSession(database, token);
          if (!auth.valid) return withCors(Response.json({ success: false, error: "Sesi Owner tidak sah atau telah berakhir." }, { status: 401 }));
        } catch {
          return withCors(Response.json({ success: false, error: "Sesi Owner belum dapat diverifikasi." }, { status: 503 }));
        }
      }
      const context = {
        request,
        env,
        params: {},
        waitUntil: /* @__PURE__ */ __name((promise) => {
          if (ctx && typeof ctx.waitUntil === "function") {
            ctx.waitUntil(promise);
          }
        }, "waitUntil"),
        next: /* @__PURE__ */ __name(() => env.ASSETS.fetch(request), "next"),
        data: {}
      };
      try {
        let response2 = null;
        if (pathname === "/api/payment/config") {
          if (method === "GET") response2 = await onRequestGet9(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/payment/snap") {
          if (method === "POST") response2 = await onRequestPost16(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/payment/midtrans") {
          if (method === "POST") response2 = await onRequestPost15(context);
          else if (method === "GET") response2 = await onRequestGet10();
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/orders/create") {
          if (method === "POST") response2 = await onRequestPost4(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/orders/check") {
          if (method === "POST") response2 = await onRequestPost3(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/orders/upload-proof") {
          if (method === "POST") response2 = await onRequestPost5(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/license/activate") {
          if (method === "POST") response2 = await onRequestPost(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/login") {
          if (method === "POST") response2 = await onRequestPost6(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/logout") {
          if (method === "POST") response2 = await onRequestPost7(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/verify") {
          if (method === "POST") response2 = await onRequestPost11(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/metrics") {
          if (method === "GET") response2 = await onRequestGet3(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/orders") {
          if (method === "GET") response2 = await onRequestGet4(context);
          else if (method === "PUT") response2 = await onRequestPut2(context);
          else if (method === "DELETE") response2 = await onRequestDelete(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/drive-restore") {
          response2 = method === "POST" ? await onRequestPost8(context) : new Response(null, { status: 405 });
        } else if (pathname === "/api/owner/drive-backup") {
          response2 = method === "POST" ? await onRequestPost9(context) : new Response(null, { status: 405 });
        } else if (pathname === "/api/owner/devices") {
          response2 = method === "GET" ? await onRequestGet(context) : new Response(null, { status: 405 });
        } else if (pathname === "/api/owner/licenses") {
          if (method === "GET") response2 = await onRequestGet2(context);
          else if (method === "PUT") response2 = await onRequestPut(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/tester-license") {
          if (method === "GET") response2 = await onRequestGet5(context);
          else if (method === "POST") response2 = await onRequestPost10(context);
          else if (method === "PUT") response2 = await onRequestPut3(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/secrets") {
          if (method === "GET") response2 = await onRequestGet6(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/beta") {
          if (method === "GET") response2 = await onRequestGet7(context);
          else if (method === "POST") response2 = await onRequestPost12(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/beta/register") {
          if (method === "POST") response2 = await onRequestPost13(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/beta/status") {
          if (method === "GET") response2 = await onRequestGet8(context);
          else if (method === "POST") response2 = await onRequestPost14(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/license/verify") {
          if (method === "POST") response2 = await onRequestPost2(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/promo/check") {
          if (method === "POST") response2 = await onRequestPost17(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        } else if (pathname === "/api/owner/promos") {
          if (method === "GET") response2 = await onRequestGet11(context);
          else if (method === "POST") response2 = await onRequestPost18(context);
          else response2 = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }
        if (response2) {
          return withCors(response2);
        }
        return withCors(
          new Response(JSON.stringify({ success: false, error: "Endpoint not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          })
        );
      } catch (err) {
        return withCors(
          new Response(JSON.stringify({ success: false, error: err?.message || "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          })
        );
      }
    }
    let assetRequest = request;
    if (url.pathname.endsWith(".__PAGE__.txt")) {
      const idx = url.pathname.indexOf("/__next.");
      if (idx !== -1) {
        const prefix = url.pathname.substring(0, idx);
        const suffix = url.pathname.substring(idx).replace(/\.__PAGE__\.txt$/, "/__PAGE__.txt");
        const normalizedSuffix = suffix.replace(/(?<=__next)[^/]*\./g, (m) => m.slice(0, -1) + "/");
        const normalizedPath = prefix + normalizedSuffix;
        if (normalizedPath !== url.pathname) {
          const newUrl = new URL(request.url);
          newUrl.pathname = normalizedPath;
          assetRequest = new Request(newUrl.toString(), request);
        }
      }
    }
    try {
      const response2 = await env.ASSETS.fetch(assetRequest);
      if (response2.status === 404 && url.pathname.endsWith(".__PAGE__.txt")) {
        return new Response("", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      const headers = new Headers(response2.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "no-referrer");
      headers.set("X-Frame-Options", "DENY");
      headers.set("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
      return new Response(response2.body, { status: response2.status, statusText: response2.statusText, headers });
    } catch (err) {
      if (url.pathname.endsWith(".__PAGE__.txt")) {
        return new Response("", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return new Response("Not Found", { status: 404 });
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
