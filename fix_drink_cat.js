const fs = require('fs');

['src/app/page.tsx', 'src/app/admin/page.tsx'].forEach(file => {
    let c = fs.readFileSync(file, 'utf8');
    
    // Find the isDrinkCategory arrow function
    const oldFunc = /const isDrinkCategory = \(.*?\).*?;/g;
    const newFunc = `const isDrinkCategory = (cat: string) => {
    if(!cat) return false;
    const c = cat.toLowerCase();
    return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') || c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
  };`;
    
    // There's a chance the regex doesn't match perfectly if it spans multiple lines. Let's do string replacement.
    c = c.replace(/const isDrinkCategory = \([^\)]+\) => [\s\S]*?;/g, newFunc);
    
    fs.writeFileSync(file, c, 'utf8');
});
