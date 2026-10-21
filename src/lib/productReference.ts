export interface ProductReference { code: string; name: string; brand: string; quantity: string }
export interface ReferencePack { version: number; source: string; license: string; products: ProductReference[] }
let packPromise: Promise<ReferencePack> | undefined;
export function loadProductReferences(): Promise<ReferencePack> {
  if (!packPromise) packPromise = fetch('/product-reference/indonesia-v1.json', { signal: AbortSignal.timeout(8000) }).then(async response => {
    if (!response.ok) throw new Error('Referensi produk belum tersedia offline.');
    const pack = await response.json() as ReferencePack;
    if (pack.version !== 1 || !Array.isArray(pack.products) || pack.products.length > 10000 || !pack.products.every(p => typeof p.name === 'string' && p.name.length <= 160 && typeof p.brand === 'string' && typeof p.quantity === 'string' && validGtin(p.code))) throw new Error('Referensi produk tidak valid.');
    return pack;
  }).catch(error => { packPromise = undefined; throw error; });
  return packPromise;
}
export function validGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || /^(\d)\1+$/.test(code)) return false;
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum += Number(code[i]) * weight;
  return (10 - sum % 10) % 10 === Number(code.at(-1));
}
export function referenceByBarcode(products: ProductReference[], barcode: string) {
  if (!validGtin(barcode)) return undefined;
  return products.find(p => p.code.padStart(14, '0') === barcode.padStart(14, '0'));
}
export function sameBarcode(a: string, b: string) {
  return a === b || (validGtin(a) && validGtin(b) && a.padStart(14, '0') === b.padStart(14, '0'));
}
const normal = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/(?<=[a-z])0(?=[a-z])/g, 'o').replace(/(\d)\s*(gram|grams|gr)\b/g, '$1g').replace(/(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/g, (_, amount: string, unit: string) => `${Number(amount.replace(',', '.')) * (unit === 'kg' || unit === 'l' ? 1000 : 1)}${unit === 'ml' || unit === 'l' ? 'ml' : 'g'}`).replace(/[^a-z0-9]+/g, ' ').trim();
const stopwords = new Set(['dan', 'dengan', 'the', 'with', 'and', 'rasa', 'flavour', 'flavor', 'instant', 'instan', 'mi', 'mie', 'noodles', 'noodle']);
const terms = (text: string) => [...new Set(normal(text).split(' ').filter(t => t.length > 1 && !stopwords.has(t)))];
function sameWord(a: string, b: string) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || /\d/.test(a + b) || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
export function referenceSuggestions(products: ProductReference[], text: string): ProductReference[] {
  const input = new Set(terms(text));
  if (input.size < 2) return [];
  const sizes = [...input].filter(t => /^\d+(g|ml|kg|l)$/.test(t));
  return products.map(product => {
    const brand = terms(product.brand);
    const matchesInput = (word: string) => [...input].some(token => sameWord(word, token));
    const tokens = terms(`${product.name} ${product.quantity} ${brand.filter(matchesInput).join(' ')}`);
    const matches = tokens.filter(matchesInput);
    const brandMatched = brand.some(matchesInput);
    const variantMatches = matches.filter(t => !brand.includes(t) && !/^\d/.test(t));
    const productSizes = terms(product.quantity).filter(t => /^\d+(g|ml|kg|l)$/.test(t));
    if (!brandMatched || variantMatches.length < 1 || matches.length < 2 || (sizes.length && productSizes.length && !sizes.some(t => productSizes.includes(t)))) return { product, score: 0 };
    const score = matches.length / Math.max(tokens.length, 1);
    return { product, score: score >= 0.5 ? score : 0 };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).filter((p, index, list) => list.findIndex(other => normal(`${other.product.name} ${other.product.brand} ${other.product.quantity}`) === normal(`${p.product.name} ${p.product.brand} ${p.product.quantity}`)) === index).slice(0, 3).map(p => p.product);
}
export function referenceDisplayName(product: ProductReference) {
  const name = product.brand.split(',').some(brand => normal(product.name).includes(normal(brand.trim()))) ? product.name : `${product.brand.split(',')[0].trim()} ${product.name}`.trim();
  return (product.quantity && !normal(name).includes(normal(product.quantity)) ? `${name} ${product.quantity}` : name).slice(0, 120);
}
export async function barcodeFromPhoto(image: string): Promise<string | undefined> {
  // Native detection is optional: OCR/manual entry remains available in other browsers.
  const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: new (options: { formats: string[] }) => { detect(image: ImageBitmap): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (!Detector || typeof createImageBitmap !== 'function') return undefined;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(await (await fetch(image)).blob());
    const results = await new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(bitmap);
    return results.map(r => r.rawValue).find(validGtin);
  } catch { return undefined; }
  finally { bitmap?.close(); }
}
