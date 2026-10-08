const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

const genRawText = `
  const generateRawBTText = (receipt: any, mode: string) => {
    let txt = "        ANGKRINGAN POS        \\n";
    txt += "--------------------------------\\n";
    txt += \`Tgl: \${receipt.date}\\n\`;
    txt += \`Antrean: \${receipt.orderId === "-" ? "-" : "A-" + receipt.orderId}\\n\`;
    txt += \`Tamu: \${receipt.customerName || "Tamu"} [\${receipt.orderType}]\\n\`;
    if (receipt.tableName) txt += \`Meja: \${receipt.tableName}\\n\`;
    if (receipt.notes) txt += \`Catatan: \${receipt.notes}\\n\`;
    txt += "--------------------------------\\n";
    
    let total = 0;
    receipt.items.forEach((item: any) => {
      if (mode === 'food' && isDrinkCategory(item.kategori)) return;
      if (mode === 'drink' && !isDrinkCategory(item.kategori)) return;
      
      let itemName = item.nama.substring(0, 20).padEnd(20, " ");
      let itemQtyStr = (item.qty + "x").padEnd(4, " ");
      let subtotal = item.qty * item.harga;
      total += subtotal;
      txt += \`\${itemName}\\n\${itemQtyStr}Rp \${item.harga.toLocaleString('id-ID').padStart(7, " ")}\\n\`;
    });
    txt += "--------------------------------\\n";
    if (mode === 'all') {
      txt += \`TOTAL: Rp \${total.toLocaleString('id-ID')}\\n\`;
      txt += \`Metode: \${receipt.paymentMethod}\\n\`;
    }
    txt += "\\n     Terima Kasih     \\n\\n\\n";
    return txt;
  };

  const handlePrint = async (mode: 'all' | 'food' | 'drink') => {
    const isAndroid = /android/i.test(navigator.userAgent);
    setPrintMode(mode);
    
    setTimeout(async () => {
      try {
        const mac = localStorage.getItem('bt_printer_mac');
        if (isAndroid && mac && receiptData) {
          const textToPrint = generateRawBTText(receiptData, mode);
          
          try {
             await BluetoothSerial.connect({ address: mac });
          } catch(e) {}
          
          await BluetoothSerial.write({ value: textToPrint });
          alert("Berhasil dicetak langsung ke Printer!");
        } else {
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

c = c.replace(/const handlePrint = \(mode: 'all' \| 'food' \| 'drink'\) => \{[\s\S]*?\}, 100\);\s*\};/, genRawText.trim());

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
