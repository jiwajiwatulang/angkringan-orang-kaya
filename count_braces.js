const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

const match1 = c.match(/\{/g) || [];
const match2 = c.match(/\}/g) || [];

console.log("Open: " + match1.length + ", Close: " + match2.length);
