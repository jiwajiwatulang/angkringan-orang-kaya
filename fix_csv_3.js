const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/const exportToCSV = \(\) => \{[\s\S]*?link\.href = url;/, 
`const exportToCSV = () => {
    let csvContent = "No. Nota,Waktu,Tipe Order,Meja,Nama Pelanggan,Catatan,Metode Pembayaran,Total (Rp)\\n";
    
    filteredOrders.forEach(order => {
      const nota = \`A-\${order.id}\`;
      const date = new Date(order.createdAt).toLocaleString('id-ID');
      const type = order.orderType || "Dine-in";
      const meja = order.tableId ? (tables.find(t => t.id === order.tableId)?.nomor || "-") : "-";
      const name = order.customerName || "";
      const notes = order.notes || "";
      const method = order.paymentMethod || "";
      const total = order.total;
      
      csvContent += \`"\${nota}","\${date}","\${type}","\${meja}","\${name}","\${notes}","\${method}","\${total}"\\n\`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
