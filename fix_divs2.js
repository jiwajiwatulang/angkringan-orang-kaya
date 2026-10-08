const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

// replace </div>\n</div>\n</div>\n</> with just </div>\n</div>\n</>
c = c.replace(/<\/div>\n<\/div>\n<\/div>\n<\/>/, '</div>\n</div>\n</>');
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
