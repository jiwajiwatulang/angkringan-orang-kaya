const https = require('https');

const BASE = 'https://angkringan-orang-kaya.ranutarde.workers.dev';
const endpoints = [
  '/api/owner/orders',
  '/api/owner/licenses',
  '/api/owner/tester-license',
  '/api/owner/beta',
  '/api/owner/metrics'
];

console.log('🛡️  [MUTINO] Memulai Razia Keamanan API Server...');
console.log('Target:', BASE);
console.log('------------------------------------------------------');

let passed = 0;
let total = endpoints.length;

function checkEndpoint(idx) {
  if (idx >= endpoints.length) {
    console.log('------------------------------------------------------');
    if (passed === total) {
      console.log(`🏆 [LAPORAN MUTINO KE CEO] SEMUA AMAN (${passed}/${total})!`);
      console.log('Seluruh pintu rahasia terkunci rapat dengan status 401 Unauthorized.');
    } else {
      console.log(`⚠️ [PERINGATAN MUTINO] Ada ${total - passed} endpoint yang lolos sensor!`);
    }
    return;
  }

  const ep = endpoints[idx];
  const req = https.get(BASE + ep, (res) => {
    if (res.statusCode === 401) {
      console.log(`  ✅ [GEMBOK 401 OK] ${ep}`);
      passed++;
    } else {
      console.log(`  ❌ [BAHAYA! HTTP ${res.statusCode}] ${ep}`);
    }
    checkEndpoint(idx + 1);
  });

  req.on('error', (err) => {
    console.log(`  ⚠️ [ERROR KONEKSI] ${ep}: ${err.message}`);
    checkEndpoint(idx + 1);
  });
}

checkEndpoint(0);
