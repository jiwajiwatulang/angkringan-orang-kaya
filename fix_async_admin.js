const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/setTimeout\(\(\) => \{\s*try \{ await Printer\.printWebView/g, `setTimeout(async () => { try { await Printer.printWebView`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
