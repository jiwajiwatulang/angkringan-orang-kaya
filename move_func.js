const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

const match = c.match(/const renderCartInner = \(isMobile: boolean\) => \([\s\S]*?<\/>\n  \);/);
if(match) {
   const innerFunc = match[0];
   c = c.replace(innerFunc, '');
   
   // find the LAST return (
   const lastReturn = c.lastIndexOf('return (');
   if(lastReturn !== -1) {
       c = c.slice(0, lastReturn) + innerFunc + '\n  ' + c.slice(lastReturn);
   }
   fs.writeFileSync('src/app/page.tsx', c, 'utf8');
}
