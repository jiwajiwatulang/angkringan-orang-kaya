const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');
c = c.replace(/\?\?\? Meja/g, '🍽️ Meja');
c = c.replace(/\? Menu/g, '☕ Menu');
c = c.replace(/\{\s*isDark \? '\?\?' : '\?\?'\s*\}/g, '{isDark ? "☀️" : "🌙"}');
c = c.replace(/>\s*\?\?\s*<\/Link>/g, '>⚙️</Link>');
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
