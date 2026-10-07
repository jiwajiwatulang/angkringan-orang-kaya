const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

const start = c.indexOf('const processPayment = async (isDraftOnly = false, status = \'paid\') => {');
const end = c.indexOf('const handleShowDraftBill = () => {');

const replacement = `const processPayment = async (isDraftOnly = false, status = 'paid') => {
    if (cart.length === 0) return;
    
    if (!customerName.trim()) {
      alert("Nama Pelanggan wajib diisi!");
      return;
    }
    
    try {
      const { createOrder, updateOrder } = await import('@/lib/api');
      
      let finalItems = cart;
      let finalTotal = totalPrice;
      let isRevision = false;
      let targetOrderId = editingOrderId;

      if (!targetOrderId && orderType === "Dine-in" && selectedTable) {
        const existingOrder = activeOrders.find(o => o.tableId === parseInt(selectedTable));
        if (existingOrder) targetOrderId = existingOrder.id;
      }

      const payload: any = {
        items: finalItems,
        total: finalTotal,
        customerName,
        customerPhone: "",
        paymentMethod,
        orderType,
        notes,
        tableId: orderType === "Dine-in" && selectedTable ? parseInt(selectedTable) : null,
        status: status
      };

      let resultId;

      if (targetOrderId) {
        isRevision = true;
        if (!editingOrderId) {
          // Merge items for implicit addition
          const existingOrder = activeOrders.find(o => o.id === targetOrderId);
          
          const cartFormattedOld = existingOrder.items.map((i: any) => ({
            id: i.menuItemId,
            nama: menuData.find((m:any) => m.id === i.menuItemId)?.nama || 'Item',
            harga: i.hargaSatuan,
            kategori: menuData.find((m:any) => m.id === i.menuItemId)?.kategori || '',
            qty: i.qty || i.quantity
          }));
          
          cart.forEach(newItem => {
            const exIdx = cartFormattedOld.findIndex((i:any) => i.id === newItem.id);
            if (exIdx >= 0) cartFormattedOld[exIdx].qty += newItem.qty;
            else cartFormattedOld.push(newItem);
          });
          
          payload.items = cartFormattedOld;
          payload.total = cartFormattedOld.reduce((sum:number, item:any) => sum + (item.harga * item.qty), 0);
          finalItems = cartFormattedOld;
          finalTotal = payload.total;
        }
        
        await updateOrder(targetOrderId, payload);
        resultId = targetOrderId;
      } else {
        const result = await createOrder(payload);
        resultId = result.id;
      }

      // Sync table status
      if (payload.tableId) {
        const { setTableStatus } = await import('@/lib/api');
        await setTableStatus(payload.tableId, status === 'paid' ? 'lunas' : 'open');
      }

      const addedItems = cart.filter(item => {
        const oldItem = oldCart.find(o => o.id === item.id);
        return !oldItem || item.qty > oldItem.qty;
      }).map(item => {
        const oldItem = oldCart.find(o => o.id === item.id);
        return { ...item, qty: oldItem ? item.qty - oldItem.qty : item.qty };
      });

      const removedItems = oldCart.filter(oldItem => {
        const item = cart.find(o => o.id === oldItem.id);
        return !item || oldItem.qty > item.qty;
      }).map(oldItem => {
        const item = cart.find(o => o.id === oldItem.id);
        return { ...oldItem, qty: item ? oldItem.qty - item.qty : oldItem.qty };
      });

      setReceiptData({
        isDraft: isDraftOnly,
        isRevision: isRevision,
        addedItems: addedItems,
        removedItems: removedItems,
        orderId: resultId, 
        date: new Date().toLocaleString('id-ID'),
        customerName,
        notes,
        paymentMethod,
        orderType,
        tableName: payload.tableId ? tableData.find(t => t.id === payload.tableId)?.nomor : null,
        items: finalItems,
        total: finalTotal
      });

      resetCart();
      setOrderType("Dine-in");
      setSelectedTable("");
      setView('meja');
      setIsPaymentModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  `;

c = c.substring(0, start) + replacement + c.substring(end);
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
