"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type MenuItem = { id: number; nama: string; harga: number; kategori: string; isGroup?: boolean; variants?: MenuItem[]; isSoldOut?: boolean; };
type CartItem = MenuItem & { qty: number };

export default function POSPage() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [view, setView] = useState<'meja' | 'menu'>('meja');
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true); document.documentElement.classList.add('dark');
    } else {
      setIsDark(false); document.documentElement.classList.remove('dark');
    }
  }, []);
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) { document.documentElement.classList.add('dark'); localStorage.theme = 'dark'; }
    else { document.documentElement.classList.remove('dark'); localStorage.theme = 'light'; }
  };

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [oldCart, setOldCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Payment & Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [orderType, setOrderType] = useState("Dine-in");
  const [selectedTable, setSelectedTable] = useState<string>("");

  const [receiptData, setReceiptData] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'all' | 'food' | 'drink'>('all');

  const [activeVariantGroup, setActiveVariantGroup] = useState<any>(null);

  const loadData = async () => {
    const { getMenus, getOrders, getTables } = await import('@/lib/api');
    const menus = await getMenus();
    const tables = await getTables();
    const orders = await getOrders();
    
    // Group variants
    const groupedMenus: MenuItem[] = [];
    const groups: Record<string, MenuItem[]> = {};
    
    menus.forEach((m: any) => {
      if (m.nama.includes('(Hot)') || m.nama.includes('(Ice)')) {
        const baseName = m.nama.replace(/\s*\(.*\)\s*/, '');
        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(m);
      } else {
        groupedMenus.push(m);
      }
    });

    for (const [baseName, variants] of Object.entries(groups)) {
      if (variants.length > 1) {
        groupedMenus.push({
          id: variants[0].id * 1000, // pseudo id
          nama: baseName,
          harga: variants[0].harga,
          kategori: variants[0].kategori,
          isGroup: true,
          variants: variants
        });
      } else {
        groupedMenus.push(variants[0]);
      }
    }

    setMenuData(groupedMenus);
    setTableData(tables);
    setAllOrders(orders);
    setActiveOrders(orders.filter((o: any) => o.status === 'unpaid'));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const categories = ["Semua", ...Array.from(new Set(menuData.map(m => m.kategori)))];

  const filteredMenu = menuData.filter(m => 
    (activeCategory === "Semua" || m.kategori === activeCategory) &&
    (m.nama.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTableStatus = (table: any) => {
    if (activeOrders.some(o => o.tableId === table.id)) return 'open'; // Merah
    if (allOrders.some(o => o.tableId === table.id && o.status === 'paid')) return 'lunas'; // Biru (Lunas tapi belum clear)
    return 'kosong'; // Hijau
  };

  const loadOrderIntoCart = (order: any) => {
    const loadedCart = order.items.map((i: any) => ({
      id: i.menuItemId,
      nama: menuData.find(m => m.id === i.menuItemId)?.nama || 'Item Terhapus',
      harga: i.hargaSatuan,
      kategori: menuData.find(m => m.id === i.menuItemId)?.kategori || 'Lainnya',
      qty: i.qty || i.quantity
    }));
    setCart(loadedCart);
    setOldCart(JSON.parse(JSON.stringify(loadedCart)));
    setCustomerName(order.customerName || "");
    setNotes(order.notes || "");
    setPaymentMethod(order.paymentMethod || "Cash");
    setEditingOrderId(order.id);
  };

  const handleTableClick = (table: any) => {
    const status = getTableStatus(table);
    
    if (status === 'open') {
      resetCart();
      const order = activeOrders.find(o => o.tableId === table.id);
      if (order) loadOrderIntoCart(order);
    } else if (status === 'lunas') {
      resetCart();
      const lastPaid = [...allOrders].find(o => o.tableId === table.id && o.status === 'paid');
      if (lastPaid?.customerName) setCustomerName(lastPaid.customerName);
    }
    
    setOrderType("Dine-in");
    setSelectedTable(table.id.toString());
    setView('menu');
  };

  const handleClearTable = async () => {
    if (!selectedTable) return;
    try {
      const { refreshTableStatus } = await import('@/lib/api');
      await refreshTableStatus(parseInt(selectedTable));
      setSelectedTable("");
      setView('meja');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };
  const addToCart = (item: MenuItem) => {
    if (item.isSoldOut) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, qty: item.qty + delta };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const resetCart = () => {
    setCart([]);
    setOldCart([]);
    setCustomerName("");
    setNotes("");
    setPaymentMethod("Cash");
    setEditingOrderId(null);
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const selectedTableObj = tableData.find(t => t.id.toString() === selectedTable);
  const selectedTableStatus = selectedTableObj ? getTableStatus(selectedTableObj) : null;
  const isDrinkCategory = (cat: string) => cat.toLowerCase().includes('minuman') || cat.toLowerCase().includes('kopi') || cat.toLowerCase().includes('tea') || cat.toLowerCase().includes('matcha');

  const processPayment = async (isDraftOnly = false, status = 'paid') => {
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

      const newReceipt = {
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
      };
      
      setReceiptData(newReceipt);

      resetCart();
      setOrderType("Dine-in");
      setSelectedTable("");
      setView('meja');
      setIsPaymentModalOpen(false);
      loadData();

      if (status === 'paid') {
        setTimeout(() => {
          handlePrint('all', newReceipt);
        }, 500);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleShowDraftBill = () => {
    if (cart.length === 0) return;
    setReceiptData({
      isDraft: true,
      isRevision: false,
      addedItems: [],
      removedItems: [],
      orderId: editingOrderId || "-", 
      date: new Date().toLocaleString('id-ID'),
      customerName,
      notes,
      paymentMethod,
      orderType,
      tableName: selectedTable ? tableData.find(t => t.id.toString() === selectedTable)?.nomor : null,
      items: [...cart],
      total: totalPrice
    });
  };

  const generateRawBTText = (receipt: any, mode: string) => {
    let txt = "        ANGKRINGAN POS        \n";
    txt += "--------------------------------\n";
    txt += `Tgl: ${receipt.date}\n`;
    txt += `Antrean: ${receipt.orderId === "-" ? "-" : "A-" + receipt.orderId}\n`;
    txt += `Tamu: ${receipt.customerName || "Tamu"} [${receipt.orderType}]\n`;
    if (receipt.tableName) txt += `Meja: ${receipt.tableName}\n`;
    if (receipt.notes) txt += `Catatan: ${receipt.notes}\n`;
    txt += "--------------------------------\n";
    
    let total = 0;
    receipt.items.forEach((item: any) => {
      if (mode === 'food' && isDrinkCategory(item.kategori)) return;
      if (mode === 'drink' && !isDrinkCategory(item.kategori)) return;
      
      let itemName = item.nama.substring(0, 20).padEnd(20, " ");
      let itemQtyStr = (item.qty + "x").padEnd(4, " ");
      let subtotal = item.qty * item.harga;
      total += subtotal;
      txt += `${itemName}\n${itemQtyStr}Rp ${item.harga.toLocaleString('id-ID').padStart(7, " ")}\n`;
    });
    txt += "--------------------------------\n";
    if (mode === 'all') {
      txt += `TOTAL: Rp ${total.toLocaleString('id-ID')}\n`;
      txt += `Metode: ${receipt.paymentMethod}\n`;
    }
    txt += "\n     Terima Kasih     \n\n\n";
    return btoa(txt);
  };

  const handlePrint = (mode: 'all' | 'food' | 'drink', autoReceiptData?: any) => {
    const dataToPrint = autoReceiptData || receiptData;
    // RawBT intent removed to allow Capacitor Printer Plugin to trigger native print dialog
    
    setPrintMode(mode);
    setTimeout(async () => {
        try {
          await Printer.printWebView({ name: 'Nota_Angkringan' });
        } catch (e) {
          alert('Gagal memanggil print: ' + e);
        }
        setPrintMode('all');
      }, 100);
  };
  const closeReceipt = () => setReceiptData(null);

  if (isLoading) return <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white items-center justify-center">Memuat data...</div>;
  return (
    <>
    <div id="main-app-container" className={`flex h-screen font-sans relative flex-col md:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200`}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          #printable-receipt, #printable-receipt * { visibility: visible !important; }
          #printable-receipt { position: absolute; left: 0; top: 0; width: 57mm; padding: 0; margin: 0; }
          @page { margin: 0; size: 57mm auto; }
        }
      `}} />

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center md:items-start md:pt-10 justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Selesaikan Pembayaran</h2>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Tipe Pesanan</label>
                  <div className="flex space-x-2">
                    {["Dine-in", "Takeaway"].map((type) => (
                      <button 
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors border ${orderType === type ? 'bg-yellow-600 border-yellow-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-400'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                {orderType === "Dine-in" && (
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Pilih Meja</label>
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                      {tableData.map(table => {
                        const tStatus = getTableStatus(table);
                        const isSelected = selectedTable === table.id.toString();
                        const bgClass = tStatus === 'open' ? 'bg-red-100 text-red-800 border-red-300' : tStatus === 'lunas' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-green-100 text-green-800 border-green-300';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => setSelectedTable(table.id.toString())}
                            className={`py-2 px-1 rounded-lg border-2 text-xs font-bold transition-all ${bgClass} ${isSelected ? 'ring-2 ring-yellow-500 ring-offset-1 scale-105 shadow-md' : 'opacity-80 hover:opacity-100'}`}
                          >
                            {table.nomor.replace(/^Meja\s*/i, '')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nama Pelanggan (Wajib)</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-yellow-500 outline-none transition-colors" 
                  />
                  <div className="mt-3">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Catatan (Opsional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-yellow-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2 mt-4">Metode Pembayaran</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Cash", "QRIS", "Transfer"].map((method) => (
                      <button 
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 rounded-lg text-sm font-semibold transition-colors border ${paymentMethod === method ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-400'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-600 dark:text-gray-400 font-medium text-lg">Total</span>
                <span className="text-3xl font-black text-yellow-600 dark:text-yellow-400">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold transition-colors">Batal</button>
                {orderType === "Dine-in" && selectedTable && (
                  <button onClick={() => processPayment(true, 'unpaid')} className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors shadow-md text-sm">
                    📥 Simpan Open Bill
                  </button>
                )}
                <button onClick={() => processPayment(false, 'paid')} className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-md text-sm">
                  💸 Bayar Lunas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black p-6 rounded-xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-y-auto pr-2">
              <div id="printable-receipt" className="font-mono text-sm leading-tight p-2 relative">
                {receiptData.isDraft && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <span className="text-6xl font-black rotate-[-45deg] tracking-widest uppercase">DRAFT</span>
                  </div>
                )}
                <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                  <h2 className="text-xl font-bold uppercase">{receiptData.isDraft ? 'PREVIEW DRAFT' : printMode === 'all' ? 'ANGKRINGAN ORANG KAYA' : printMode === 'food' ? 'DAPUR - MAKANAN' : 'BAR - MINUMAN'}</h2>
                  {printMode === 'all' && (
                    <p className="text-[10px] uppercase leading-tight mt-1">Jl. Raya Kerobokan No.5<br/>Kerobokan Kelod, Kuta Utara, Bali 80361<br/>{receiptData.date}</p>
                  )}
                  {printMode !== 'all' && <p className="text-xs">{receiptData.date}</p>}
                </div>

                <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                  <p className="text-xs mb-1">Nomor Antrean:</p>
                  <h1 className="text-4xl font-black">{receiptData.orderId === "-" ? "-" : `A-${receiptData.orderId}`}</h1>
                  <p className="text-sm mt-1 font-bold">{receiptData.customerName ? "An. " + receiptData.customerName : "Tamu"}</p>
                  <div className="flex justify-center items-center gap-2 mt-2">
                    <p className="bg-black text-white px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider">{receiptData.orderType}</p>
                    {receiptData.tableName && (
                      <p className="bg-gray-200 text-black border border-black px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider">{receiptData.tableName}</p>
                    )}
                  </div>
                  {receiptData.notes && (<div className="mt-3 text-left border border-black p-2 text-xs font-bold">Catatan: {receiptData.notes}</div>)}
                </div>

                {receiptData.isRevision && receiptData.addedItems?.length > 0 && printMode === 'all' && (
                  <div className="mb-8" style={{ pageBreakAfter: 'always' }}>
                    <div className="text-center mb-4 border-b border-black pb-2">
                      <h2 className="text-lg font-bold uppercase">--- TAMBAHAN PESANAN ---</h2>
                      <h1 className="text-3xl font-black mt-2">A-{receiptData.orderId}</h1>
                      <p className="text-sm mt-1 font-bold">{receiptData.customerName ? "An. " + receiptData.customerName : "Tamu"}</p>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {receiptData.addedItems.map((item: any, idx: number) => (
                          <tr key={'add'+idx}>
                            <td className="py-1 text-base font-bold">+ {item.qty}x {item.nama}</td>
                          </tr>
                        ))}
                        {receiptData.removedItems?.map((item: any, idx: number) => (
                          <tr key={'rem'+idx}>
                            <td className="py-1 text-base font-bold text-gray-500 line-through">- {item.qty}x {item.nama} (Batal)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mb-4">
                  <table className="w-full text-xs">
                    <tbody>
                      {(printMode === 'all' || printMode === 'food') && receiptData.items.filter((i:any) => !isDrinkCategory(i.kategori)).length > 0 && (
                        <>
                          <tr><td colSpan={printMode === 'all' ? 2 : 1} className="font-bold pt-1 pb-1 border-b border-gray-200">Makanan & Snack</td></tr>
                          {receiptData.items.filter((i:any) => !isDrinkCategory(i.kategori)).map((item: any, idx: number) => (
                            <tr key={'m'+idx}>
                              <td className="py-1 text-base font-medium">{item.qty}x {item.nama}</td>
                              {printMode === 'all' && <td className="py-1 text-right">Rp {(item.qty * item.harga).toLocaleString('id-ID')}</td>}
                            </tr>
                          ))}
                        </>
                      )}
                      {(printMode === 'all' || printMode === 'drink') && receiptData.items.filter((i:any) => isDrinkCategory(i.kategori)).length > 0 && (
                        <>
                          <tr><td colSpan={printMode === 'all' ? 2 : 1} className="font-bold pt-3 pb-1 border-b border-gray-200">Minuman</td></tr>
                          {receiptData.items.filter((i:any) => isDrinkCategory(i.kategori)).map((item: any, idx: number) => (
                            <tr key={'d'+idx}>
                              <td className="py-1 text-base font-medium">{item.qty}x {item.nama}</td>
                              {printMode === 'all' && <td className="py-1 text-right">Rp {(item.qty * item.harga).toLocaleString('id-ID')}</td>}
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {printMode === 'all' && (
                  <div className="border-t border-dashed border-gray-400 pt-2 mb-4 text-xs">
                    <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>Rp {receiptData.total.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between mt-1"><span>Metode</span><span>{receiptData.paymentMethod}</span></div>
                  </div>
                )}

                <div className="text-center text-[10px] mt-6 italic">
                  {receiptData.isDraft ? (
                    <p>MOHON BAYAR DI KASIR SEBELUM PULANG</p>
                  ) : printMode === 'all' ? (
                    <><p>Terima Kasih</p><p>Silakan tunggu pesanan Anda</p></>
                  ) : (
                    <p>--- BATAS PESANAN ---</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col space-y-2 border-t pt-4">
              {receiptData.isDraft && (
                <button onClick={() => { closeReceipt(); processPayment(false, 'paid'); }} className="w-full py-3 mb-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg flex justify-center items-center space-x-2">
                  <span>Bayar Lunas Sekarang</span>
                </button>
              )}
              <button onClick={() => handlePrint('all')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center space-x-2">
                <span>Cetak Semua</span>
              </button>
              <div className="flex space-x-2">
                {receiptData.items.some((i:any) => !isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('food')} className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm">Cetak Makanan</button>
                )}
                {receiptData.items.some((i:any) => isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('drink')} className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm">Cetak Minuman</button>
                )}
              </div>
              <button onClick={closeReceipt} className="w-full py-2 mt-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Modal */}
      {activeVariantGroup && (
        <div className="fixed inset-0 bg-black/60 flex items-start pt-10 justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">Pilih Varian {activeVariantGroup.title}</h2>
            <div className="space-y-3">
              {activeVariantGroup.variants.map((v: MenuItem) => (
                <button
                  key={v.id}
                  onClick={() => { addToCart(v); setActiveVariantGroup(null); }}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 flex justify-between px-6 ${v.isSoldOut ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-2 border-yellow-300 shadow-sm'}`}
                  disabled={v.isSoldOut}
                >
                  <span>{v.nama}</span>
                  <span>Rp {v.harga.toLocaleString('id-ID')}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setActiveVariantGroup(null)} className="w-full mt-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold hover:bg-gray-300 dark:hover:bg-gray-600">Batal</button>
          </div>
        </div>
      )}      <div className="flex-1 flex flex-col md:flex-row w-full print:hidden">
        
        {/* Left Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-[55vh] md:h-auto overflow-hidden transition-colors">
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors">
                                                <div className="flex items-center space-x-3">
              <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm object-cover" />
              <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white leading-tight">Angkringan <span className="text-yellow-600 dark:text-yellow-500">Orang Kaya</span></h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                <button onClick={() => setView('meja')} className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-colors ${view === 'meja' ? 'bg-white dark:bg-gray-800 shadow-sm text-yellow-600 dark:text-yellow-500' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>🍽️ Meja</button>
                <button onClick={() => setView('menu')} className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-colors ${view === 'menu' ? 'bg-white dark:bg-gray-800 shadow-sm text-yellow-600 dark:text-yellow-500' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>☕ Menu</button>
              </div>
              <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
                {isDark ? '☀️' : '🌙'}
              </button>
              <Link href="/admin" className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Halaman Admin">
                ⚙️
              </Link>
            </div>
          </div>

          {view === 'meja' && (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tableData.map(table => {
                  const tStatus = getTableStatus(table);
                  const order = activeOrders.find(o => o.tableId === table.id);
                  const lastPaid = tStatus === 'lunas' ? allOrders.find(o => o.tableId === table.id && o.status === 'paid') : null;
                  const name = order?.customerName || lastPaid?.customerName;
                  const isSelected = selectedTable === table.id.toString();
                  const style = tStatus === 'open' ? { card: 'border-red-400 bg-white dark:bg-gray-800', badge: 'bg-red-600', label: 'Open Bill', labelCls: 'bg-red-100 text-red-700' } : tStatus === 'lunas' ? { card: 'border-blue-400 bg-white dark:bg-gray-800', badge: 'bg-blue-600', label: 'Lunas', labelCls: 'bg-blue-100 text-blue-700' } : { card: 'border-green-300 bg-white dark:bg-gray-800', badge: 'bg-green-600', label: 'Kosong', labelCls: 'bg-green-100 text-green-700' };
                  return (
                    <button key={table.id} onClick={() => handleTableClick(table)} className={`relative rounded-2xl border-2 ${style.card} p-4 h-36 flex flex-col items-center justify-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${isSelected ? 'ring-4 ring-yellow-500/70' : ''}`}>
                      <span className={`w-14 h-14 rounded-full ${style.badge} text-white font-black text-lg flex items-center justify-center shadow-md`}>{table.nomor.replace(/^Meja\s*/i, '')}</span>
                      <span className={`mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${style.labelCls}`}>{style.label}</span>
                      {name && <span className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate max-w-full">{name}</span>}
                      {order && <span className="absolute top-2 right-2 text-[11px] font-bold text-red-600 dark:text-red-400">Rp {order.total.toLocaleString('id-ID')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'menu' && (
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="flex flex-col space-y-4 mb-4 md:mb-6">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full whitespace-nowrap border ${activeCategory === cat ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'}`}>{cat}</button>
                  ))}
                </div>
                <input type="text" placeholder="Cari menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white focus:border-yellow-500 outline-none transition-colors shadow-sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {filteredMenu.map(item => (
                  <button key={item.id} onClick={() => item.isGroup ? setActiveVariantGroup({ title: item.nama, variants: item.variants }) : addToCart(item)} className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 text-left transition-all hover:shadow-lg flex flex-col justify-between h-28 md:h-32 transform hover:-translate-y-1 relative">
                    {item.isGroup && <span className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Varian</span>}
                    <div>
                      <h3 className="font-medium line-clamp-2 leading-tight text-sm md:text-base text-gray-800 dark:text-white">{item.nama}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">{item.kategori}</span>
                    </div>
                    <p className="text-yellow-600 dark:text-yellow-400 font-bold text-sm md:text-base">Rp {item.harga.toLocaleString('id-ID')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Cart) */}
        <div className="w-full md:w-96 bg-white dark:bg-gray-800 flex flex-col border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 shadow-2xl h-[45vh] md:h-auto z-10 transition-colors">
          <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">{editingOrderId ? 'Edit Open Bill' : 'Keranjang Pesanan'}</h2>
              {selectedTable && <button onClick={() => { resetCart(); setSelectedTable(""); }} className="text-xs text-gray-500 hover:text-red-500 underline">Lepas meja</button>}
            </div>
            {selectedTableObj && (
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <div className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${selectedTableStatus === 'open' ? 'bg-red-100 text-red-700' : selectedTableStatus === 'lunas' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  🍽️ {selectedTableObj.nomor}
                  <span className="font-normal">• {selectedTableStatus === 'open' ? 'Open Bill' : selectedTableStatus === 'lunas' ? 'Lunas (nota baru)' : 'Kosong'}</span>
                </div>
                {customerName && (
                  <div className="inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    👤 A/n: {customerName}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 && selectedTableStatus === 'lunas' && (
              <div className="text-center mt-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl mb-3">✅</div>
                <p className="font-bold text-gray-800 dark:text-white">Tagihan meja ini sudah LUNAS</p>
<div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mt-4 mb-5 text-sm text-yellow-800 dark:text-yellow-200 text-left w-full shadow-inner">
  <p className="font-bold mb-1">Cara Tambah Pesanan:</p>
  <p>Langsung klik/pilih menu di sebelah kiri. Pesanan akan otomatis masuk sebagai <b>Nota Baru</b> untuk meja ini.</p>
</div>
<button onClick={handleClearTable} className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform">🧹 Kosongkan Meja (Selesai)</button>
                
              </div>
            )}
            {cart.length === 0 && selectedTableStatus !== 'lunas' && (
              <div className="text-center text-gray-400 dark:text-gray-500 mt-10 flex flex-col items-center">
                <p>Belum ada pesanan.</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="flex-1 pr-2">
                  <h4 className="font-medium text-gray-800 dark:text-white text-sm md:text-base">{item.nama}</h4>
                  <p className="text-yellow-600 dark:text-yellow-500 text-sm font-semibold mt-1">Rp {item.harga.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-1 transition-colors">
                  <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center font-bold transition-colors">-</button>
                  <span className="w-4 text-center font-bold text-gray-800 dark:text-white">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white flex items-center justify-center font-bold shadow-sm">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 md:p-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Total Harga</span>
              <span className="text-2xl md:text-3xl font-black text-yellow-600 dark:text-yellow-400">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsPaymentModalOpen(true)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-3 md:py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-transform active:scale-95" disabled={cart.length === 0}>Bayar Pesanan</button>
              {editingOrderId && (
                <button onClick={handleShowDraftBill} className="px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 md:py-4 rounded-xl font-bold text-sm shadow-md transition-transform active:scale-95 whitespace-nowrap" title="Cetak Bill Sementara">🧾 Cetak Draft</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}