const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/import \{ useState, useEffect \} from 'react';/, `import { useState, useEffect } from 'react';\nimport { Printer } from '@capgo/capacitor-printer';`);

c = c.replace(/window\.print\(\);/g, `Printer.printWebView({ name: 'Nota_Angkringan' });`);

// Fix modal max-h-[90vh] overflow to have safe-area padding for keyboard?
// Let's also ensure `flex items-center` -> `flex items-center md:items-start md:pt-10` or something.
// Actually, `KeyboardResize.Body` already shrinks the viewport, so it will naturally fit and scroll.
// I will just add pt-4 or similar if needed. But it's probably fine.
// But wait, the user said "ketutupan keyboard jadinya".
// If I use `items-center`, the modal stays vertically centered. If viewport shrinks to 300px, 
// the modal (e.g. 500px tall) gets cut off at top and bottom equally! 
// This means the top (where close button is) and bottom (where inputs are) are cut off.
// If I change it to `items-start justify-center pt-8 overflow-y-auto`, the modal starts from top and scrolls!
c = c.replace(/className="fixed inset-0 bg-black\/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"/g, `className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center md:items-start md:pt-10 justify-center z-50 p-4 overflow-y-auto"`);
c = c.replace(/className="fixed inset-0 bg-black\/60 flex items-center justify-center z-50 p-4"/g, `className="fixed inset-0 bg-black/60 flex items-start pt-10 justify-center z-50 p-4 overflow-y-auto"`);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
