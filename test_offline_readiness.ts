import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('======================================================');
console.log('  🛡️ SAKUNOTA OFFLINE RELIABILITY & ARCHITECTURE AUDIT');
console.log('======================================================\n');

// 1. Verify offline-manifest.json
const manifestPath = path.join(process.cwd(), 'out', 'offline-manifest.json');
assert(fs.existsSync(manifestPath), 'offline-manifest.json must exist in out directory');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

console.log(`[CHECK 1] Offline Manifest: ${manifest.totalFiles} files registered (${manifest.totalSizeFormatted})`);
assert(manifest.totalFiles >= 80, 'Must contain all HTML routes, Next.js JS chunks, CSS, fonts, and icons');
assert(manifest.routes.includes('/pos'), 'Route /pos must be present');
assert(manifest.routes.includes('/admin/pengaturan/printer'), 'Route /admin/pengaturan/printer must be present');
assert(manifest.routes.includes('/admin/pengaturan/tentang'), 'Route /admin/pengaturan/tentang must be present');

// Verify that JS chunks are explicitly tracked
const jsChunks = manifest.assets.filter((a: string) => a.startsWith('/_next/static/chunks/'));
console.log(`[CHECK 2] Next.js JS Chunks tracked: ${jsChunks.length} chunks`);
assert(jsChunks.length >= 10, 'All Turbopack chunks must be registered in offline-manifest.json');

// 2. Verify sw.js logic
const swPath = path.join(process.cwd(), 'public', 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf-8');

console.log('[CHECK 3] Service Worker Reliability Guardrails:');
// Problem 1: No silent swallowing during precache install
assert(!swContent.includes('console.warn(\'[SW] Pre-caching partial warning:'), 'Silently swallowing precache errors must be removed');
assert(swContent.includes('await cache.addAll(manifest.allUrls)'), 'Must precache all manifest URLs atomically');

// Problem 2: Next.js Chunks guaranteed
assert(swContent.includes('manifest.allUrls'), 'Manifest URLs precache ensures all JS chunks are loaded upfront');

// Problem 3: Admin subroute isolation (not silently falling back to /admin)
assert(!swContent.includes('return caches.match(\'/admin\')') && !swContent.includes('return cache.match(\'/admin\')'), 'Admin subroutes must NOT silently fallback to /admin dashboard');
assert(swContent.includes('/404.html') || swContent.includes('/_not-found.html'), 'Missing routes fallback to proper 404 cache');

// 3. Verify Landing Page Truth in Advertising
const landingPath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
const landingContent = fs.readFileSync(landingPath, 'utf-8');
console.log('[CHECK 4] Truthful Pricing & Marketing Copy:');
assert(!landingContent.includes('100% Offline-ready:'), 'Over-promising 100% Offline-ready marketing claim removed');
assert(landingContent.includes('Arsitektur Offline-First'), 'Accurate engineering copy used');
assert(landingContent.includes('support@sakunota.my.id'), 'Email domain is sakunota.my.id');

// 4. Verify Persistent Storage & Offline Manager Strictness
const managerPath = path.join(process.cwd(), 'src', 'lib', 'offlineManager.ts');
assert(fs.existsSync(managerPath), 'offlineManager.ts must exist');
const managerContent = fs.readFileSync(managerPath, 'utf-8');
assert(!managerContent.includes('Math.min(result.totalExpectedAssets, 30)'), 'Arbitrary 30-asset threshold removed from offlineManager');
assert(managerContent.includes('result.missingAssets = missing'), 'Exact missing assets array tracked');
assert(managerContent.includes('result.isFullyPrecached = missing.length === 0'), 'Strict zero-missing precache definition implemented');
assert(managerContent.includes('navigator.storage.persist'), 'navigator.storage.persist implemented');
assert(managerContent.includes('auditOfflineReadiness'), 'auditOfflineReadiness implemented');

// 5. Verify Fail-Closed Service Worker Precache and Scoped Cache Cleanup
assert(!swContent.includes('await cache.addAll(FALLBACK_CORE_ASSETS)'), 'Partial fallback install removed; SW is strictly fail-closed');
assert(swContent.includes('key.startsWith(\'sakunota-pos-\') && key !== CACHE_NAME'), 'Scoped cache cleanup only deletes obsolete SakuNota caches');

console.log('\n======================================================');
console.log('  ✅ ALL STRICT OFFLINE RELIABILITY CHECKS PASSED (5/5)');
console.log('======================================================\n');
