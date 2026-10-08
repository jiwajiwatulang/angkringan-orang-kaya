const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/Printer\.printWebView\(\{ name: 'Nota_Angkringan' \}\);/g, `try { await Printer.printWebView({ name: 'Nota_Angkringan' }); } catch (e) { alert('Print error: ' + e); }`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
