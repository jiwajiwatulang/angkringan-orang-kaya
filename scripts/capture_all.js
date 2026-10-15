const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3333;
const OUT_DIR = path.resolve(__dirname, '..', 'out');
const DEST_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\4c7a1509-3477-4c30-b661-18b9208deb22\\mobile_adaptive_audit');
const EDGE_BIN = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  
  let filePath = path.join(OUT_DIR, reqPath);
  
  // Try exact path
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening at http://localhost:${PORT}`);

  const targets = [
    { name: '360_home.png', width: 360, height: 800, url: `http://localhost:${PORT}/pos?tab=home` },
    { name: '390_home.png', width: 390, height: 844, url: `http://localhost:${PORT}/pos?tab=home` },
    { name: '390_menu.png', width: 390, height: 844, url: `http://localhost:${PORT}/pos?tab=menu` },
    { name: '390_meja.png', width: 390, height: 844, url: `http://localhost:${PORT}/pos?tab=meja` },
    { name: '390_nota.png', width: 390, height: 844, url: `http://localhost:${PORT}/pos?tab=nota` },
    { name: '390_lainnya.png', width: 390, height: 844, url: `http://localhost:${PORT}/pos?tab=lainnya` },
    { name: '430_home.png', width: 430, height: 932, url: `http://localhost:${PORT}/pos?tab=home` },
    { name: '430_menu.png', width: 430, height: 932, url: `http://localhost:${PORT}/pos?tab=menu` },
    { name: '768_tablet_menu.png', width: 768, height: 1024, url: `http://localhost:${PORT}/pos?tab=menu` },
    { name: '1024_tablet_menu.png', width: 1024, height: 768, url: `http://localhost:${PORT}/pos?tab=menu` },
    { name: '1280_desktop_pos.png', width: 1280, height: 800, url: `http://localhost:${PORT}/pos` },
    { name: '1440_desktop_pos.png', width: 1440, height: 900, url: `http://localhost:${PORT}/pos` },
    { name: '390_landing.png', width: 390, height: 844, url: `http://localhost:${PORT}/` },
    { name: '1280_landing.png', width: 1280, height: 800, url: `http://localhost:${PORT}/` }
  ];

  for (const t of targets) {
    const outPath = path.join(DEST_DIR, t.name);
    console.log(`Capturing ${t.name} (${t.width}x${t.height}) from ${t.url}...`);
    try {
      const cmd = `"${EDGE_BIN}" --headless --disable-gpu --virtual-time-budget=3000 --hide-scrollbars --window-size=${t.width},${t.height} --screenshot="${outPath}" "${t.url}"`;
      execSync(cmd, { stdio: 'ignore' });
      if (fs.existsSync(outPath)) {
        const stats = fs.statSync(outPath);
        console.log(`  ✓ OK: ${t.name} (${stats.size} bytes)`);
      } else {
        console.warn(`  ✗ Failed: ${t.name} not created`);
      }
    } catch (err) {
      console.error(`  ✗ Error capturing ${t.name}:`, err.message);
    }
  }

  console.log('\nAll captures completed!');
  server.close();
  process.exit(0);
});
