const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

const regex = /let resultId;\s*if\s*\(editingOrderId\)\s*\{\s*await updateOrder\(editingOrderId,\s*payload\);\s*resultId\s*=\s*editingOrderId;\s*\}\s*else\s*\{\s*const result\s*=\s*await createOrder\(payload\);\s*resultId\s*=\s*result.id;\s*\}/s;

const replacement = `let resultId;
      let finalItems = cart;
      let isRevision = false;
      let targetOrderId = editingOrderId;

      if (!targetOrderId && orderType === "Dine-in" && selectedTable) {
        const existingOrder = activeOrders.find(o => o.tableId === parseInt(selectedTable));
        if (existingOrder) targetOrderId = existingOrder.id;
      }

      if (targetOrderId) {
        isRevision = true;
        if (!editingOrderId) {
          // Merge items for implicit addition
          const existingOrder = activeOrders.find(o => o.id === targetOrderId);
          const merged = [...existingOrder.items];
          
          cart.forEach(newItem => {
             const exIdx = merged.findIndex(i => i.menuItemId === newItem.id);
             if (exIdx >= 0) merged[exIdx].quantity += newItem.qty;
             else merged.push({ menuItemId: newItem.id, hargaSatuan: newItem.harga, quantity: newItem.qty });
          });
          
          // Fix payload items to match db format temporarily for payload, 
          // wait actually createOrder/updateOrder expects \`cart\` array format (it maps it internally)
          // Let's just merge them in cart format
          
          const cartFormattedOld = existingOrder.items.map((i: any) => ({
            id: i.menuItemId,
            nama: menuData.find((m:any) => m.id === i.menuItemId)?.nama || 'Item',
            harga: i.hargaSatuan,
            kategori: menuData.find((m:any) => m.id === i.menuItemId)?.kategori || '',
            qty: i.quantity
          }));
          
          cart.forEach(newItem => {
            const exIdx = cartFormattedOld.findIndex((i:any) => i.id === newItem.id);
            if (exIdx >= 0) cartFormattedOld[exIdx].qty += newItem.qty;
            else cartFormattedOld.push(newItem);
          });
          
          payload.items = cartFormattedOld;
          payload.total = cartFormattedOld.reduce((sum:number, item:any) => sum + (item.harga * item.qty), 0);
          finalItems = cartFormattedOld;
        }
        
        await updateOrder(targetOrderId, payload);
        resultId = targetOrderId;
      } else {
        const result = await createOrder(payload);
        resultId = result.id;
      }`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
