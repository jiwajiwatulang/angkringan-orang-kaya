const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/import \{ useState, useEffect \} from 'react';/, `import { useState, useEffect } from 'react';\nimport { Printer } from '@capgo/capacitor-printer';`);

c = c.replace(/window\.print\(\);/g, `Printer.printWebView({ name: 'Nota_Angkringan' });`);
fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
