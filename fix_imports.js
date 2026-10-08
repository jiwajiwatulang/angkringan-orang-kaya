const fs = require('fs');
['src/app/page.tsx', 'src/app/admin/page.tsx'].forEach(file => {
    let c = fs.readFileSync(file, 'utf8');
    
    // Add imports if they don't exist
    const importsToAdd = [];
    if (!c.includes('@capgo/capacitor-printer')) {
        importsToAdd.push(`import { Printer } from '@capgo/capacitor-printer';`);
    }
    if (!c.includes('@ascentio-it/capacitor-bluetooth-serial')) {
        importsToAdd.push(`import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';`);
    }
    
    if (importsToAdd.length > 0) {
        c = c.replace(/import Link from "next\/link";/, `import Link from "next/link";\n` + importsToAdd.join('\n'));
    }
    
    fs.writeFileSync(file, c, 'utf8');
});
