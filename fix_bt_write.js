const fs = require('fs');

['src/app/page.tsx', 'src/app/admin/page.tsx'].forEach(file => {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(/await BluetoothSerial\.write\(\{ value: textToPrint \}\);/g, 'await BluetoothSerial.write({ address: mac, value: textToPrint });');
    fs.writeFileSync(file, c, 'utf8');
});
