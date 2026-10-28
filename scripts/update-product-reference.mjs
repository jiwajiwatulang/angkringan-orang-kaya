// Developer maintenance only. Builds never contact Open Food Facts.
// Usage: node scripts/update-product-reference.mjs [saved-api-page1.json saved-api-page2.json]
import fs from 'node:fs/promises';
const base = 'https://world.openfoodfacts.org/api/v2/search?countries_tags=en%3Aindonesia&fields=code,product_name,product_name_id,brands,quantity&page_size=100&page=';
const args = process.argv.slice(2);
const pages = [];
for (let page = 1; page <= 2; page++) {
  if (args[page - 1]) pages.push(JSON.parse(await fs.readFile(args[page - 1], 'utf8')));
  else {
    const response = await fetch(base + page, { headers: { 'User-Agent': 'SakuNota/2.8.1 (offline reference; https://sakunota.my.id)' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Reference download failed (${response.status}); existing snapshot retained.`);
    pages.push(await response.json());
  }
}
const gtin = code => {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || /^(\d)\1+$/.test(code)) return false;
  let sum = 0; for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum += Number(code[i]) * weight;
  return (10 - sum % 10) % 10 === Number(code.at(-1));
};
const size = value => [...value.toLowerCase().replace(/grams?|gr\b/g, 'g').matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/g)].map(m => `${Number(m[1].replace(',', '.')) * (m[2] === 'kg' || m[2] === 'l' ? 1000 : 1)}${m[2] === 'l' || m[2] === 'ml' ? 'ml' : 'g'}`);
const records = new Map();
let skipped = 0;
for (const product of pages.flatMap(p => p.products || [])) {
  const code = String(product.code || '');
  const name = String(product.product_name_id || product.product_name || '').replace(/\s+/g, ' ').trim();
  const brand = String(product.brands || '').replace(/\s+/g, ' ').trim();
  const quantity = String(product.quantity || '').trim();
  const nameSizes = size(name), quantitySizes = size(quantity);
  if (/\d+\s*[x×]\s*\d/i.test(name) || !gtin(code) || name.length < 3 || name.length > 120 || !brand || brand.length > 100 || quantity.length > 40 || (nameSizes.length && quantitySizes.length && !nameSizes.some(s => quantitySizes.includes(s)))) { skipped++; continue; }
  records.set(code.padStart(14, '0'), { code, name, brand, quantity });
}
const products = [...records.values()].sort((a, b) => a.code.localeCompare(b.code));
if (products.length < 50) throw new Error('Insufficient usable references; existing snapshot retained.');
const pack = { version: 1, title: 'Referensi awal produk pangan kemasan', source: 'Open Food Facts contributors', sourceUrl: 'https://world.openfoodfacts.org', retrievedAt: new Date().toISOString(), license: 'ODbL-1.0', licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/', contentsLicenseUrl: 'https://opendatacommons.org/licenses/dbcl/1-0/', queries: [base + '1', base + '2'], scope: '200 source rows tagged Indonesia; filtered for usable names, brands, valid GTIN and consistent size. Not a complete or verified national catalog. No prices or images.', skipped, products };
await fs.mkdir('public/product-reference', { recursive: true });
await fs.writeFile('public/product-reference/indonesia-v1.json', JSON.stringify(pack, null, 2) + '\n');
console.log(`Offline reference: ${products.length} records, ${skipped} excluded; ${(JSON.stringify(pack).length / 1024).toFixed(1)} KB compact.`);
