"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Printer } from '@capgo/capacitor-printer';
import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';


type MenuItem = { id: number; nama: string; harga: number; kategori: string; isSoldOut: boolean; };

export default function AdminPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [nama, setNama] = useState("");
  const [harga, setHarga] = useState("");
  const [kategori, setKategori] = useState("Nasi");
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [customKategori, setCustomKategori] = useState("");
  
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterPayment, setFilterPayment] = useState("Semua");

  const [receiptData, setReceiptData] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'all' | 'food' | 'drink'>('all');

  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderItems, setReorderItems] = useState<MenuItem[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

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
          
          await BluetoothSerial.write({ address: mac, value: textToPrint });
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

  const isDrinkCategory = (cat: string) => {
    if(!cat) return false;
    const c = cat.toLowerCase();
    return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') || c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
  };

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const loginExpiry = localStorage.getItem("adminLoginExpiry");
    if (loginExpiry && Date.now() < parseInt(loginExpiry)) {
      setIsAuthenticated(true);
    }
  }, []);

    const [btDevices, setBtDevices] = useState<any[]>([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  
  useEffect(() => {
    const savedMac = localStorage.getItem('bt_printer_mac');
    if(savedMac) setSelectedMac(savedMac);
  }, []);
  
  const scanBluetooth = async () => {
    setIsScanning(true);
    try {
      const isEnabled = await BluetoothSerial.isEnabled();
      if (!isEnabled.enabled) {
        alert("Bluetooth belum aktif. Nyalakan bluetooth HP Anda.");
        await BluetoothSerial.enable();
      }
      const devices = await BluetoothSerial.list();
      setBtDevices(devices.devices || []);
    } catch(e) {
      alert("Gagal mencari bluetooth: " + JSON.stringify(e));
    }
    setIsScanning(false);
  };
  
  const savePrinter = (mac: string) => {
    localStorage.setItem('bt_printer_mac', mac);
    setSelectedMac(mac);
    alert("Printer berhasil disimpan!");
  };

  const [tables, setTables] = useState<any[]>([]);
  const [newTableName, setNewTableName] = useState("");

  const loadData = async () => {
    const { getMenus, getOrders, getTables } = await import('@/lib/api');
    const [menusRes, ordersRes, tablesRes] = await Promise.all([
      getMenus(),
      getOrders(),
      getTables()
    ]);
    setMenus(menusRes as any[]);
    setOrders(ordersRes);
    setTables(tablesRes);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "123") {
      setIsAuthenticated(true);
      // Simpan masa aktif 1 jam (3600000 ms)
      localStorage.setItem("adminLoginExpiry", (Date.now() + 3600000).toString());
    } else {
      alert("Password salah!");
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !harga) return;

    const finalKategori = isCustomKategori ? customKategori : kategori;
    if (!finalKategori) return;

    const { createMenu } = await import('@/lib/api');
    await createMenu({ nama, harga: parseInt(harga), kategori: finalKategori });
    
    setNama("");
    setHarga("");
    setCustomKategori("");
    setIsCustomKategori(false);
    loadData();
  };

  const handleDeleteMenu = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus menu ini?")) return;
    const { deleteMenus } = await import('@/lib/api');
    await deleteMenus([id]);
    setSelectedMenus(prev => prev.filter(menuId => menuId !== id));
    loadData();
  };

  // --- State untuk Tabel Menu ---
  const [selectedMenus, setSelectedMenus] = useState<number[]>([]);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [menuCurrentPage, setMenuCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredMenus = menus.filter(m => 
    m.nama.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
    m.kategori.toLowerCase().includes(menuSearchQuery.toLowerCase())
  );
  
  const totalMenuPages = Math.ceil(filteredMenus.length / itemsPerPage);
  const currentMenuData = filteredMenus.slice((menuCurrentPage - 1) * itemsPerPage, menuCurrentPage * itemsPerPage);

  const handleBulkDeleteMenu = async () => {
    if (selectedMenus.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedMenus.length} menu terpilih?`)) return;
    
    const { deleteMenus } = await import('@/lib/api');
    await deleteMenus(selectedMenus);
    setSelectedMenus([]);
    loadData();
  };

  const exportMenuToCSV = () => {
    let csvContent = "ID,Nama Menu,Kategori,Harga (Rp)\n";
    menus.forEach(menu => {
      csvContent += `"${menu.id}","${menu.nama}","${menu.kategori}","${menu.harga}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Daftar_Menu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteOrder = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus riwayat transaksi ini? Data yang dihapus tidak bisa dikembalikan.")) return;
    const { deleteOrders } = await import('@/lib/api');
    await deleteOrders([id]);
    setSelectedOrders(prev => prev.filter(orderId => orderId !== id));
    loadData();
  };

  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  
  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedOrders.length} riwayat transaksi terpilih? Data tidak bisa dikembalikan.`)) return;
    
    const { deleteOrders } = await import('@/lib/api');
    await deleteOrders(selectedOrders);
    setSelectedOrders([]);
    loadData();
  };

  const filteredOrders = orders.filter(order => {
    let isValid = true;
    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      const match = (order.id && String(order.id).includes(q)) || 
                    (order.customerName && order.customerName.toLowerCase().includes(q)) || 
                    (order.notes && order.notes.toLowerCase().includes(q));
      if (!match) isValid = false;
    }
    
    // Filter by Date Range (YYYY-MM-DD)
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
    if (filterStartDate && orderDate < filterStartDate) isValid = false;
    if (filterEndDate && orderDate > filterEndDate) isValid = false;

    // Filter by Payment Method
    if (filterPayment !== "Semua" && order.paymentMethod !== filterPayment) isValid = false;

    return isValid;
  });

  const totalOrderPages = Math.ceil(filteredOrders.length / 20);
  const currentOrderData = filteredOrders.slice((orderCurrentPage - 1) * 20, orderCurrentPage * 20);

  const exportToCSV = () => {
    let csvContent = "No. Nota,Waktu,Tipe Order,Meja,Nama Pelanggan,Catatan,Metode Pembayaran,Total (Rp)\n";
    
    filteredOrders.forEach(order => {
      const nota = `A-${order.id}`;
      const date = new Date(order.createdAt).toLocaleString('id-ID');
      const type = order.orderType || "Dine-in";
      const meja = order.tableId ? (tables.find(t => t.id === order.tableId)?.nomor || "-") : "-";
      const name = order.customerName || "";
      const notes = order.notes || "";
      const method = order.paymentMethod || "";
      const total = order.total;
      
      csvContent += `"${nota}","${date}","${type}","${meja}","${name}","${notes}","${method}","${total}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_Penjualan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openReorderModal = () => {
    setReorderItems([...menus]);
    setIsReorderModalOpen(true);
  };

  const handleSaveReorder = async () => {
    const itemsToUpdate = reorderItems.map((item, index) => ({
      id: item.id,
      urutan: index
    }));

    const { reorderMenus } = await import('@/lib/api');
    await reorderMenus(itemsToUpdate);

    setIsReorderModalOpen(false);
    loadData();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const items = [...reorderItems];
    const draggedItem = items[draggedItemIndex];
    items.splice(draggedItemIndex, 1);
    items.splice(dropIndex, 0, draggedItem);
    
    setReorderItems(items);
    setDraggedItemIndex(null);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const items = [...reorderItems];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    setReorderItems(items);
  };

  const moveItemDown = (index: number) => {
    if (index === reorderItems.length - 1) return;
    const items = [...reorderItems];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    setReorderItems(items);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-black"
                placeholder="Masukkan password..."
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
              Masuk
            </button>
            <div className="text-center mt-4">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Kembali ke Kasir</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
    <div id="main-app-container" className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="print:hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Backoffice</h1>
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem("adminLoginExpiry");
              }}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 font-medium"
            >
              Logout
            </button>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              Kembali ke Kasir
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form Tambah Menu */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Tambah Menu Baru</h2>
            <form onSubmit={handleAddMenu} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nama Menu</label>
                <input 
                  type="text" 
                  value={nama} onChange={(e) => setNama(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Harga (Rp)</label>
                <input 
                  type="number" 
                  value={harga} onChange={(e) => setHarga(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kategori</label>
                {!isCustomKategori ? (
                  <select 
                    value={kategori} 
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW") {
                        setIsCustomKategori(true);
                      } else {
                        setKategori(e.target.value);
                      }
                    }}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-black"
                  >
                    <option value="Nasi">Nasi</option>
                    <option value="Sate">Sate</option>
                    <option value="Gorengan">Gorengan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Camilan">Camilan</option>
                    {Array.from(new Set(menus.map(m => m.kategori)))
                      .filter(c => !["Nasi", "Sate", "Gorengan", "Minuman", "Camilan"].includes(c as string))
                      .map(cat => (
                        <option key={cat as string} value={cat as string}>{cat as string}</option>
                    ))}
                    <option value="ADD_NEW" className="font-bold text-blue-600">+ Tambah Kategori Baru...</option>
                  </select>
                ) : (
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={customKategori} 
                      onChange={(e) => setCustomKategori(e.target.value)}
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-black"
                      placeholder="Ketik nama kategori baru..."
                      autoFocus
                      required
                    />
                    <button type="button" onClick={() => setIsCustomKategori(false)} className="px-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm font-semibold">Batal</button>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <p><strong>Tips Kasir:</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Kategori seperti <strong>Coffee, Soft Drink, Tea</strong> otomatis masuk struk Bar.</li>
                    <li>Tambahkan <strong>(Varian)</strong> di akhir nama untuk menggabungkannya di Kasir. (Contoh: <code>Nasi Goreng (Pedas)</code> dan <code>Nasi Goreng (Biasa)</code> akan jadi 1 tombol!).</li>
                  </ul>
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
                Simpan Menu
              </button>
            </form>
          </div>

          {/* Daftar Menu */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-3 md:space-y-0">
              <h2 className="text-xl font-semibold text-gray-700">Daftar Menu Tersedia</h2>
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
                <input 
                  type="text"
                  placeholder="Cari menu atau kategori..."
                  value={menuSearchQuery}
                  onChange={(e) => {
                    setMenuSearchQuery(e.target.value);
                    setMenuCurrentPage(1); // Reset to page 1 on search
                  }}
                  className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-1.5 text-sm focus:border-yellow-500 outline-none w-full md:w-64"
                />
                <div className="flex space-x-2">
                  <button 
                    onClick={openReorderModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Urutkan
                  </button>
                  {selectedMenus.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteMenu}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Hapus ({selectedMenus.length})
                    </button>
                  )}
                  <button 
                    onClick={exportMenuToCSV}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    CSV
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 w-8">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={currentMenuData.length > 0 && selectedMenus.length === filteredMenus.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMenus(filteredMenus.map(m => m.id));
                          else setSelectedMenus([]);
                        }}
                      />
                    </th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">ID</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">Nama</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">Kategori</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">Harga</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMenuData.map((menu) => (
                    <tr key={menu.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedMenus.includes(menu.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedMenus(prev => [...prev, menu.id]);
                            else setSelectedMenus(prev => prev.filter(id => id !== menu.id));
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 text-gray-500">{menu.id}</td>
                      <td className="py-3 px-4 text-gray-800 font-medium">{menu.nama}</td>
                      <td className="py-3 px-4 text-gray-500">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {menu.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">Rp {menu.harga.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteMenu(menu.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {currentMenuData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">Belum ada menu yang ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalMenuPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Menampilkan {((menuCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(menuCurrentPage * itemsPerPage, filteredMenus.length)} dari {filteredMenus.length} menu
                </span>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => setMenuCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={menuCurrentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                  >
                    Sebelumnya
                  </button>
                  <button 
                    onClick={() => setMenuCurrentPage(prev => Math.min(totalMenuPages, prev + 1))}
                    disabled={menuCurrentPage === totalMenuPages}
                    className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kelola Meja */}
          <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-700">Kelola Meja ({tables.length})</h2>
                <p className="text-xs text-gray-500">Meja hanya bisa dihapus jika statusnya Kosong (hijau).</p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const { addTable } = await import('@/lib/api');
                    await addTable(newTableName);
                    setNewTableName("");
                    loadData();
                  } catch (err: any) { alert(err.message); }
                }}
                className="flex gap-2"
              >
                <input
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  placeholder="Nama meja..."
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 w-56"
                />
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Tambah Meja</button>
              </form>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {tables.map((t: any) => {
                const hasUnpaid = orders.some((o: any) => o.tableId === t.id && o.status === 'unpaid');
                const st = hasUnpaid ? 'open' : t.status === 'lunas' ? 'lunas' : 'kosong';
                const color = st === 'open' ? 'border-red-400 bg-red-50' : st === 'lunas' ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50';
                const label = st === 'open' ? 'Open Bill' : st === 'lunas' ? 'Lunas' : 'Kosong';
                return (
                  <div key={t.id} className={`rounded-xl border-2 ${color} p-3 flex flex-col items-center`}>
                    <span className="font-bold text-gray-800 text-center">{t.nomor}</span>
                    <span className="text-xs text-gray-600 mb-2">{label}</span>
                    <div className="flex gap-1 flex-wrap justify-center">
                      <button
                        onClick={async () => {
                          const name = window.prompt('Nama meja baru:', t.nomor);
                          if (!name) return;
                          try { const { renameTable } = await import('@/lib/api'); await renameTable(t.id, name); loadData(); }
                          catch (err: any) { alert(err.message); }
                        }}
                        className="text-xs px-2 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                      >Ubah</button>
                      {st === 'lunas' && (
                        <button
                          onClick={async () => {
                            try { const { clearTable } = await import('@/lib/api'); await clearTable(t.id); loadData(); }
                            catch (err: any) { alert(err.message); }
                          }}
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                        >Kosongkan</button>
                      )}
                      {st === 'kosong' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Hapus ${t.nomor}?`)) return;
                            try { const { deleteTable } = await import('@/lib/api'); await deleteTable(t.id); loadData(); }
                            catch (err: any) { alert(err.message); }
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                        >Hapus</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Riwayat Transaksi */}
          <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Riwayat Transaksi (Penjualan)</h2>
              <button 
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>Unduh Laporan (CSV)</span>
              </button>
            </div>
            
            {/* Filter controls */}
            <div className="flex flex-wrap gap-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="border rounded p-1 text-sm text-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="border rounded p-1 text-sm text-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metode Bayar</label>
                <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="border rounded p-1 text-sm text-gray-800">
                  <option value="Semua">Semua Metode</option>
                  <option value="Cash">Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Custom">Lainnya (Custom)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 mt-6 gap-4">
    <div className="flex items-center gap-4 w-full md:w-auto">
      <h3 className="text-lg font-medium text-gray-700 whitespace-nowrap">Daftar Nota</h3>
      <input 
        type="text" 
        placeholder="Cari No Nota, Nama..." 
        value={orderSearchQuery}
        onChange={(e) => { setOrderSearchQuery(e.target.value); setOrderCurrentPage(1); }}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-full md:w-64 focus:border-green-500 outline-none text-gray-900 bg-white"
      />
    </div>
              <h3 className="text-lg font-medium text-gray-700">Daftar Nota</h3>
              {selectedOrders.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Hapus Terpilih ({selectedOrders.length})
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 w-8">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedOrders(filteredOrders.map(o => o.id));
                          else setSelectedOrders([]);
                        }}
                      />
                    </th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm w-12">No.</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">No. Nota & Waktu</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">Tipe Order</th>
<th className="py-3 px-4 text-gray-600 font-medium text-sm">Meja</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">Pelanggan</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm">Total</th>
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrderData.map((order: any, index: number) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedOrders.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOrders(prev => [...prev, order.id]);
                            else setSelectedOrders(prev => prev.filter(id => id !== order.id));
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-medium text-sm">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        <span className="font-bold text-gray-800 block">A-{order.id}</span>
                        {new Date(order.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium">
  <span className={`px-2 py-1 rounded text-xs ${order.orderType === 'Takeaway' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
    {order.orderType || 'Dine-in'}
  </span>
</td>
<td className="py-3 px-4 text-gray-600 text-sm font-medium">
  {order.orderType === 'Dine-in' && order.tableId ? (tables.find(t => t.id === order.tableId)?.nomor || '-') : '-'}
</td>
                      <td className="py-3 px-4 text-gray-500">
                        {order.customerName || '-'}
                      </td>
                      <td className="py-3 px-4 text-yellow-600 font-bold">
                        Rp {order.total.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => setReceiptData({
                            orderId: order.id,
                            date: new Date(order.createdAt).toLocaleString('id-ID'),
                            customerName: order.customerName,
                            orderType: order.orderType || "Dine-in",
                            paymentMethod: order.paymentMethod,
                            notes: order.notes,
                            total: order.total,
                            items: order.items.map((i:any) => ({
                              nama: i.menuItem?.nama || "Menu Dihapus",
                              qty: i.quantity || i.qty,
                              harga: i.hargaSatuan,
                              kategori: i.menuItem?.kategori || "Lainnya"
                            }))
                          })}
                          className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-semibold"
                        >
                          Nota
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded text-xs font-semibold"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">Belum ada riwayat transaksi.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Modal Resi / Nota (Untuk Cetak Ulang) */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * { visibility: hidden !important; }
              
              /* Show only the receipt and its children */
              #printable-receipt, #printable-receipt * { 
                visibility: visible !important; 
              }
              
              /* Force the receipt to the absolute top left of the printed page */
              #printable-receipt { 
                position: absolute !important; 
                left: 0 !important; 
                top: 0 !important; 
                width: 100% !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                color: black !important; 
                background: white !important; 
              }
              
              @page { margin: 0; }
            }
          `}} />
          <div className="bg-white text-black p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
            <div id="printable-receipt" className="font-mono text-sm leading-tight p-2">
              <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                <h2 className="text-xl font-bold uppercase">
                  {printMode === 'all' ? 'Angkringan Orang Kaya' : printMode === 'food' ? 'DAPUR - MAKANAN' : 'BAR - MINUMAN'}
                </h2>
                <p className="text-[10px] uppercase leading-tight mt-1">Jl. Raya Kerobokan No.5<br/>Kerobokan Kelod, Kuta Utara, Bali 80361</p>
                <p className="text-xs mt-1">Cetak Ulang - {receiptData.date}</p>
              </div>

              <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                <p className="text-xs mb-1">Nomor Antrean:</p>
                <h1 className="text-4xl font-black">A-{receiptData.orderId}</h1>
                <p className="text-sm mt-1 font-bold">{receiptData.customerName ? "An. " + receiptData.customerName : "Tamu"}</p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <p className="bg-black text-white px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider">{receiptData.orderType}</p>
                  {receiptData.tableName && (
                    <p className="bg-gray-200 text-black border border-black px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider">{receiptData.tableName}</p>
                  )}
                </div>
                {receiptData.notes && (<div className="mt-3 text-left border border-black p-2 text-xs font-bold">Catatan: {receiptData.notes}</div>)}
              </div>

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
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL</span>
                    <span>Rp {receiptData.total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Metode</span>
                    <span>{receiptData.paymentMethod}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col space-y-2">
              <button onClick={() => handlePrint('all')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Cetak Semua
              </button>
              
              <div className="flex space-x-2">
                {receiptData.items.some((i:any) => !isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('food')} className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm">
                    Cetak Makanan
                  </button>
                )}
                {receiptData.items.some((i:any) => isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('drink')} className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm">
                    Cetak Minuman
                  </button>
                )}
              </div>

              <button onClick={() => setReceiptData(null)} className="w-full py-2 mt-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atur Urutan */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[80vh]">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Atur Urutan Menu</h2>
            <p className="text-sm text-gray-500 mb-4">Gunakan panah Naik/Turun (atau geser) untuk mengatur posisi menu di Kasir.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {reorderItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex items-center justify-between cursor-move hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{item.nama}</p>
                      <p className="text-xs text-gray-500">{item.kategori}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-400 mr-2">#{index + 1}</span>
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => moveItemUp(index)} 
                        disabled={index === 0}
                        className="p-1 bg-white rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button 
                        onClick={() => moveItemDown(index)} 
                        disabled={index === reorderItems.length - 1}
                        className="p-1 bg-white rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
              <button 
                onClick={() => setIsReorderModalOpen(false)} 
                className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveReorder} 
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
              >
                Simpan Urutan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

