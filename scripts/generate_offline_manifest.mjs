import fs from 'node:fs';
import path from 'node:path';

const {version: appVersion}=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const outDir = path.resolve('out');
const publicDir = path.resolve('public');

if (!fs.existsSync(outDir)) {
  console.error('[offline-manifest] Folder "out" belum ada. Jalankan "next build" terlebih dahulu.');
  process.exit(1);
}

function walkDir(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath, baseDir));
    } else {
      const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({
        path: relPath,
        size: stat.size
      });
    }
  }
  return results;
}

const allFiles = walkDir(outDir);

// Filter out Next.js build trace / txt files and redundant dev artifacts
const validFiles = allFiles.filter(f => {
  if (f.path.startsWith('/retail-photo/')) return false; // Optional: downloaded only from Retail settings.
  if (f.path.endsWith('.txt')) return false;
  if (f.path.endsWith('.map')) return false;
  if (f.path === '/sw.js') return false; // sw.js manages itself
  if (f.path === '/offline-manifest.json') return false;
  if (f.path === '/_headers' || f.path === '/_redirects') return false;
  return true;
});

// Separate into clean canonical routes and static assets
const routes = new Set();
const staticAssets = [];

for (const file of validFiles) {
  if (file.path.endsWith('.html')) {
    let cleanRoute = file.path.replace(/\.html$/, '');
    if (cleanRoute === '/index') cleanRoute = '/';
    if (cleanRoute.endsWith('/index')) cleanRoute = cleanRoute.replace(/\/index$/, '');
    
    // Ignore internal Next.js error fallback pages from precache routes
    if (cleanRoute === '/404' || cleanRoute === '/_not-found') {
      continue;
    }
    
    routes.add(cleanRoute);
    routes.add(file.path);
  } else {
    staticAssets.push(file.path);
  }
}

const routesList = Array.from(routes).sort();
const staticAssetsList = staticAssets.sort();

const allPrecachableUrls = Array.from(new Set([...routesList, ...staticAssetsList])).sort();

const totalBytes = validFiles.reduce((acc, cur) => acc + cur.size, 0);

const buildTimestamp = Date.now();
const cacheVersion = `sakunota-pos-v${appVersion}-${buildTimestamp}`;

const manifestData = {
  version: cacheVersion,
  generatedAt: new Date().toISOString(),
  totalFiles: allPrecachableUrls.length,
  totalBytes,
  totalSizeFormatted: `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
  routes: routesList,
  assets: staticAssetsList,
  allUrls: allPrecachableUrls
};

const jsonContent = JSON.stringify(manifestData, null, 2);

fs.writeFileSync(path.join(outDir, 'offline-manifest.json'), jsonContent);
if (fs.existsSync(publicDir)) {
  fs.writeFileSync(path.join(publicDir, 'offline-manifest.json'), jsonContent);
}

// Auto-update CACHE_NAME in public/sw.js and out/sw.js so every build triggers SW update in client browsers
const updateSwCacheName = (swPath) => {
  if (fs.existsSync(swPath)) {
    let content = fs.readFileSync(swPath, 'utf8');
    content = content.replace(/const CACHE_NAME = 'sakunota-pos-[^']+';/, `const CACHE_NAME = '${cacheVersion}';`);
    fs.writeFileSync(swPath, content, 'utf8');
  }
};

updateSwCacheName(path.join(publicDir, 'sw.js'));
updateSwCacheName(path.join(outDir, 'sw.js'));

console.log(`[offline-manifest] Berhasil dibuat: ${allPrecachableUrls.length} file terdaftar (${manifestData.totalSizeFormatted}), Cache: ${cacheVersion}`);
