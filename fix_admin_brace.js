const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/const isDrinkCategory = \(cat: string\) => \{\s*if\(!cat\) return false;\s*const c = cat\.toLowerCase\(\);\s*return c\.includes\('minuman'\) \|\| c\.includes\('kopi'\) \|\| c\.includes\('tea'\) \|\| c\.includes\('matcha'\) \|\| c\.includes\('drink'\) \|\| c\.includes\('coffee'\) \|\| c\.includes\('milkshake'\) \|\| c\.includes\('beverage'\) \|\| c\.includes\('juice'\);\s*\};\s*\};/g, `const isDrinkCategory = (cat: string) => {
    if(!cat) return false;
    const c = cat.toLowerCase();
    return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') || c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
  };`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
