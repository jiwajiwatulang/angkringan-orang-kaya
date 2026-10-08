const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/<div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-\[55vh\] md:h-auto overflow-hidden transition-colors">/, `<div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full pb-20 md:pb-0 overflow-hidden transition-colors">`);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
