import test from "node:test";
import assert from "node:assert/strict";

process.env.SAKUNOTA_SERVER_SECRET = "test-promo-secret-32-chars-long!!";
process.env.SAKUNOTA_OWNER_USERNAME = "owner";
process.env.SAKUNOTA_OWNER_PASSWORD = "test-password";
process.env.SAKUNOTA_OWNER_SALT = "test-salt";

import {
  getD1,
  initD1Tables,
  signOwnerSession,
  createCustomerOrder,
  validatePromoCode,
  listOwnerPromos,
  createOwnerPromo,
  toggleOwnerPromo,
  deleteOwnerPromo,
} from "../src/lib/server/sakunotaServer";
import { createSessionD1 } from "../src/lib/server/d1";

test("Promo Codes: CRUD, discount calculation, quota limits, and checkout integration", async () => {
  const db = getD1();
  await initD1Tables(db);

  const sessionId = "promo-test-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  await createSessionD1(db, sessionId, "owner", Date.now() + 86400000);
  const ownerToken = signOwnerSession("owner", sessionId);

  const codeNominal = "TESTNOM" + Date.now().toString(36).toUpperCase().slice(-4);
  const codePct = "TESTPCT" + Date.now().toString(36).toUpperCase().slice(-4);

  // 1. Create a nominal discount promo (Rp 15.000 off)
  const createNominal = await createOwnerPromo(db, ownerToken, {
    code: codeNominal,
    discountType: "nominal",
    discountValue: 15000,
    description: "Promo Diskon Rp 15.000",
    maxUsage: 2,
  });
  assert.equal(createNominal.success, true);
  assert.equal(createNominal.promo?.code, codeNominal);

  // 2. Validate nominal promo public check
  const valNominal = await validatePromoCode(db, codeNominal.toLowerCase());
  assert.equal(valNominal.valid, true);
  assert.equal(valNominal.discountAmount, 15000);
  assert.equal(valNominal.finalAmount, 35000);

  // 3. Create order using nominal promo
  const order1 = await createCustomerOrder(db, {
    buyerName: "Budi Promo",
    businessName: "Warung Berkah",
    whatsapp: "081234567890",
    promoCode: codeNominal,
  });
  assert.equal(order1.success, true);
  assert.equal(order1.order.amount, 35000);
  assert.equal(order1.order.originalAmount, 50000);
  assert.equal(order1.order.discountAmount, 15000);
  assert.equal(order1.order.promoCode, codeNominal);

  // 4. Create second order to reach maxUsage (2)
  const order2 = await createCustomerOrder(db, {
    buyerName: "Siti Promo",
    businessName: "Kedai Siti",
    whatsapp: "081234567891",
    promoCode: codeNominal,
  });
  assert.equal(order2.success, true);
  assert.equal(order2.order.amount, 35000);

  // 5. Third check should fail due to quota exhaustion
  const valExhausted = await validatePromoCode(db, codeNominal);
  assert.equal(valExhausted.valid, false);
  assert.match(valExhausted.error || "", /Kuota penggunaan kode promo ini sudah habis/i);

  // 6. Create percent discount promo (20% off)
  const createPct = await createOwnerPromo(db, ownerToken, {
    code: codePct,
    discountType: "percent",
    discountValue: 20,
    description: "Promo Diskon 20%",
  });
  assert.equal(createPct.success, true);

  const valPct = await validatePromoCode(db, codePct);
  assert.equal(valPct.valid, true);
  assert.equal(valPct.discountAmount, 10000);
  assert.equal(valPct.finalAmount, 40000);

  // 7. Toggle promo active/inactive
  const promoList = await listOwnerPromos(db, ownerToken);
  assert.equal(promoList.success, true);
  const pctPromo = promoList.promos?.find((p) => p.code === codePct);
  assert.ok(pctPromo && pctPromo.id);

  const toggleRes = await toggleOwnerPromo(db, ownerToken, pctPromo.id, 0);
  assert.equal(toggleRes.success, true);

  const valDeactivated = await validatePromoCode(db, codePct);
  assert.equal(valDeactivated.valid, false);
  assert.match(valDeactivated.error || "", /tidak aktif/i);

  // 8. Delete promo
  const delRes = await deleteOwnerPromo(db, ownerToken, pctPromo.id);
  assert.equal(delRes.success, true);

  const valDeleted = await validatePromoCode(db, codePct);
  assert.equal(valDeleted.valid, false);
});
