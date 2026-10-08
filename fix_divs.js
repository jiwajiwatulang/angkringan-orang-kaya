const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/<\/div>\r?\n<\/>/, '</div>\n</div>\n</div>\n</>');
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
