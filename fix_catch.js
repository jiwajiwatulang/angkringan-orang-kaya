const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/setTimeout\(\(\) => \{\s*Printer\.printWebView\(\{ name: 'Nota_Angkringan' \}\);\s*setPrintMode\('all'\);\s*\}, 100\);/, `setTimeout(async () => {
        try {
          await Printer.printWebView({ name: 'Nota_Angkringan' });
        } catch (e) {
          alert('Gagal memanggil print: ' + e);
        }
        setPrintMode('all');
      }, 100);`);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
