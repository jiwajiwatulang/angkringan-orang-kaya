const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/const isAndroid = \/android\/i\.test\(navigator\.userAgent\);\s*if\s*\(isAndroid\s*&&\s*dataToPrint\)\s*\{\s*const\s*base64\s*=\s*generateRawBTText\(dataToPrint,\s*mode\);\s*window\.location\.href\s*=\s*`intent:\$\{base64\}#Intent;scheme=rawbt;package=ru\.a402d\.rawbtprinter;end;`;\s*return;\s*\}/, `// RawBT intent removed to allow Capacitor Printer Plugin to trigger native print dialog`);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
