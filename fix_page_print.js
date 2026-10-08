const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

const importBluetooth = `import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';\n`;
if (!c.includes('@ascentio-it/capacitor-bluetooth-serial')) {
    c = c.replace(/import \{ Printer \} from '@capgo\/capacitor-printer';/, `import { Printer } from '@capgo/capacitor-printer';\n${importBluetooth}`);
}

const newHandlePrint = `
  const handlePrint = async (mode: 'all' | 'food' | 'drink') => {
    const isAndroid = /android/i.test(navigator.userAgent);
    setPrintMode(mode);
    
    setTimeout(async () => {
      try {
        const mac = localStorage.getItem('bt_printer_mac');
        if (isAndroid && mac && dataToPrint) {
          // Direct bluetooth print
          const textToPrint = generateRawBTText(dataToPrint, mode);
          
          try {
             // Coba connect dulu, kalau sudah connect biasanya gagal jadi ignore errornya
             await BluetoothSerial.connect({ address: mac });
          } catch(e) {
             console.log("Connect err, maybe already connected", e);
          }
          
          await BluetoothSerial.write({ value: textToPrint });
          alert("Berhasil dicetak langsung ke Printer!");
          
          // Optional: disconnect
          // await BluetoothSerial.disconnect();
        } else {
          // Fallback native dialog
          await Printer.printWebView({ name: 'Nota_Angkringan' });
        }
      } catch (e: any) {
        alert('Gagal memanggil print: ' + JSON.stringify(e));
        try {
           await Printer.printWebView({ name: 'Nota_Angkringan' });
        } catch(e2) {}
      }
      setPrintMode('all');
    }, 100);
  };
`;

c = c.replace(/const handlePrint = \(mode: 'all' \| 'food' \| 'drink'\) => \{[\s\S]*?setPrintMode\('all'\);\s*\}, 100\);\s*\};/, newHandlePrint.trim());

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
