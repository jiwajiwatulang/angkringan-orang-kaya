"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Printer } from '@capgo/capacitor-printer';
import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';
import { App } from '@capacitor/app';
import { getStoreSettings, saveStoreSettingsAsync, loadStoreSettingsAsync, subscribeStoreSettings, StoreSettings } from '@/lib/settings';
import { generateEscPosReceipt, generateZReportReceipt } from '@/lib/receipt';
import { exportAllData, importAllData, resetAllTransactions, voidOrder, processVoidRefund, getAuditLogs, getAllShifts, updateMenu, toggleMenuSoldOut, renameTable, deleteTable, addTable } from '@/lib/api';


type MenuItem = { id: number; nama: string; harga: number; kategori: string; isSoldOut: boolean; };

export default function AdminPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
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
          const textToPrint = generateEscPosReceipt(receiptData, mode, storeSettings);
          
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
      const paired = await BluetoothSerial.getPairedDevices();
      let list: any[] = paired.devices || [];
      if (list.length === 0) {
        const scanned = await BluetoothSerial.scan();
        list = (scanned.devices || []).map((d: any) => ({ name: d.name, address: d.address }));
      }
      setBtDevices(list);
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

  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(getStoreSettings());
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [isDirtySettings, setIsDirtySettings] = useState(false);

  // Edit Menu State
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [isUpdatingMenu, setIsUpdatingMenu] = useState(false);
  const [editMenuNama, setEditMenuNama] = useState("");
  const [editMenuHarga, setEditMenuHarga] = useState("");
  const [editMenuKategori, setEditMenuKategori] = useState("");

  // Table Management State
  const [tableToEdit, setTableToEdit] = useState<{ id: number; nomor: string } | null>(null);
  const [tableEditName, setTableEditName] = useState("");
  const [tableToDelete, setTableToDelete] = useState<{ id: number; nomor: string } | null>(null);

  // PIN Lock & Void State
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Void & Refund States
  const [voidTargetOrder, setVoidTargetOrder] = useState<any>(null);
  const [voidReason, setVoidReason] = useState("Salah input pesanan");
  const [customVoidReason, setCustomVoidReason] = useState("");
  const [isRefundCheckbox, setIsRefundCheckbox] = useState(true);
  const [refundMethod, setRefundMethod] = useState("Tunai");
  const [refundAmount, setRefundAmount] = useState(0);
  const [voidPinConfirm, setVoidPinConfirm] = useState("");
  const [voidPinError, setVoidPinError] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Load persistent store settings from IndexedDB and subscribe to live changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    async function initSettings() {
      try {
        const loaded = await loadStoreSettingsAsync();
        setStoreSettings(loaded);
        if (loaded.enablePin && sessionStorage.getItem('admin_unlocked') !== 'true') {
          setIsUnlocked(false);
        }
      } catch (err) {
        console.error("Error loading store settings in Admin:", err);
      }
    }
    initSettings();

    unsubscribe = subscribeStoreSettings((updated) => {
      setStoreSettings(updated);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Android Hardware Back button listener: close modals before exiting
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (editingMenu) {
          setEditingMenu(null);
        } else if (tableToEdit) {
          setTableToEdit(null);
        } else if (tableToDelete) {
          setTableToDelete(null);
        } else if (voidTargetOrder) {
          setVoidTargetOrder(null);
        } else if (isReorderModalOpen) {
          setIsReorderModalOpen(false);
        } else if (receiptData) {
          setReceiptData(null);
        } else if (canGoBack) {
          window.history.back();
        }
      }).then(handle => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [editingMenu, tableToEdit, tableToDelete, voidTargetOrder, isReorderModalOpen, receiptData]);

  
  const handlePrintZReport = async (shift: any) => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const mac = localStorage.getItem('bt_printer_mac');
    const txt = generateZReportReceipt(shift, storeSettings);
    
    try {
      if (isAndroid && mac) {
        try { await BluetoothSerial.connect({ address: mac }); } catch(e) {}
        await BluetoothSerial.write({ address: mac, value: txt });
        alert("Struk Z-Report berhasil dicetak!");
      } else {
        await Printer.printWebView({ name: 'Z_Report_Shift' });
      }
    } catch(err: any) {
      alert("Gagal mencetak struk Z-Report: " + err.message);
    }
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    const correctPin = storeSettings.adminPin || '1234';
    if (pinInput === correctPin) {
      setIsUnlocked(true);
      sessionStorage.setItem('admin_unlocked', 'true');
      setPinError("");
      setPinInput("");
      setPinAttempts(0);
    } else {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockoutTimer(30);
        setPinError("Terlalu banyak percobaan salah! Akses terkunci selama 30 detik.");
        setPinAttempts(0);
      } else {
        setPinError("PIN salah! Sisa percobaan: " + (5 - newAttempts) + " kali.");
      }
    }
  };

  const openVoidModal = (order: any) => {
    setVoidTargetOrder(order);
    setIsRefundCheckbox(order.status === 'paid');
    setRefundAmount(order.total);
    setRefundMethod(order.paymentMethod === 'Cash' ? 'Tunai' : (order.paymentMethod || 'Tunai'));
    setVoidReason("Salah input pesanan");
    setCustomVoidReason("");
    setVoidPinConfirm("");
    setVoidPinError("");
  };

  const handleProcessVoid = async () => {
    if (!voidTargetOrder) return;
    
    // Validasi PIN jika proteksi PIN aktif
    if (storeSettings.enablePin) {
      const correctPin = storeSettings.adminPin || '1234';
      if (voidPinConfirm !== correctPin) {
        setVoidPinError("PIN Otorisasi Admin salah!");
        return;
      }
    }

    const finalReason = voidReason === 'Lainnya' ? (customVoidReason || 'Dibatalkan') : voidReason;
    try {
      setIsVoiding(true);
      await processVoidRefund(voidTargetOrder.id, {
        reason: finalReason,
        isRefunded: isRefundCheckbox && voidTargetOrder.status === 'paid',
        refundAmount: Number(refundAmount) || voidTargetOrder.total,
        refundMethod: isRefundCheckbox ? refundMethod : 'None',
        operator: 'Admin / Kasir'
      });
      setVoidTargetOrder(null);
      await loadData();
      alert("Nota A-" + voidTargetOrder.id + " berhasil diproses (Status: VOID" + (isRefundCheckbox ? " + REFUND" : "") + ").");
    } catch (err: any) {
      alert("Gagal memproses pembatalan: " + err.message);
    } finally {
      setIsVoiding(false);
    }
  };


  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await saveStoreSettingsAsync(storeSettings);
      setIsDirtySettings(false);
      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 3500);
    } catch (err: any) {
      alert("Gagal menyimpan profil usaha: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu);
    setEditMenuNama(menu.nama);
    setEditMenuHarga(menu.harga.toString());
    setEditMenuKategori(menu.kategori);
  };

  const handleSaveEditMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu) return;
    if (!editMenuNama.trim()) {
      alert("Nama menu tidak boleh kosong");
      return;
    }
    const h = Number(editMenuHarga);
    if (isNaN(h) || h < 0) {
      alert("Harga menu tidak valid");
      return;
    }
    setIsUpdatingMenu(true);
    try {
      await updateMenu(editingMenu.id, {
        nama: editMenuNama.trim(),
        harga: h,
        kategori: editMenuKategori.trim()
      });
      setEditingMenu(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah menu: " + err.message);
    } finally {
      setIsUpdatingMenu(false);
    }
  };

  const handleToggleSoldOut = async (menu: MenuItem) => {
    try {
      await toggleMenuSoldOut(menu.id, !menu.isSoldOut);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah status stok: " + err.message);
    }
  };

  const handleOpenRenameTable = (t: { id: number; nomor: string }) => {
    setTableToEdit(t);
    setTableEditName(t.nomor);
  };

  const handleSaveTableRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tableToEdit || !tableEditName.trim()) return;
    try {
      await renameTable(tableToEdit.id, tableEditName.trim());
      setTableToEdit(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah nama meja: " + err.message);
    }
  };

  const handleConfirmTableDelete = async () => {
    if (!tableToDelete) return;
    try {
      await deleteTable(tableToDelete.id);
      setTableToDelete(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus meja: " + err.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = "Backup_POS_" + (storeSettings.storeName || 'Toko').replace(/\s+/g, '_') + "_" + date + ".json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Gagal membuat cadangan: " + err.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Peringatan: Memulihkan cadangan akan menimpa menu dan riwayat penjualan yang ada saat ini. Lanjutkan?")) {
      e.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importAllData(json);
      setStoreSettings(getStoreSettings());
      await loadData();
      alert("Data berhasil dipulihkan!");
    } catch (err: any) {
      alert("Gagal memulihkan cadangan: " + err.message);
    }
    e.target.value = "";
  };

  const handleResetTransactions = async () => {
    const confirm1 = window.confirm("Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat transaksi penjualan (nota)?\n\nMenu makanan dan meja TIDAK AKAN terhapus.");
    if (!confirm1) return;
    const confirm2 = window.prompt("Ketik kata 'RESET' untuk mengonfirmasi pembersihan transaksi:");
    if (confirm2 !== 'RESET') {
      alert("Penghapusan dibatalkan.");
      return;
    }
    try {
      setIsResetting(true);
      await resetAllTransactions();
      await loadData();
      alert("Semua riwayat transaksi berhasil dibersihkan! Toko siap mulai dari awal.");
    } catch (err: any) {
      alert("Gagal mereset transaksi: " + err.message);
    } finally {
      setIsResetting(false);
    }
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
    try { const logs = await getAuditLogs(); setAuditLogs(logs); } catch(e) {}
    try { const s = await getAllShifts(); setShifts(s); } catch(e) {}
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
                    <th className="py-3 px-4 text-gray-600 font-medium text-sm text-center">Status Stok</th>
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
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">{menu.id}</td>
                      <td className="py-3 px-4 text-gray-800 font-medium">{menu.nama}</td>
                      <td className="py-3 px-4 text-gray-500">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {menu.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-bold">Rp {menu.harga.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSoldOut(menu)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            menu.isSoldOut
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          }`}
                          title="Klik untuk ubah status habis / tersedia"
                        >
                          {menu.isSoldOut ? '✕ Habis' : '✓ Tersedia'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button 
                          onClick={() => handleOpenEditMenu(menu)} 
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors border border-emerald-200"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteMenu(menu.id)} 
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors border border-red-200"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentMenuData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">Belum ada menu yang ditemukan.</td>
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
                        onClick={() => handleOpenRenameTable(t)}
                        className="text-xs px-2.5 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold"
                      >Ubah</button>
                      {st === 'lunas' && (
                        <button
                          onClick={async () => {
                            try { const { clearTable } = await import('@/lib/api'); await clearTable(t.id); loadData(); }
                            catch (err: any) { alert(err.message); }
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                        >Kosongkan</button>
                      )}
                      {st === 'kosong' && (
                        <button
                          onClick={() => setTableToDelete(t)}
                          className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
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
                      <td className="py-3 px-4 font-bold">
                        <span className={order.status === 'void' ? 'line-through text-gray-400 block text-xs' : 'text-yellow-600'}>
                          Rp {order.total.toLocaleString('id-ID')}
                        </span>
                        {order.status === 'void' && (
                          <span className="text-[10px] text-red-600 font-bold block uppercase tracking-wider">VOID</span>
                        )}
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
                            subtotal: order.subtotal || order.total,
                            discount: order.discount || 0,
                            discountType: order.discountType,
                            discountValue: order.discountValue,
                            tax: order.tax || 0,
                            serviceCharge: order.serviceCharge || 0,
                            total: order.total,
                            status: order.status,
                            voidReason: order.voidReason,
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

      
        
        {/* --- AUDIT TRAIL & LOG PEMBATALAN / REFUND --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>🛡️ Log Audit & Riwayat Pembatalan (Void/Refund)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Seluruh nota yang dibatalkan atau uang yang dikembalikan dicatat permanen demi transparansi kasir.</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-right">
              <span className="block text-[10px] text-red-600 font-bold uppercase tracking-wider">Total Dana Di-Refund</span>
              <span className="text-xl font-black text-red-700">
                Rp {orders.filter(o => o.status === 'void' && o.isRefunded).reduce((s, o) => s + (o.refundAmount || o.total), 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Tindakan</th>
                  <th className="py-2.5 px-3">No. Nota</th>
                  <th className="py-2.5 px-3">Nominal Transaksi</th>
                  <th className="py-2.5 px-3">Status Pengembalian (Refund)</th>
                  <th className="py-2.5 px-3">Alasan Pembatalan</th>
                  <th className="py-2.5 px-3">Operator</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter(o => o.status === 'void').map(o => (
                  <tr key={'audit-'+o.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                      {o.voidedAt ? new Date(o.voidedAt).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-black text-[10px] bg-red-100 text-red-700">VOID</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gray-800">A-{o.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-700">Rp {o.total.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-3">
                      {o.isRefunded ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                          Refund: Rp {(o.refundAmount || o.total).toLocaleString('id-ID')} ({o.refundMethod || 'Tunai'})
                        </span>
                      ) : (
                        <span className="text-gray-400">Tidak ada refund (belum bayar)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 font-medium">{o.voidReason || 'Dibatalkan'}</td>
                    <td className="py-2.5 px-3 text-gray-500">Admin</td>
                  </tr>
                ))}
                {orders.filter(o => o.status === 'void').length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">Belum ada riwayat pembatalan nota (Void/Refund).</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        
        {/* --- RIWAYAT SHIFT KASIR & REKONSILIASI KAS --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>💼 Riwayat Shift Kasir & Rekonsiliasi Kas (Z-Report)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Memantau modal awal, uang tunai masuk, pengeluaran kasir, serta selisih uang fisik saat tutup toko.</p>
            </div>
            
            <div className="flex gap-2">
              <span className="text-xs bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded-lg border border-gray-200">
                Total Shift: {shifts.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Waktu Buka / Tutup</th>
                  <th className="py-2.5 px-3">Modal Awal</th>
                  <th className="py-2.5 px-3">Penjualan Tunai</th>
                  <th className="py-2.5 px-3">Non-Tunai</th>
                  <th className="py-2.5 px-3">Kas Seharusnya</th>
                  <th className="py-2.5 px-3">Fisik Dihitung</th>
                  <th className="py-2.5 px-3">Selisih Kas</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s: any) => {
                  const isOpen = s.status === 'open';
                  const diff = s.cashDifference || 0;
                  return (
                    <tr key={'shift-' + s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-3">
                        <span className={'px-2 py-0.5 rounded font-bold text-[10px] ' + (isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>
                          {isOpen ? '🟢 AKTIF' : 'SELESAI'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-800">{s.operatorName || 'Kasir'}</td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        <div>Buka: {new Date(s.startTime).toLocaleString('id-ID')}</div>
                        {s.endTime && <div className="text-[10px] text-gray-400">Tutup: {new Date(s.endTime).toLocaleString('id-ID')}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-700">Rp {(s.startingCash || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 text-green-700 font-bold">Rp {(s.cashSales || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 text-blue-700 font-bold">Rp {(s.nonCashSales || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">Rp {(s.expectedCash || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {isOpen ? <span className="text-gray-400 italic">Sedang berjalan</span> : ('Rp ' + (s.actualCash || 0).toLocaleString('id-ID'))}
                      </td>
                      <td className="py-2.5 px-3">
                        {isOpen ? (
                          <span className="text-gray-400">-</span>
                        ) : diff === 0 ? (
                          <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">✓ Pas</span>
                        ) : diff < 0 ? (
                          <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">Kurang (-Rp {Math.abs(diff).toLocaleString('id-ID')})</span>
                        ) : (
                          <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">+Rp {diff.toLocaleString('id-ID')}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handlePrintZReport(s)}
                          className="bg-gray-800 hover:bg-gray-900 text-white px-2.5 py-1 rounded text-xs font-semibold"
                          title="Cetak Struk Rekapitulasi Z-Report"
                        >
                          Cetak Z-Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-gray-400">Belum ada riwayat shift yang tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- PENGATURAN TOKO & STRUK --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Profil Usaha & Pengaturan Struk</h2>
              <p className="text-xs text-gray-500 mt-0.5">Identitas ini tersimpan permanen di perangkat & otomatis dicetak pada kepala nota belanja.</p>
            </div>
            <div className="flex items-center gap-2">
              {isDirtySettings && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  ⚠️ Perubahan belum disimpan
                </span>
              )}
              {settingsSavedToast && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300 animate-in fade-in duration-200">
                  ✓ Berhasil Disimpan Permanen!
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveStoreSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Toko / Usaha</label>
                <input 
                  type="text" 
                  value={storeSettings.storeName}
                  onChange={(e) => {
                    setStoreSettings({ ...storeSettings, storeName: e.target.value });
                    setIsDirtySettings(true);
                  }}
                  placeholder="Contoh: Kopi Janji Santai"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input 
                  type="text" 
                  value={storeSettings.storePhone}
                  onChange={(e) => {
                    setStoreSettings({ ...storeSettings, storePhone: e.target.value });
                    setIsDirtySettings(true);
                  }}
                  placeholder="Contoh: 081234567890"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Toko</label>
              <input 
                type="text" 
                value={storeSettings.storeAddress}
                onChange={(e) => {
                  setStoreSettings({ ...storeSettings, storeAddress: e.target.value });
                  setIsDirtySettings(true);
                }}
                placeholder="Contoh: Jl. Malioboro No. 45, Yogyakarta"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ukuran Kertas Thermal</label>
                <select 
                  value={storeSettings.paperWidth}
                  onChange={(e) => {
                    setStoreSettings({ ...storeSettings, paperWidth: e.target.value as any });
                    setIsDirtySettings(true);
                  }}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 bg-white focus:border-emerald-500 outline-none"
                >
                  <option value="58mm">58mm (Printer Mini / Standar Kasir)</option>
                  <option value="80mm">80mm (Printer Besar Restoran)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Kaki Struk (Footer)</label>
                <input 
                  type="text" 
                  value={storeSettings.receiptFooter}
                  onChange={(e) => {
                    setStoreSettings({ ...storeSettings, receiptFooter: e.target.value });
                    setIsDirtySettings(true);
                  }}
                  placeholder="Contoh: Terima Kasih, Silakan Datang Kembali"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            
            {/* Keamanan PIN & Fitur Resto */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Keamanan PIN & Biaya Tambahan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
                {/* Kunci PIN */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={storeSettings.enablePin}
                      onChange={(e) => {
                        setStoreSettings({ ...storeSettings, enablePin: e.target.checked });
                        setIsDirtySettings(true);
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Kunci Admin dengan PIN</span>
                  </label>
                  {storeSettings.enablePin && (
                    <input 
                      type="password"
                      maxLength={6}
                      value={storeSettings.adminPin}
                      onChange={(e) => {
                        setStoreSettings({ ...storeSettings, adminPin: e.target.value });
                        setIsDirtySettings(true);
                      }}
                      placeholder="PIN 4 Digit (contoh: 1234)"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-900 bg-white"
                    />
                  )}
                  <p className="text-[11px] text-gray-500">Mencegah kasir mengubah harga atau menghapus laporan tanpa izin.</p>
                </div>

                {/* Pajak PB1/PPN */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={storeSettings.enableTax}
                      onChange={(e) => {
                        setStoreSettings({ ...storeSettings, enableTax: e.target.checked });
                        setIsDirtySettings(true);
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Pajak Restoran (PB1/PPN)</span>
                  </label>
                  {storeSettings.enableTax && (
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={storeSettings.taxPercent}
                        onChange={(e) => {
                          setStoreSettings({ ...storeSettings, taxPercent: Number(e.target.value) });
                          setIsDirtySettings(true);
                        }}
                        className="w-20 border border-gray-300 rounded-lg p-2 text-sm text-gray-900 bg-white font-bold"
                      />
                      <span className="text-sm font-bold text-gray-700">%</span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">Dihitung otomatis pada total tagihan dan tertera di struk.</p>
                </div>

                {/* Service Charge */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={storeSettings.enableService}
                      onChange={(e) => {
                        setStoreSettings({ ...storeSettings, enableService: e.target.checked });
                        setIsDirtySettings(true);
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Biaya Layanan (Service)</span>
                  </label>
                  {storeSettings.enableService && (
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={storeSettings.servicePercent}
                        onChange={(e) => {
                          setStoreSettings({ ...storeSettings, servicePercent: Number(e.target.value) });
                          setIsDirtySettings(true);
                        }}
                        className="w-20 border border-gray-300 rounded-lg p-2 text-sm text-gray-900 bg-white font-bold"
                      />
                      <span className="text-sm font-bold text-gray-700">%</span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">Biaya layanan tambahan kafe/resto.</p>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSavingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingSettings && <span className="inline-block animate-spin">⏳</span>}
              {isSavingSettings ? 'Menyimpan ke Memori Aman...' : 'Simpan Profil Toko'}
            </button>
          </form>
        </div>

        {/* --- PENGATURAN PRINTER BLUETOOTH --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold mb-1 text-gray-800">Koneksi Printer Bluetooth</h2>
          <p className="text-xs text-gray-500 mb-4">Sambungkan aplikasi langsung ke mesin printer thermal Panda, Eppos, atau printer Bluetooth lainnya.</p>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm text-gray-700 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg font-mono">
              Printer Aktif: <strong>{selectedMac || 'Belum dipilih'}</strong>
            </span>
            <button 
              onClick={scanBluetooth} 
              disabled={isScanning} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              {isScanning ? 'Mencari Perangkat...' : '🔍 Cari Perangkat Bluetooth'}
            </button>
          </div>
          
          {btDevices.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Pilih Printer Anda:</h3>
              <ul className="space-y-2">
                {btDevices.map((d: any) => (
                  <li key={d.address} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{d.name || 'Perangkat Tanpa Nama'}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.address}</p>
                    </div>
                    <button 
                      onClick={() => savePrinter(d.address)} 
                      className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' + (selectedMac === d.address ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800')}
                    >
                      {selectedMac === d.address ? '✓ Terpilih' : 'Pilih Ini'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* --- CADANGKAN & PULIHKAN DATA (BACKUP & RESTORE) --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-12">
          <h2 className="text-xl font-bold mb-1 text-gray-800">Pencadangan Data & Pemeliharaan</h2>
          <p className="text-xs text-gray-500 mb-6">Amankan data menu dan riwayat omzet Anda ke dalam file cadangan sebelum mengganti perangkat atau mereset HP.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Download Backup */}
            <div className="border border-blue-100 bg-blue-50/50 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-2 text-lg">💾</div>
                <h3 className="font-bold text-sm text-blue-900">Cadangkan Data (Backup)</h3>
                <p className="text-xs text-blue-700 mt-1 mb-4 leading-relaxed">Unduh semua data menu, meja, dan riwayat transaksi ke dalam file JSON di HP Anda.</p>
              </div>
              <button 
                onClick={handleExportBackup}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Unduh Cadangan (.JSON)
              </button>
            </div>

            {/* Restore Backup */}
            <div className="border border-green-100 bg-green-50/50 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold mb-2 text-lg">📂</div>
                <h3 className="font-bold text-sm text-green-900">Pulihkan Data (Restore)</h3>
                <p className="text-xs text-green-700 mt-1 mb-4 leading-relaxed">Masukkan kembali file cadangan .JSON untuk memulihkan toko di perangkat baru.</p>
              </div>
              <label className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 rounded-lg text-center cursor-pointer transition-colors shadow-sm block">
                Pilih File Cadangan
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden" 
                />
              </label>
            </div>

            {/* Reset Demo Transactions */}
            <div className="border border-red-100 bg-red-50/50 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold mb-2 text-lg">🧹</div>
                <h3 className="font-bold text-sm text-red-900">Bersihkan Nota Uji Coba</h3>
                <p className="text-xs text-red-700 mt-1 mb-4 leading-relaxed">Hapus semua transaksi tes untuk mulai jualan resmi. Menu dan meja tetap aman.</p>
              </div>
              <button 
                onClick={handleResetTransactions}
                disabled={isResetting}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isResetting ? 'Membersihkan...' : 'Reset Transaksi Saja'}
              </button>
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
                  {printMode === 'all' ? storeSettings.storeName : printMode === 'food' ? 'DAPUR - MAKANAN' : 'BAR - MINUMAN'}
                </h2>
                <p className="text-[10px] uppercase leading-tight mt-1">{storeSettings.storeAddress}<br/>{storeSettings.storePhone ? "Telp: " + storeSettings.storePhone : ""}</p>
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
    
      {/* --- MODAL VOID / REFUND TRANSAKSI --- */}
      {voidTargetOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl my-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl font-black">
                🚫
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Batalkan Nota A-{voidTargetOrder.id}</h3>
                <p className="text-xs text-gray-500">Total Transaksi: <strong className="text-gray-800">Rp {voidTargetOrder.total.toLocaleString('id-ID')}</strong> ({voidTargetOrder.status === 'paid' ? 'Sudah Lunas' : 'Belum Bayar'})</p>
              </div>
            </div>

            {/* Bagian Status Refund (Pengembalian Uang) */}
            {voidTargetOrder.status === 'paid' ? (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isRefundCheckbox}
                    onChange={(e) => setIsRefundCheckbox(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600"
                  />
                  <span className="text-xs font-bold text-orange-900">Catat Pengembalian Uang (Refund ke Pelanggan)</span>
                </label>
                <p className="text-[11px] text-orange-700 mt-1 pl-6">
                  Uang sudah diterima kasir. Aktifkan agar saldo kas fisik dan laporan keuangan tetap cocok.
                </p>

                {isRefundCheckbox && (
                  <div className="mt-3 pt-3 border-t border-orange-200/60 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-orange-900 mb-1">Metode Refund:</label>
                      <select 
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                        className="w-full border border-orange-300 rounded-lg p-2 text-xs bg-white text-gray-800"
                      >
                        <option value="Tunai">💵 Tunai (Kas Fisik)</option>
                        <option value="Transfer">💳 Transfer Bank / QRIS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-orange-900 mb-1">Nominal Refund (Rp):</label>
                      <input 
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(Number(e.target.value))}
                        className="w-full border border-orange-300 rounded-lg p-2 text-xs bg-white text-gray-800 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                ℹ️ Transaksi ini berstatus <strong>Belum Bayar</strong> (Open Bill). Nota akan dibatalkan tanpa pengembalian uang fisik.
              </div>
            )}

            {/* Pilihan Alasan */}
            <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Pembatalan (Audit Trail):</label>
            <select 
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 bg-white mb-3 focus:border-red-500 outline-none"
            >
              <option value="Salah input pesanan">Salah input menu / pesanan kasir</option>
              <option value="Pelanggan batal / pulang">Pelanggan membatalkan pesanan / pulang</option>
              <option value="Makanan / stok habis">Stok bahan atau menu habis</option>
              <option value="Komplain pelanggan">Komplain pesanan bermasalah</option>
              <option value="Lainnya">Alasan Lainnya (Tulis manual)...</option>
            </select>

            {voidReason === 'Lainnya' && (
              <input 
                type="text"
                placeholder="Tuliskan alasan pembatalan..."
                value={customVoidReason}
                onChange={(e) => setCustomVoidReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 mb-3 focus:border-red-500 outline-none"
              />
            )}

            {/* Otorisasi PIN Admin jika aktif */}
            {storeSettings.enablePin && (
              <div className="mt-3 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-800 mb-1">🔑 Otorisasi PIN Admin:</label>
                <input 
                  type="password"
                  maxLength={6}
                  placeholder="Masukkan PIN Admin"
                  value={voidPinConfirm}
                  onChange={(e) => { setVoidPinConfirm(e.target.value); setVoidPinError(""); }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center tracking-widest font-bold text-gray-900 bg-white"
                />
                {voidPinError && (
                  <p className="text-xs text-red-500 font-bold mt-1">{voidPinError}</p>
                )}
              </div>
            )}

            <div className="flex space-x-2 mt-5">
              <button 
                onClick={() => setVoidTargetOrder(null)} 
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleProcessVoid}
                disabled={isVoiding}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {isVoiding ? 'Memproses...' : 'Proses Void & Simpan Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- OVERLAY KUNCI PIN ADMIN --- */}
      {!isUnlocked && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-blue-100">🔒</div>
            <h2 className="text-2xl font-black text-gray-900">Akses Terkunci</h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">Masukkan PIN Keamanan Admin SakuNota untuk membuka menu ini.</p>

            <form onSubmit={handleUnlockPin} className="space-y-4">
              <input 
                type="password"
                maxLength={6}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-3xl font-black border-2 border-gray-200 rounded-2xl py-3 focus:border-blue-500 outline-none text-gray-800 bg-gray-50"
              />

              {pinError && (
                <p className="text-xs font-bold text-red-500">{pinError}</p>
              )}

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow-lg transition-transform active:scale-95"
              >
                Buka Kunci
              </button>

              <Link 
                href="/"
                className="block text-xs font-bold text-gray-500 hover:text-gray-700 pt-2"
              >
                ← Kembali ke Kasir
              </Link>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT MENU --- */}
      {editingMenu && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setEditingMenu(null)}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Menu</h3>
                <p className="text-xs text-gray-500">Perbarui rincian produk menu katalog</p>
              </div>
              <button 
                onClick={() => setEditingMenu(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditMenu} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Menu</label>
                <input 
                  type="text"
                  required
                  autoFocus
                  value={editMenuNama}
                  onChange={(e) => setEditMenuNama(e.target.value)}
                  placeholder="Contoh: Es Kopi Susu Aren"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Satuan (Rp)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  value={editMenuHarga}
                  onChange={(e) => setEditMenuHarga(e.target.value)}
                  placeholder="15000"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                <input 
                  type="text"
                  required
                  value={editMenuKategori}
                  onChange={(e) => setEditMenuKategori(e.target.value)}
                  placeholder="Contoh: Minuman"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingMenu(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isUpdatingMenu}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingMenu ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL UBAH NAMA MEJA --- */}
      {tableToEdit && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTableToEdit(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ubah Nama Meja</h3>
            <p className="text-xs text-gray-500 mb-4">Ganti label meja untuk pemesanan kasir</p>

            <form onSubmit={handleSaveTableRename} className="space-y-4">
              <input 
                type="text"
                required
                autoFocus
                value={tableEditName}
                onChange={(e) => setTableEditName(e.target.value)}
                placeholder="Nomor / Nama Meja"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:border-emerald-500 outline-none"
              />

              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={() => setTableToEdit(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95"
                >
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL HAPUS MEJA --- */}
      {tableToDelete && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTableToDelete(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mx-auto mb-3 font-bold">
              🗑️
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Hapus {tableToDelete.nomor}?</h3>
            <p className="text-xs text-gray-500 mb-5">Meja kosong ini akan dihapus dari daftar tata letak meja kasir.</p>

            <div className="flex space-x-2">
              <button 
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmTableDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
