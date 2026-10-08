const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

if (!c.trim().endsWith('}')) {
    c += '\n}\n';
    fs.writeFileSync('src/app/page.tsx', c, 'utf8');
}
