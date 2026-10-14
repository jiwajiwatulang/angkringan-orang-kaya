"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Printer } from '@capgo/capacitor-printer';
import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';
import { App } from '@capacitor/app';
import { getStoreSettings, loadStoreSettingsAsync, subscribeStoreSettings, StoreSettings } from '@/lib/settings';
import { getActiveShift, getShiftLiveStats, openShift, closeShift, addCashMovement, recordPayment, refundPartialPayment, getOrderPayments, exportAllData } from '@/lib/api';
import { generateZReportReceipt } from '@/lib/receipt';
import { generateEscPosReceipt, generatePartialPaymentReceipt } from '@/lib/receipt';
import PaymentProofUpload from '@/components/PaymentProofUpload';
import OnboardingWizard from '@/components/OnboardingWizard';

type MenuItem = { id: number; nama: string; harga: number; kategori: string; isGroup?: boolean; variants?: MenuItem[]; isSoldOut?: boolean; modifiers?: any[]; };
type CartItem = MenuItem & { qty: number; selectedModifiers?: { groupName: string; optionName: string; harga: number }[]; itemKey?: string };

export default function POSPage() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [view, setView] = useState<'meja' | 'menu'>('meja');
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isDark, setIsDark] = useState(false);
  // --- SHIFT & IDEMPOTENCY STATES ---
  const [activeShift, setActiveShift] = useState<any>(null);
  const [currentShiftStats, setCurrentShiftStats] = useState<any>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // --- MODIFIERS & TRUE BLIND CLOSE STATES ---
  const [activeModItem, setActiveModItem] = useState<any>(null);
  const [selectedModOptions, setSelectedModOptions] = useState<Record<string, any[]>>({});
  const [blindCloseResult, setBlindCloseResult] = useState<any>(null);

  // --- BUKTI PEMBAYARAN & ONBOARDING STATES ---
  const [checkoutProof, setCheckoutProof] = useState<{ imageData: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const [splitProof, setSplitProof] = useState<{ imageData: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Form states for Shift
  const [shiftOperatorName, setShiftOperatorName] = useState("Kasir");
  const [shiftStartingCash, setShiftStartingCash] = useState("200000");
  const [shiftNotes, setShiftNotes] = useState("");
  const [countedPhysicalCash, setCountedPhysicalCash] = useState("");
  const [closingShiftNotes, setClosingShiftNotes] = useState("");

  // --- SPLIT BILL & PARSIAL PAYMENT STATES ---
  const [isSplitBillModalOpen, setIsSplitBillModalOpen] = useState(false);
  const [splitBillTargetOrder, setSplitBillTargetOrder] = useState<any>(null);
  const [splitTab, setSplitTab] = useState<'item' | 'equal' | 'partial'>('item');
  const [splitSelectedItems, setSplitSelectedItems] = useState<Record<number, number>>({});
  const [splitNumPeople, setSplitNumPeople] = useState<number>(2);
  const [splitCustomAmount, setSplitCustomAmount] = useState<string>("");
  const [splitPaymentMethod, setSplitPaymentMethod] = useState<string>("Cash");
  const [splitCashTendered, setSplitCashTendered] = useState<string>("");
  const [splitNotes, setSplitNotes] = useState<string>("");
  const [isSplitProcessing, setIsSplitProcessing] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [refundTargetPayment, setRefundTargetPayment] = useState<any>(null);
  const [refundPinInput, setRefundPinInput] = useState<string>("");
  const [refundReasonInput, setRefundReasonInput] = useState<string>("");

  // Form states for Cash Movement
  const [cashMovementType, setCashMovementType] = useState<'in' | 'out'>('out');
  const [cashMovementAmount, setCashMovementAmount] = useState("");
  const [cashMovementReason, setCashMovementReason] = useState("Beli Es Batu");

  const refreshShiftData = async () => {
    try {
      const active = await getActiveShift();
      setActiveShift(active);
      if (active && active.id) {
        const stats = await getShiftLiveStats(active.id);
        setCurrentShiftStats(stats);
      } else {
        setCurrentShiftStats(null);
      }
    } catch(e) {
      console.error("Error refreshing shift:", e);
    }
  };

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(getStoreSettings());
  const [cashTendered, setCashTendered] = useState<string>("");
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [tempDiscountVal, setTempDiscountVal] = useState("");

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true); document.documentElement.classList.add('dark');
    } else {
      setIsDark(false); document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined' && window.location.search.includes('view=menu')) {
      setView('menu');
    }
  }, []);
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) { document.documentElement.classList.add('dark'); localStorage.theme = 'dark'; }
    else { document.documentElement.classList.remove('dark'); localStorage.theme = 'light'; }
  };

  // Synchronize store settings asynchronously from IndexedDB and subscribe to live changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    async function initSettings() {
      try {
        const fresh = await loadStoreSettingsAsync();
        setStoreSettings(fresh);
        if (fresh.onboardingCompleted === false || (typeof window !== 'undefined' && window.location.search.includes('onboarding=true'))) {
          setIsOnboardingOpen(true);
        }
      } catch (err) {
        console.error("Error loading store settings in POS:", err);
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

  // Unsaved Changes Protection Modal State
  const [unsavedConfirm, setUnsavedConfirm] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    onDiscard: () => void;
  } | null>(null);

  const [backupSuccessNotice, setBackupSuccessNotice] = useState<string | null>(null);

  const handleExportBackupFromPos = async () => {
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
      const nowIso = new Date().toISOString();
      localStorage.setItem('sakunota_last_backup_date', nowIso);
      setBackupSuccessNotice("Cadangan berhasil diunduh (" + date + ")!");
      setTimeout(() => setBackupSuccessNotice(null), 4000);
    } catch (err: any) {
      alert("Gagal membuat cadangan: " + err.message);
    }
  };

  const handleCloseOpenShift = () => {
    const isDirty = (shiftOperatorName && shiftOperatorName !== "Kasir") ||
      (shiftStartingCash && shiftStartingCash !== "200000") ||
      (shiftNotes && shiftNotes.trim() !== "");
    if (isDirty) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Buka Shift?",
        message: "Data modal awal yang sedang Anda ketik belum disimpan. Yakin ingin menutup?",
        onDiscard: () => setIsOpenShiftModalOpen(false)
      });
    } else {
      setIsOpenShiftModalOpen(false);
    }
  };

  const handleCloseCashMovement = () => {
    const isDirty = cashMovementAmount.trim() !== "";
    if (isDirty) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Catat Kas?",
        message: "Nominal uang kas yang Anda ketik belum dicatat. Yakin ingin menutup?",
        onDiscard: () => {
          setCashMovementAmount("");
          setIsCashMovementModalOpen(false);
        }
      });
    } else {
      setIsCashMovementModalOpen(false);
    }
  };

  const handleCloseCloseShift = () => {
    const isDirty = countedPhysicalCash.trim() !== "" || closingShiftNotes.trim() !== "";
    if (isDirty) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Tutup Shift?",
        message: "Penghitungan fisik uang laci belum diselesaikan. Yakin ingin menutup?",
        onDiscard: () => {
          setCountedPhysicalCash("");
          setIsCloseShiftModalOpen(false);
        }
      });
    } else {
      setIsCloseShiftModalOpen(false);
    }
  };

  const handleCloseDiscountModal = () => {
    const isDirty = tempDiscountVal.trim() !== "" && tempDiscountVal !== discountValue.toString();
    if (isDirty) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Input Diskon?",
        message: "Diskon yang Anda ketik belum diterapkan. Yakin ingin menutup?",
        onDiscard: () => {
          setTempDiscountVal(discountValue > 0 ? discountValue.toString() : "");
          setIsDiscountModalOpen(false);
        }
      });
    } else {
      setIsDiscountModalOpen(false);
    }
  };

  const handleCloseSplitBill = () => {
    const hasItems = Object.keys(splitSelectedItems).length > 0;
    const hasCustom = splitCustomAmount.trim() !== "";
    const hasCash = splitCashTendered.trim() !== "";
    if (hasItems || hasCustom || hasCash) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Split Bill?",
        message: "Rincian split pembayaran belum disimpan. Yakin ingin membatalkan?",
        onDiscard: () => {
          setSplitSelectedItems({});
          setSplitCustomAmount("");
          setSplitCashTendered("");
          setIsSplitBillModalOpen(false);
        }
      });
    } else {
      setIsSplitBillModalOpen(false);
    }
  };

  const handleClosePaymentModal = () => {
    const isDirty = customerName.trim() !== "" || 
      notes.trim() !== "" || 
      cashTendered.trim() !== "";
    if (isDirty) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Pembayaran?",
        message: "Data pelanggan atau uang diterima belum diproses. Yakin ingin membatalkan?",
        onDiscard: () => setIsPaymentModalOpen(false)
      });
    } else {
      setIsPaymentModalOpen(false);
    }
  };

  const handleReleaseTable = () => {
    if (cart.length > 0) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Lepas Meja & Kosongkan Keranjang?",
        message: `Ada ${cart.length} item di dalam keranjang yang belum dipesan. Yakin ingin mengosongkan keranjang dan melepas meja?`,
        onDiscard: () => {
          resetCart();
          setSelectedTable("");
          setIsMobileCartOpen(false);
        }
      });
    } else {
      resetCart();
      setSelectedTable("");
      setIsMobileCartOpen(false);
    }
  };

  // Android Hardware Back button listener: closes active modal or bottom-sheet before exiting
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (unsavedConfirm?.isOpen) {
          setUnsavedConfirm(null);
        } else if (activeModItem) {
          setActiveModItem(null);
        } else if (activeVariantGroup) {
          setActiveVariantGroup(null);
        } else if (isPaymentModalOpen) {
          handleClosePaymentModal();
        } else if (isSplitBillModalOpen) {
          handleCloseSplitBill();
        } else if (isRefundModalOpen) {
          setIsRefundModalOpen(false);
        } else if (isDiscountModalOpen) {
          handleCloseDiscountModal();
        } else if (isCashMovementModalOpen) {
          handleCloseCashMovement();
        } else if (isOpenShiftModalOpen) {
          handleCloseOpenShift();
        } else if (isCloseShiftModalOpen) {
          handleCloseCloseShift();
        } else if (receiptData) {
          setReceiptData(null);
        } else if (blindCloseResult) {
          setBlindCloseResult(null);
        } else if (isMobileCartOpen) {
          setIsMobileCartOpen(false);
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
  }, [
    unsavedConfirm,
    activeModItem,
    activeVariantGroup,
    isPaymentModalOpen,
    isSplitBillModalOpen,
    isRefundModalOpen,
    isDiscountModalOpen,
    isCashMovementModalOpen,
    isOpenShiftModalOpen,
    isCloseShiftModalOpen,
    receiptData,
    blindCloseResult,
    isMobileCartOpen,
    shiftOperatorName,
    shiftStartingCash,
    shiftNotes,
    cashMovementAmount,
    countedPhysicalCash,
    closingShiftNotes,
    tempDiscountVal,
    discountValue,
    splitSelectedItems,
    splitCustomAmount,
    splitCashTendered,
    customerName,
    notes,
    cashTendered
  ]);

  const loadData = async () => {
    try {
      const freshSettings = await loadStoreSettingsAsync();
      setStoreSettings(freshSettings);
    } catch (_) {
      setStoreSettings(getStoreSettings());
    }
    await refreshShiftData();
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
    if (order.discountValue) { setDiscountValue(order.discountValue); setDiscountType(order.discountType || 'percent'); }
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

  
  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openShift({
        operatorName: shiftOperatorName || 'Kasir',
        startingCash: Number(shiftStartingCash) || 0,
        notes: shiftNotes
      });
      setIsOpenShiftModalOpen(false);
      await refreshShiftData();
      alert("Shift kasir berhasil DIBUKA! Selamat bertugas.");
    } catch (err: any) {
      alert("Gagal membuka shift: " + err.message);
    }
  };

  const openCloseShiftModal = async () => {
    if (!activeShift) return;
    try {
      const stats = await getShiftLiveStats(activeShift.id);
      setCurrentShiftStats(stats);
      setCountedPhysicalCash("");
      setClosingShiftNotes("");
      setIsCloseShiftModalOpen(true);
    } catch(err: any) {
      alert("Gagal memuat data shift: " + err.message);
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const physical = Number(countedPhysicalCash) || 0;
    try {
      const closed = await closeShift(activeShift.id, {
        actualCash: physical,
        notes: closingShiftNotes,
        operatorName: activeShift.operatorName
      });
      setIsCloseShiftModalOpen(false);
      setBlindCloseResult(closed);

      // Otomatis cetak struk Z-Report
      const zReceiptText = generateZReportReceipt(closed, storeSettings);
      try {
        const mac = localStorage.getItem('bt_printer_mac');
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid && mac) {
          try { await BluetoothSerial.connect({ address: mac }); } catch(e) {}
          await BluetoothSerial.write({ address: mac, value: zReceiptText });
        } else {
          await Printer.printWebView({ name: 'Z_Report_Tutup_Shift' });
        }
      } catch (printErr) {
        console.warn("Print Z-report fallback:", printErr);
      }

      await refreshShiftData();
      alert("Shift berhasil DITUTUP. Rekapitulasi kas tercatat permanen.");
    } catch (err: any) {
      alert("Gagal menutup shift: " + err.message);
    }
  };

  const handleCashMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      alert("Buka shift kasir terlebih dahulu!");
      return;
    }
    const amt = Number(cashMovementAmount) || 0;
    if (amt <= 0) {
      alert("Nominal uang harus lebih dari 0!");
      return;
    }
    try {
      await addCashMovement({
        shiftId: activeShift.id,
        type: cashMovementType,
        amount: amt,
        reason: cashMovementReason,
        operatorName: activeShift.operatorName
      });
      setIsCashMovementModalOpen(false);
      setCashMovementAmount("");
      await refreshShiftData();
      alert("Pencatatan kas berhasil disimpan!");
    } catch (err: any) {
      alert("Gagal mencatat kas: " + err.message);
    }
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
  const printReceiptText = async (rawText: string, jobName: string = 'Struk') => {
    try {
      const isAndroid = /android/i.test(navigator.userAgent);
      const mac = localStorage.getItem('bt_printer_mac');
      if (isAndroid && mac) {
        try { await BluetoothSerial.connect({ address: mac }); } catch(e) {}
        await BluetoothSerial.write({ address: mac, value: rawText });
        alert("Berhasil dicetak langsung ke Printer Bluetooth!");
      } else {
        await Printer.printWebView({ name: jobName });
      }
    } catch (err: any) {
      console.warn("Print error:", err);
      try {
        await Printer.printWebView({ name: jobName });
      } catch(e) {
        alert("Gagal mencetak struk: " + JSON.stringify(err));
      }
    }
  };

  // --- SPLIT BILL FUNCTIONS ---
  const openSplitBillForOrder = async (orderId: number) => {
    try {
      const { getOrders } = await import('@/lib/api');
      const orders = await getOrders();
      const target = orders.find(o => o.id === orderId);
      if (!target) {
        alert("Nota tidak ditemukan.");
        return;
      }
      setSplitBillTargetOrder(target);
      setSplitTab('item');
      setSplitSelectedItems({});
      const remaining = target.remainingBalance !== undefined ? target.remainingBalance : target.total;
      setSplitCustomAmount(remaining.toString());
      setSplitPaymentMethod('Cash');
      setSplitCashTendered('');
      setSplitNotes('');
      setIsPaymentModalOpen(false);
      setIsSplitBillModalOpen(true);
    } catch (err: any) {
      alert("Gagal membuka Split Bill: " + err.message);
    }
  };

  const handleOpenSplitBillFromCart = async () => {
    if (editingOrderId) {
      await openSplitBillForOrder(editingOrderId);
      return;
    }
    if (selectedTable) {
      const existing = activeOrders.find(o => o.tableId === parseInt(selectedTable));
      if (existing) {
        await openSplitBillForOrder(existing.id);
        return;
      }
    }
    if (cart.length > 0) {
      if (!customerName.trim()) {
        alert("Mohon isi Nama Pelanggan terlebih dahulu.");
        setIsPaymentModalOpen(true);
        return;
      }
      const saved: any = await processPayment(true, 'unpaid');
      if (saved && saved.id) {
        await openSplitBillForOrder(saved.id);
      }
    }
  };

  const handleOpenSplitBillFromPaymentModal = async () => {
    let targetOrderId = editingOrderId;
    if (!targetOrderId && selectedTable) {
      const existing = activeOrders.find(o => o.tableId === parseInt(selectedTable));
      if (existing) targetOrderId = existing.id;
    }
    if (targetOrderId) {
      await openSplitBillForOrder(targetOrderId);
      return;
    }
    const saved: any = await processPayment(true, 'unpaid');
    if (saved && saved.id) {
      await openSplitBillForOrder(saved.id);
    }
  };

  const calculateSplitItemTotal = () => {
    if (!splitBillTargetOrder || !splitBillTargetOrder.items) return 0;
    let selectedSum = 0;
    const rawSubtotal = splitBillTargetOrder.subtotal || splitBillTargetOrder.total;

    splitBillTargetOrder.items.forEach((item: any) => {
      const qty = splitSelectedItems[item.id] || 0;
      if (qty > 0) {
        const itemUnitPrice = item.hargaSatuan || item.harga || 0;
        const modSum = (item.selectedModifiers || []).reduce((s: number, m: any) => s + (m.harga || 0), 0);
        selectedSum += qty * (itemUnitPrice + modSum);
      }
    });

    if (selectedSum === 0) return 0;
    if (!rawSubtotal || rawSubtotal === 0) return selectedSum;

    const ratio = selectedSum / rawSubtotal;
    const discountPortion = Math.round((splitBillTargetOrder.discount || 0) * ratio);
    const servicePortion = Math.round((splitBillTargetOrder.serviceCharge || 0) * ratio);
    const taxPortion = Math.round((splitBillTargetOrder.tax || 0) * ratio);

    const calculated = selectedSum - discountPortion + servicePortion + taxPortion;
    const remaining = splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total;
    return Math.max(100, Math.min(remaining, calculated));
  };

  const handleExecuteSplitPayment = async () => {
    if (!splitBillTargetOrder) return;
    if (isSplitProcessing) return;

    const remaining = splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total;
    if (remaining <= 0) {
      alert("Nota ini sudah lunas sepenuhnya.");
      return;
    }

    let nominalToPay = 0;
    let itemsPaidPayload: any[] = [];

    if (splitTab === 'item') {
      nominalToPay = calculateSplitItemTotal();
      if (nominalToPay <= 0) {
        alert("Pilih minimal 1 menu yang ingin dibayar.");
        return;
      }
      splitBillTargetOrder.items.forEach((item: any) => {
        const qty = splitSelectedItems[item.id] || 0;
        if (qty > 0) {
          itemsPaidPayload.push({
            menuItemId: item.menuItemId || item.id,
            nama: item.namaMenu || item.nama || 'Item',
            qty: qty,
            harga: item.hargaSatuan || item.harga || 0
          });
        }
      });
    } else if (splitTab === 'equal') {
      const baseShare = Math.floor(remaining / splitNumPeople);
      const remainder = remaining % splitNumPeople;
      nominalToPay = baseShare + remainder; // Orang pertama mengambil sisa pembulatan
    } else {
      nominalToPay = Number(splitCustomAmount) || 0;
      if (nominalToPay <= 0) {
        alert("Masukkan nominal pembayaran yang valid (lebih dari Rp 0).");
        return;
      }
    }

    nominalToPay = Math.min(nominalToPay, remaining);

    if (splitPaymentMethod === 'Cash') {
      const tendered = Number(splitCashTendered) || nominalToPay;
      if (tendered < nominalToPay) {
        alert("Uang yang diterima kasir (Rp " + tendered.toLocaleString('id-ID') + ") kurang dari nominal tagihan (Rp " + nominalToPay.toLocaleString('id-ID') + ")!");
        return;
      }
    }

    setIsSplitProcessing(true);
    try {
      const tendered = splitPaymentMethod === 'Cash' ? (Number(splitCashTendered) || nominalToPay) : nominalToPay;
      const res = await recordPayment({
        orderId: splitBillTargetOrder.id,
        shiftId: activeShift ? activeShift.id : null,
        paymentMethod: splitPaymentMethod as any,
        amount: nominalToPay,
        cashTendered: tendered,
        change: Math.max(0, tendered - nominalToPay),
        splitType: splitTab,
        itemsPaid: itemsPaidPayload,
        operatorName: activeShift ? activeShift.operatorName : 'Kasir',
        notes: splitNotes,
        proof: splitProof && splitPaymentMethod !== 'Cash' ? splitProof : undefined
      });
      setSplitProof(null);

      // Buat struk pembayaran parsial
      const paymentRecord = {
        amount: nominalToPay,
        paymentMethod: splitPaymentMethod,
        cashTendered: tendered,
        change: Math.max(0, tendered - nominalToPay),
        splitType: splitTab,
        itemsPaid: itemsPaidPayload,
        paidAt: new Date().toISOString(),
        operatorName: activeShift ? activeShift.operatorName : 'Kasir',
        shiftId: activeShift ? activeShift.id : null
      };

      const partialReceiptText = generatePartialPaymentReceipt(
        { ...splitBillTargetOrder, remainingBalance: res.remainingBalance },
        paymentRecord,
        storeSettings
      );

      printReceiptText(partialReceiptText, 'Bukti_Bayar_Parsial');

      await refreshShiftData();
      await loadData();

      if (res.isFullyPaid) {
        alert("🎉 Selamat! Seluruh tagihan Nota #A-" + splitBillTargetOrder.id + " telah LUNAS.");
        setIsSplitBillModalOpen(false);
        setSplitBillTargetOrder(null);
        resetCart();
        setSelectedTable("");
        setView('meja');
      } else {
        alert("Pembayaran Rp " + nominalToPay.toLocaleString('id-ID') + " berhasil disimpan! Sisa tagihan: Rp " + res.remainingBalance.toLocaleString('id-ID'));
        await openSplitBillForOrder(splitBillTargetOrder.id);
      }
    } catch (err: any) {
      alert("Gagal memproses pembayaran: " + err.message);
    } finally {
      setIsSplitProcessing(false);
    }
  };

  const handleRequestRefundPayment = (payment: any) => {
    setRefundTargetPayment(payment);
    setRefundPinInput("");
    setRefundReasonInput("");
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefundPayment = async () => {
    if (!refundTargetPayment) return;

    if (storeSettings.enablePin) {
      const correctPin = storeSettings.adminPin || "1234";
      if (refundPinInput !== correctPin) {
        alert("PIN Otorisasi Admin SALAH!");
        return;
      }
    }

    try {
      const res = await refundPartialPayment(refundTargetPayment.id, {
        reason: refundReasonInput || "Refund atas permintaan pelanggan",
        operator: activeShift ? activeShift.operatorName : "Admin"
      });

      alert("Pembayaran Rp " + res.refundedAmount.toLocaleString('id-ID') + " berhasil di-refund. Sisa tagihan telah disesuaikan kembali.");
      setIsRefundModalOpen(false);
      setRefundTargetPayment(null);
      await refreshShiftData();
      await loadData();
      if (splitBillTargetOrder) {
        await openSplitBillForOrder(splitBillTargetOrder.id);
      }
    } catch (err: any) {
      alert("Gagal memproses refund: " + err.message);
    }
  };

  const openModifierModal = (item: any) => {
    setActiveModItem(item);
    const defaults: Record<string, any[]> = {};
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((g: any) => {
        if (g.minSelect >= 1 && g.options && g.options.length > 0) {
          defaults[g.id] = [g.options[0]];
        } else {
          defaults[g.id] = [];
        }
      });
    }
    setSelectedModOptions(defaults);
  };

  const toggleModOption = (group: any, option: any) => {
    setSelectedModOptions(prev => {
      const current = prev[group.id] || [];
      const exists = current.some((o: any) => o.id === option.id);

      if (group.maxSelect === 1) {
        return { ...prev, [group.id]: [option] };
      } else {
        if (exists) {
          return { ...prev, [group.id]: current.filter((o: any) => o.id !== option.id) };
        } else {
          if (current.length >= group.maxSelect) {
            alert(`Maksimal pilihan untuk "${group.nama}" adalah ${group.maxSelect}`);
            return prev;
          }
          return { ...prev, [group.id]: [...current, option] };
        }
      }
    });
  };

  const handleConfirmModifiers = () => {
    if (!activeModItem) return;
    for (const g of (activeModItem.modifiers || [])) {
      const selected = selectedModOptions[g.id] || [];
      if (selected.length < g.minSelect) {
        alert(`Mohon pilih minimal ${g.minSelect} untuk "${g.nama}"`);
        return;
      }
    }

    const flatMods: { groupName: string; optionName: string; harga: number }[] = [];
    (activeModItem.modifiers || []).forEach((g: any) => {
      const selected = selectedModOptions[g.id] || [];
      selected.forEach((opt: any) => {
        flatMods.push({
          groupName: g.nama,
          optionName: opt.nama,
          harga: opt.harga || 0
        });
      });
    });

    const extraTotal = flatMods.reduce((sum, m) => sum + m.harga, 0);
    const finalPrice = activeModItem.harga + extraTotal;

    addToCart(activeModItem, flatMods, finalPrice);
    setActiveModItem(null);
  };

  const addToCart = (item: any, customModifiers?: { groupName: string; optionName: string; harga: number }[], customPrice?: number) => {
    if (item.isSoldOut) return;
    
    // Jika item memiliki modifier dan belum dipilih, buka modal pilihan
    if (!customModifiers && item.modifiers && item.modifiers.length > 0) {
      openModifierModal(item);
      return;
    }

    const mods = customModifiers || [];
    const itemPrice = customPrice !== undefined ? customPrice : item.harga;
    const modSignature = mods.map(m => `${m.groupName}:${m.optionName}`).sort().join('|');
    const itemKey = modSignature ? `${item.id}_${modSignature}` : `${item.id}`;

    setCart(prev => {
      const existing = prev.find(i => (i.itemKey || i.id.toString()) === itemKey);
      if (existing) {
        return prev.map(i => (i.itemKey || i.id.toString()) === itemKey ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        ...item,
        harga: itemPrice,
        qty: 1,
        selectedModifiers: mods,
        itemKey
      }];
    });
  };

  const updateQty = (keyOrId: string | number, delta: number) => {
    setCart(prev => prev.map(item => {
      const currentKey = item.itemKey || item.id;
      if (currentKey === keyOrId || item.id === keyOrId || currentKey.toString() === keyOrId.toString()) {
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
    setCashTendered("");
    setDiscountValue(0);
    setDiscountType('percent');
    setEditingOrderId(null);
  };

    const rawSubtotal = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const discountAmount = discountValue > 0 ? (
    discountType === 'percent' 
      ? Math.round(rawSubtotal * (Number(discountValue) / 100))
      : Math.min(rawSubtotal, Number(discountValue))
  ) : 0;
  const afterDiscount = Math.max(0, rawSubtotal - discountAmount);
  const serviceAmount = storeSettings.enableService ? Math.round(afterDiscount * ((storeSettings.servicePercent || 0) / 100)) : 0;
  const taxBase = afterDiscount + (storeSettings.taxAppliesToService ? serviceAmount : 0);
  const taxAmount = storeSettings.enableTax ? Math.round(taxBase * ((storeSettings.taxPercent || 0) / 100)) : 0;
  const totalPrice = afterDiscount + serviceAmount + taxAmount;
  const selectedTableObj = tableData.find(t => t.id.toString() === selectedTable);
  const selectedTableStatus = selectedTableObj ? getTableStatus(selectedTableObj) : null;
  const isDrinkCategory = (cat: string) => {
    if(!cat) return false;
    const c = cat.toLowerCase();
    return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') || c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
  };

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

      const idempotencyKey = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const payload: any = {
        idempotencyKey,
        items: finalItems,
        subtotal: rawSubtotal,
        discount: discountAmount,
        discountType,
        discountValue,
        tax: taxAmount,
        serviceCharge: serviceAmount,
        total: finalTotal,
        customerName,
        customerPhone: "",
        paymentMethod,
        orderType,
        notes,
        tableId: orderType === "Dine-in" && selectedTable ? parseInt(selectedTable) : null,
        status: status,
        proof: checkoutProof && paymentMethod !== 'Cash' ? checkoutProof : undefined
      };
      setCheckoutProof(null);

      let resultId;

      if (targetOrderId) {
        isRevision = true;
        if (!editingOrderId) {
          // Merge items for implicit addition
          const existingOrder = activeOrders.find(o => o.id === targetOrderId);
          
          const cartFormattedOld = existingOrder.items.map((i: any) => {
            const mods = i.selectedModifiers || [];
            const modSignature = mods.map((m: any) => `${m.groupName}:${m.optionName}`).sort().join('|');
            return {
              id: i.menuItemId,
              nama: menuData.find((m:any) => m.id === i.menuItemId)?.nama || 'Item',
              harga: i.hargaSatuan,
              kategori: menuData.find((m:any) => m.id === i.menuItemId)?.kategori || '',
              qty: i.qty || i.quantity,
              selectedModifiers: mods,
              itemKey: modSignature ? `${i.menuItemId}_${modSignature}` : `${i.menuItemId}`
            };
          });
          
          cart.forEach(newItem => {
            const newKey = newItem.itemKey || `${newItem.id}`;
            const exIdx = cartFormattedOld.findIndex((i:any) => (i.itemKey || `${i.id}`) === newKey);
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

      const tenderAmount = paymentMethod === 'Cash' ? (Number(cashTendered) || finalTotal) : finalTotal;
      const changeAmount = paymentMethod === 'Cash' ? Math.max(0, tenderAmount - finalTotal) : 0;

      const newReceipt = {
        cashTendered: tenderAmount,
        change: changeAmount,
        subtotal: rawSubtotal,
        discount: discountAmount,
        discountType,
        discountValue,
        tax: taxAmount,
        serviceCharge: serviceAmount,
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
      return { id: resultId };
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

    const handlePrint = async (mode: 'all' | 'food' | 'drink', autoReceiptData?: any) => {
    const dataToPrint = autoReceiptData || receiptData;
    setPrintMode(mode);
    
    setTimeout(async () => {
      try {
        const mac = localStorage.getItem('bt_printer_mac');
        const isAndroid = /android/i.test(navigator.userAgent);
        
        if (isAndroid && mac && dataToPrint) {
          const rawText = generateEscPosReceipt(dataToPrint, mode, storeSettings);
          try {
            await BluetoothSerial.connect({ address: mac });
          } catch (e) {}
          await BluetoothSerial.write({ address: mac, value: rawText });
        } else {
          await Printer.printWebView({ name: 'Nota_POS' });
        }
      } catch (e) {
        try {
          await Printer.printWebView({ name: 'Nota_POS' });
        } catch (e2) {
          alert('Gagal memanggil print: ' + e);
        }
      }
      setPrintMode('all');
    }, 100);
  };
  const closeReceipt = () => setReceiptData(null);


  const renderCartInner = (isMobile: boolean) => (
    <>
      <div className={`${isMobile ? 'px-6 pb-4 pt-2' : 'p-5'} border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-3xl`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{editingOrderId ? 'Edit Open Bill' : 'Pesanan Anda'}</h2>
          {selectedTable && <button onClick={handleReleaseTable} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100">Lepas meja</button>}
        </div>
        {selectedTableObj && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${selectedTableStatus === 'open' ? 'bg-red-50 text-red-700 border border-red-200' : selectedTableStatus === 'lunas' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
              {selectedTableObj.nomor.replace(/^Meja\s*/i, '')}
              <span className="opacity-70 ml-1">({selectedTableStatus === 'open' ? 'Open Bill' : selectedTableStatus === 'lunas' ? 'Lunas' : 'Kosong'})</span>
            </div>
            {customerName && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm">
                👤 {customerName}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-6' : 'p-5'} space-y-4 bg-white dark:bg-gray-800`}>
        {cart.length === 0 && selectedTableStatus === 'lunas' && (
          <div className="text-center mt-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-3 border border-blue-100">🎉</div>
            <p className="font-bold text-gray-800 dark:text-white">Tagihan meja ini sudah LUNAS</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4 text-sm text-yellow-800 text-left w-full">
              <p className="font-bold mb-1">Tambah Pesanan Baru:</p>
              <p className="leading-snug">Pilih menu di samping. Pesanan akan otomatis masuk sebagai <b>Nota Baru</b>.</p>
            </div>
            <button onClick={() => { handleClearTable(); setIsMobileCartOpen(false); }} className="w-full mt-4 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition-colors">Kosongkan Meja (Selesai)</button>
          </div>
        )}
        
        {cart.length === 0 && selectedTableStatus !== 'lunas' && (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-12 flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
            <p className="font-medium text-sm">Belum ada pesanan.</p>
          </div>
        )}

        {cart.map(item => (
          <div key={item.itemKey || item.id} className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-4">
            <div className="flex-1 pr-3">
              <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm md:text-base leading-tight">{item.nama}</h4>
              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.selectedModifiers.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span>•</span>
                      <span>{m.optionName}</span>
                      {m.harga > 0 && <span className="font-bold text-yellow-600 dark:text-yellow-500">(+Rp {m.harga.toLocaleString('id-ID')})</span>}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-emerald-700 dark:text-emerald-400 text-sm font-extrabold mt-1">Rp {item.harga.toLocaleString('id-ID')}</p>
            </div>
            <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              <button onClick={() => updateQty(item.itemKey || item.id, -1)} className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 flex items-center justify-center font-black transition-colors">-</button>
              <span className="w-8 text-center font-bold text-gray-800 dark:text-white text-sm">{item.qty}</span>
              <button onClick={() => updateQty(item.itemKey || item.id, 1)} className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-black transition-colors">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`${isMobile ? 'p-6 pb-8' : 'p-5'} bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]`}>
        
        {/* Rincian Diskon & Biaya */}
        {cart.length > 0 && (
          <div className="mb-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex justify-between items-center">
              <span>Subtotal:</span>
              <span className="font-semibold">Rp {rawSubtotal.toLocaleString('id-ID')}</span>
            </div>

            <div className="flex justify-between items-center">
              {discountAmount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    🏷️ Diskon ({discountType === 'percent' ? discountValue + '%' : 'Rp'}):
                  </span>
                  <button 
                    onClick={() => { setDiscountValue(0); setTempDiscountVal(""); }}
                    className="text-red-500 hover:text-red-700 text-[10px] underline"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  + Tambah Diskon / Promo
                </button>
              )}
              {discountAmount > 0 && (
                <span className="font-bold text-emerald-700 dark:text-emerald-400">-Rp {discountAmount.toLocaleString('id-ID')}</span>
              )}
            </div>

            {storeSettings.enableService && serviceAmount > 0 && (
              <div className="flex justify-between items-center">
                <span>Layanan ({storeSettings.servicePercent}%):</span>
                <span>Rp {serviceAmount.toLocaleString('id-ID')}</span>
              </div>
            )}

            {storeSettings.enableTax && taxAmount > 0 && (
              <div className="flex justify-between items-center">
                <span>Pajak Resto ({storeSettings.taxPercent}%):</span>
                <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-end mb-4">
          <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Total Pembayaran</span>
          <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Rp {totalPrice.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex gap-2">
          {editingOrderId && (
            <button onClick={handleShowDraftBill} className="w-1/4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white py-3.5 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all">📝 Draft</button>
          )}
          {(editingOrderId || (orderType === "Dine-in" && selectedTable && activeOrders.some(o => o.tableId === parseInt(selectedTable)))) && (
            <button 
              type="button"
              onClick={handleOpenSplitBillFromCart} 
              className="w-1/3 bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              ✂️ Split Bill
            </button>
          )}
          <button 
            onClick={() => setIsPaymentModalOpen(true)} 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-extrabold text-sm md:text-base shadow-md active:scale-95 transition-all disabled:opacity-40" 
            disabled={cart.length === 0}
          >
            Bayar Pesanan
          </button>
        </div>
      </div>
    </>
  );

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
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleClosePaymentModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Selesaikan Pembayaran</h2>
              <button 
                type="button"
                onClick={handleClosePaymentModal}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Tipe Pesanan</label>
                  <div className="flex space-x-2">
                    {["Dine-in", "Takeaway"].map((type) => (
                      <button 
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border ${orderType === type ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400'}`}
                      >
                        {type === 'Dine-in' ? '🍽️ Dine-in (Makan di Tempat)' : '🥡 Takeaway (Bungkus)'}
                      </button>
                    ))}
                  </div>
                </div>
                {orderType === "Dine-in" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Pilih Meja</label>
                    <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                      {tableData.map(table => {
                        const tStatus = getTableStatus(table);
                        const isSelected = selectedTable === table.id.toString();
                        const bgClass = tStatus === 'open' ? 'bg-red-100 text-red-800 border-red-300' : tStatus === 'lunas' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-green-100 text-green-800 border-green-300';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => setSelectedTable(table.id.toString())}
                            className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${bgClass} ${isSelected ? 'ring-2 ring-emerald-600 ring-offset-1 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                          >
                            {table.nomor.replace(/^Meja\s*/i, '')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Nama Pelanggan (Wajib)</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors" 
                  />
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Catatan (Opsional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Tanpa bawang goreng, sambal pisah"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 mt-2">Metode Pembayaran</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Cash", "QRIS", "Transfer"].map((method) => (
                      <button 
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border ${paymentMethod === method ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400'}`}
                      >
                        {method === 'Cash' ? '💵 Tunai' : method === 'QRIS' ? '📱 QRIS' : '💳 Transfer'}
                      </button>
                    ))}
                  </div>
                </div>
                  {/* Kalkulator Uang Masuk & Kembalian */}
                  {paymentMethod === "Cash" && (
                    <div className="mt-3 p-3.5 bg-gray-50 dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Uang Diterima (Rp)</label>
                        <button 
                          type="button"
                          onClick={() => setCashTendered(totalPrice.toString())}
                          className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                        >
                          Uang Pas
                        </button>
                      </div>
                      <input 
                        type="number"
                        placeholder={totalPrice.toString()}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-lg font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                      />
                      
                      {/* Tombol Cepat Pecahan Uang */}
                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                        {[10000, 20000, 50000, 100000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCashTendered(amt.toString())}
                            className="py-1 px-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
                          >
                            {amt >= 1000 ? (amt / 1000) + 'rb' : amt}
                          </button>
                        ))}
                      </div>

                      {/* Indikator Kembalian */}
                      <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Kembalian:</span>
                        <span className={'text-base font-black ' + ((Number(cashTendered) || 0) >= totalPrice ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500')}>
                          Rp {Math.max(0, (Number(cashTendered) || 0) - totalPrice).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Upload Bukti Pembayaran untuk QRIS & Transfer Bank */}
                  {(paymentMethod === "QRIS" || paymentMethod === "Transfer") && (
                    <PaymentProofUpload
                      proof={checkoutProof}
                      onChange={setCheckoutProof}
                      paymentMethod={paymentMethod}
                    />
                  )}
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
              
                {cart.length > 0 && (discountAmount > 0 || serviceAmount > 0 || taxAmount > 0) && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-1 text-xs text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between"><span>Subtotal</span><span>Rp {rawSubtotal.toLocaleString('id-ID')}</span></div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold"><span>Diskon</span><span>-Rp {discountAmount.toLocaleString('id-ID')}</span></div>
                    )}
                    {serviceAmount > 0 && (
                      <div className="flex justify-between"><span>Biaya Layanan ({storeSettings.servicePercent}%)</span><span>Rp {serviceAmount.toLocaleString('id-ID')}</span></div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex justify-between"><span>Pajak Resto ({storeSettings.taxPercent}%)</span><span>Rp {taxAmount.toLocaleString('id-ID')}</span></div>
                    )}
                  </div>
                )}

              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 dark:text-gray-400 font-bold text-sm">Total Tagihan</span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={handleClosePaymentModal} 
                  className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                {orderType === "Dine-in" && selectedTable && (
                  <button 
                    type="button"
                    onClick={() => processPayment(true, 'unpaid')} 
                    className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-sm text-xs active:scale-95"
                  >
                    📥 Open Bill
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={handleOpenSplitBillFromPaymentModal} 
                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  ✂️ Split Bill
                </button>
                <button 
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={() => processPayment(false, 'paid')} 
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition-all shadow-md text-xs sm:text-sm active:scale-95 disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Memproses...' : '💸 Bayar Lunas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={closeReceipt}
        >
          <div 
            className="bg-white text-black p-6 rounded-2xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto pr-2">
              <div id="printable-receipt" className="font-mono text-sm leading-tight p-2 relative">
                {receiptData.isDraft && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <span className="text-6xl font-black rotate-[-45deg] tracking-widest uppercase">DRAFT</span>
                  </div>
                )}
                <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                  <h2 className="text-xl font-bold uppercase">{receiptData.isDraft ? 'PREVIEW DRAFT' : printMode === 'all' ? storeSettings.storeName : printMode === 'food' ? 'DAPUR - MAKANAN' : 'BAR - MINUMAN'}</h2>
                  {printMode === 'all' && (
                    <p className="text-[10px] uppercase leading-tight mt-1">{storeSettings.storeAddress}<br/>{storeSettings.storePhone ? 'Telp: ' + storeSettings.storePhone + ' | ' : ''}{receiptData.date}</p>
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
                    {printMode === 'all' && receiptData.cashTendered > 0 && receiptData.paymentMethod === 'Cash' && (
                      <>
                        <div className="flex justify-between mt-1 text-gray-600"><span>Bayar Tunai</span><span>Rp {Number(receiptData.cashTendered).toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between mt-1 text-emerald-700 font-bold"><span>Kembalian</span><span>Rp {Number(receiptData.change || 0).toLocaleString('id-ID')}</span></div>
                      </>
                    )}
                  </div>
                )}

                <div className="text-center text-[10px] mt-6 italic">
                  {receiptData.isDraft ? (
                    <p>MOHON BAYAR DI KASIR SEBELUM PULANG</p>
                  ) : printMode === 'all' ? (
                    <>
                      <div className="whitespace-pre-line">{storeSettings.receiptFooter}</div>
                      {storeSettings.enableWatermark && <p className="mt-2 text-[9px] text-gray-400">[ Aplikasi Kasir PosPoint ]</p>}
                    </>
                  ) : (
                    <p>--- BATAS PESANAN ---</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col space-y-2 border-t pt-4">
              {receiptData.isDraft && (
                <button onClick={() => { closeReceipt(); processPayment(false, 'paid'); }} className="w-full py-3 mb-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-600/20 flex justify-center items-center space-x-2 transition-transform active:scale-95">
                  <span>Bayar Lunas Sekarang</span>
                </button>
              )}
              <button onClick={() => handlePrint('all')} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center space-x-2 shadow transition-transform active:scale-95">
                <span>Cetak Semua</span>
              </button>
              <div className="flex space-x-2">
                {receiptData.items.some((i:any) => !isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('food')} className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors">Cetak Makanan</button>
                )}
                {receiptData.items.some((i:any) => isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('drink')} className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors">Cetak Minuman</button>
                )}
              </div>
              <button onClick={closeReceipt} className="w-full py-2.5 mt-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Modal */}
      {activeVariantGroup && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-10 justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setActiveVariantGroup(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-4 text-gray-900 dark:text-white text-center">Pilih Varian {activeVariantGroup.title}</h2>
            <div className="space-y-3">
              {activeVariantGroup.variants.map((v: MenuItem) => (
                <button
                  key={v.id}
                  onClick={() => { addToCart(v); setActiveVariantGroup(null); }}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-transform active:scale-95 flex justify-between px-5 ${v.isSoldOut ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 shadow-sm'}`}
                  disabled={v.isSoldOut}
                >
                  <span>{v.nama}</span>
                  <span className="font-black">Rp {v.harga.toLocaleString('id-ID')}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setActiveVariantGroup(null)} className="w-full mt-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Batal</button>
          </div>
        </div>
      )}      <div className="flex-1 flex flex-col md:flex-row w-full print:hidden">
        
        {/* Left Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full pb-24 lg:pb-0 overflow-hidden transition-colors">
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                  SN
                </div>
                <div>
                  <h1 className="text-base md:text-lg font-black text-gray-900 dark:text-white leading-tight">
                    {storeSettings.storeName || 'SakuNota POS'}
                  </h1>
                  <span className="text-[11px] text-gray-500 font-medium line-clamp-1">
                    {storeSettings.storeAddress || 'Aplikasi Kasir Pintar UMKM'}
                  </span>
                </div>
              </div>
            <div className="flex items-center space-x-2 md:space-x-3">

            {/* Shift Indicator */}
            {activeShift ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Shift: {activeShift.operatorName}</span>
                <span className="hidden md:inline opacity-70 text-emerald-700 dark:text-emerald-400">| Laci: Rp {(currentShiftStats?.expectedCash || activeShift.startingCash || 0).toLocaleString('id-ID')}</span>
                <button 
                  onClick={() => setIsCashMovementModalOpen(true)}
                  className="ml-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  title="Catat Kas Masuk / Keluar"
                >
                  [+/- Kas]
                </button>
                <button 
                  onClick={openCloseShiftModal}
                  className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                  title="Tutup Shift Kasir"
                >
                  [Tutup]
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 shadow-sm transition-transform active:scale-95"
              >
                <span>💼 Buka Shift</span>
              </button>
            )}

              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-800">
                <button onClick={() => setView('meja')} className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all ${view === 'meja' ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>🍽️ Meja</button>
                <button onClick={() => setView('menu')} className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all ${view === 'menu' ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>☕ Menu</button>
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
              <div className="flex flex-col space-y-3 mb-4 md:mb-6">
                <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setActiveCategory(cat)} 
                      className={`px-4 py-2 rounded-full whitespace-nowrap text-xs md:text-sm font-bold border transition-all ${
                        activeCategory === cat 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="Cari menu..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors shadow-sm" 
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {filteredMenu.map(item => {
                  const hasModifiers = item.modifiers && item.modifiers.length > 0;
                  const isSoldOut = item.isSoldOut;

                  return (
                    <button 
                      key={item.id} 
                      disabled={isSoldOut}
                      onClick={() => {
                        if (isSoldOut) return;
                        if (item.isGroup) {
                          setActiveVariantGroup({ title: item.nama, variants: item.variants });
                        } else if (hasModifiers) {
                          openModifierModal(item);
                        } else {
                          addToCart(item);
                        }
                      }} 
                      className={`bg-white dark:bg-gray-800 p-3.5 md:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 md:h-36 relative ${
                        isSoldOut 
                          ? 'opacity-60 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed' 
                          : 'border-gray-200/90 dark:border-gray-700 hover:border-emerald-500 hover:shadow-md active:scale-[0.98]'
                      }`}
                    >
                      {isSoldOut ? (
                        <span className="absolute top-2.5 right-2.5 text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                          Habis
                        </span>
                      ) : item.isGroup ? (
                        <span className="absolute top-2.5 right-2.5 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          Varian
                        </span>
                      ) : hasModifiers ? (
                        <span className="absolute top-2.5 right-2.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
                          + Pilihan
                        </span>
                      ) : null}

                      <div>
                        <h3 className="font-bold line-clamp-2 leading-tight text-sm md:text-base text-gray-900 dark:text-white">
                          {item.nama}
                        </h3>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block font-medium">
                          {item.kategori}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                        <p className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm md:text-base">
                          Rp {item.harga.toLocaleString('id-ID')}
                        </p>
                        {!isSoldOut && (
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
                            +
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Floating Cart Button (Mobile - GoFood / Grab Style) */}
        {(!isMobileCartOpen && (cart.length > 0 || selectedTable)) && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30">
            <button 
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3.5 px-5 flex justify-between items-center shadow-lg active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" /></svg>
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </div>
                <div className="text-left leading-tight text-white">
                   <span className="block text-[11px] opacity-90 font-bold uppercase tracking-wider">{selectedTableObj ? `Meja ${selectedTableObj.nomor.replace(/^Meja\s*/i, '')}` : 'Tanpa Meja'}</span>
                   <span className="block font-black text-sm">Lihat Keranjang</span>
                </div>
              </div>
              <div className="font-black text-base tracking-tight bg-white/20 px-3 py-1 rounded-xl shadow-sm">
                Rp {totalPrice.toLocaleString('id-ID')} →
              </div>
            </button>
          </div>
        )}

          {/* Desktop Sidebar Cart */}
          <div className="hidden lg:flex flex-col w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40">
             {renderCartInner(false)}
          </div>

          {/* Mobile Bottom Sheet Cart (Gojek/McD Style) */}
          {isMobileCartOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileCartOpen(false)}></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] w-full animate-in slide-in-from-bottom-2 duration-300">
                
                {/* Pull Handle */}
                <div className="flex justify-center p-3 cursor-pointer absolute top-0 left-0 right-0 z-10" onClick={() => setIsMobileCartOpen(false)}>
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>

                {renderCartInner(true)}
              </div>
            </div>
          )}
        </div>

      
      {/* --- MODAL BUKA SHIFT --- */}
      {isOpenShiftModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={handleCloseOpenShift}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-2xl font-black mb-3">
              💼
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Buka Shift Kasir Baru</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-5">Mulai sesi kerja kasir dan masukkan uang kas modal awal di laci.</p>

            <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Kasir / Operator:</label>
                <input 
                  type="text" 
                  value={shiftOperatorName}
                  onChange={(e) => setShiftOperatorName(e.target.value)}
                  placeholder="Contoh: Kasir Budi"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Modal Awal Laci Kas (Rp):</label>
                <input 
                  type="number" 
                  value={shiftStartingCash}
                  onChange={(e) => setShiftStartingCash(e.target.value)}
                  placeholder="200000"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-lg font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 outline-none focus:border-emerald-500"
                  required
                />
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {[100000, 200000, 500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setShiftStartingCash(amt.toString())}
                      className="py-1 px-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-semibold transition-colors"
                    >
                      {amt / 1000}rb
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleCloseOpenShift}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Mulai Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CASH IN / CASH OUT --- */}
      {isCashMovementModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={handleCloseCashMovement}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Catat Arus Kas Laci</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Catat pengeluaran operasional toko atau penambahan modal kas kecil.</p>

            <form onSubmit={handleCashMovementSubmit} className="space-y-4">
              <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setCashMovementType('out')}
                  className={'flex-1 py-2 rounded-lg text-xs font-bold transition-all ' + (cashMovementType === 'out' ? 'bg-rose-600 text-white shadow' : 'text-gray-600 dark:text-gray-300')}
                >
                  🔴 Kas Keluar (Biaya)
                </button>
                <button
                  type="button"
                  onClick={() => setCashMovementType('in')}
                  className={'flex-1 py-2 rounded-lg text-xs font-bold transition-all ' + (cashMovementType === 'in' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 dark:text-gray-300')}
                >
                  🟢 Kas Masuk (+)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nominal (Rp):</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={cashMovementAmount}
                  onChange={(e) => setCashMovementAmount(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-lg font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Alasan / Keperluan:</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Beli Es Batu / Beli Gas"
                  value={cashMovementReason}
                  onChange={(e) => setCashMovementReason(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleCloseCashMovement}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL TUTUP SHIFT (BLIND CLOSE) --- */}
      {isCloseShiftModalOpen && currentShiftStats && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleCloseCloseShift}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl my-8 border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-2xl font-black">
                📊
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Tutup Shift Kasir (Z-Report)</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Operator: <strong>{currentShiftStats.operatorName}</strong></p>
              </div>
            </div>

            {/* Petunjuk Blind Close */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 mb-5">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">🔒 Prosedur Blind Close:</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Silakan hitung seluruh uang fisik (kertas & koin) yang ada di laci kasir saat ini. Angka sistem sengaja disembunyikan agar hasil penghitungan murni objektif.
              </p>
            </div>
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Hitung & Masukkan Uang Fisik di Laci (Rp):
                </label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0"
                  value={countedPhysicalCash}
                  onChange={(e) => setCountedPhysicalCash(e.target.value)}
                  className="w-full border-2 border-emerald-500 rounded-xl p-3 text-2xl font-black text-gray-900 dark:text-white bg-white dark:bg-gray-900 outline-none"
                  required
                />
              </div>

              {countedPhysicalCash !== "" && (
                <div className="p-3 rounded-xl border flex justify-between items-center text-xs font-bold" style={{
                  backgroundColor: Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '#ecfdf5' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? '#fef2f2' : '#eff6ff',
                  borderColor: Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '#a7f3d0' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? '#fecaca' : '#bfdbfe',
                }}>
                  <span>Status Selisih Kas:</span>
                  <span className="text-sm font-black" style={{
                    color: Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '#065f46' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? '#991b1b' : '#1e40af',
                  }}>
                    {Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '✓ COCOK / PAS (Rp 0)' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? 'KURANG (-Rp ' + (currentShiftStats.expectedCash - Number(countedPhysicalCash)).toLocaleString('id-ID') + ')' : 'LEBIH (+Rp ' + (Number(countedPhysicalCash) - currentShiftStats.expectedCash).toLocaleString('id-ID') + ')'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Catatan Penutupan (Opsional):</label>
                <input 
                  type="text" 
                  placeholder="Misal: Uang fisik pas, diserahkan ke Pak Bos"
                  value={closingShiftNotes}
                  onChange={(e) => setClosingShiftNotes(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-900 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleCloseCloseShift}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Tutup & Cetak Struk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pilihan Modifier & Add-on Menu (GrabFood Style Bottom Sheet) */}
      {activeModItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setActiveModItem(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 relative flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex justify-between items-start pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">Pilihan Menu</span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{activeModItem.nama}</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                  Harga Dasar: Rp {activeModItem.harga.toLocaleString('id-ID')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Daftar Kelompok Modifier */}
            <div className="mt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {(activeModItem.modifiers || []).map((group: any) => {
                const selected = selectedModOptions[group.id] || [];
                const isSingle = group.maxSelect === 1;

                return (
                  <div key={group.id} className="bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                        {group.nama}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        group.minSelect >= 1 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' 
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {group.minSelect >= 1 ? (isSingle ? 'Wajib (Pilih 1)' : `Wajib (Min ${group.minSelect})`) : 'Opsional'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {group.options.map((opt: any) => {
                        const isChecked = selected.some((o: any) => o.id === opt.id);

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleModOption(group, opt)}
                            className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                              isChecked
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold shadow-sm'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-4 h-4 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center text-[10px] ${
                                isChecked ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isChecked ? (isSingle ? '●' : '✓') : ''}
                              </span>
                              <span className="text-xs">{opt.nama}</span>
                            </div>
                            {opt.harga > 0 ? (
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                +Rp {opt.harga.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Gratis</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Bar Total & Action */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Subtotal Item</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  Rp {(
                    activeModItem.harga +
                    Object.values(selectedModOptions).flat().reduce((sum: number, opt: any) => sum + (opt.harga || 0), 0)
                  ).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModItem(null)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModifiers}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-transform active:scale-95"
                >
                  + Tambahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hasil Blind Close Shift (Z-Report Audit) */}
      {blindCloseResult && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setBlindCloseResult(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-700">
              <span className="text-4xl">🏁</span>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mt-2">Laporan Tutup Shift (Z-Report)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Shift #{blindCloseResult.id} • Operator: <span className="font-bold text-gray-800 dark:text-gray-200">{blindCloseResult.operatorName}</span></p>
            </div>

            {/* Status Rekonsiliasi Banner */}
            <div className={`mt-4 p-4 rounded-2xl text-center border ${
              blindCloseResult.cashDifference === 0 || blindCloseResult.difference === 0 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                : (blindCloseResult.cashDifference || blindCloseResult.difference || 0) > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300'
            }`}>
              <p className="text-[11px] font-bold uppercase tracking-wider">Hasil Rekonsiliasi Kas Fisik</p>
              <p className="text-xl font-black mt-1">
                {(blindCloseResult.cashDifference === 0 || blindCloseResult.difference === 0) && '🟢 COCOK / PAS (Rp 0)'}
                {(blindCloseResult.cashDifference || blindCloseResult.difference || 0) > 0 && `🟡 LEBIH (+Rp ${(blindCloseResult.cashDifference || blindCloseResult.difference).toLocaleString('id-ID')})`}
                {(blindCloseResult.cashDifference || blindCloseResult.difference || 0) < 0 && `🔴 KURANG (-Rp ${Math.abs(blindCloseResult.cashDifference || blindCloseResult.difference).toLocaleString('id-ID')})`}
              </p>
            </div>

            {/* Rincian Finansial Kas Fisik Laci */}
            <div className="mt-4 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Modal Awal Kas:</span>
                <span className="font-bold">Rp {blindCloseResult.startingCash?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                <span>+ Penjualan Tunai Bersih:</span>
                <span>Rp {blindCloseResult.cashSales?.toLocaleString('id-ID')}</span>
              </div>
              {blindCloseResult.cashIn > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>+ Kas Masuk Manual:</span>
                  <span>Rp {blindCloseResult.cashIn?.toLocaleString('id-ID')}</span>
                </div>
              )}
              {blindCloseResult.cashOut > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>- Kas Keluar (Biaya Operasional):</span>
                  <span>-Rp {blindCloseResult.cashOut?.toLocaleString('id-ID')}</span>
                </div>
              )}
              {blindCloseResult.cashRefunds > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>- Refund Tunai Pelanggan:</span>
                  <span>-Rp {blindCloseResult.cashRefunds?.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-800 dark:text-gray-200">
                <span>Total Kas Fisik Seharusnya:</span>
                <span className="font-black text-sm">Rp {blindCloseResult.expectedCash?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                <span>Hasil Hitung Fisik Kasir:</span>
                <span className="font-black text-sm">Rp {blindCloseResult.actualCash?.toLocaleString('id-ID')}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700 flex justify-between font-black text-sm">
                <span>Selisih:</span>
                <span className={(blindCloseResult.cashDifference || blindCloseResult.difference || 0) === 0 ? 'text-emerald-600' : (blindCloseResult.cashDifference || blindCloseResult.difference || 0) > 0 ? 'text-amber-600' : 'text-rose-600'}>
                  Rp {(blindCloseResult.cashDifference !== undefined ? blindCloseResult.cashDifference : blindCloseResult.difference)?.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Info Non-Tunai (Rekonsiliasi Bank/QRIS) */}
            <div className="mt-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
              <div className="flex justify-between text-emerald-900 dark:text-emerald-300 font-bold">
                <span>Penjualan Non-Tunai (QRIS/Transfer):</span>
                <span>Rp {blindCloseResult.nonCashSales?.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                ℹ️ Penjualan QRIS & transfer langsung masuk ke rekening bank/merchant QRIS, tidak dihitung sebagai uang fisik di laci kasir.
              </p>
            </div>

            {blindCloseResult.notes && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl">
                <span className="font-bold">Catatan:</span> {blindCloseResult.notes}
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const zReceiptText = generateZReportReceipt(blindCloseResult, storeSettings);
                    printReceiptText(zReceiptText, 'Z_Report_Tutup_Shift');
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <span>🖨️ Cetak Z-Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBlindCloseResult(null)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Selesai & Tutup
                </button>
              </div>
              <button
                type="button"
                onClick={handleExportBackupFromPos}
                className="w-full py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>💾 Cadangkan Data Kasir (Unduh JSON)</span>
              </button>
              {backupSuccessNotice && (
                <p className="text-[11px] font-bold text-center text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  ✓ {backupSuccessNotice}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPLIT BILL & PEMBAYARAN PARSIAL */}
      {isSplitBillModalOpen && splitBillTargetOrder && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleCloseSplitBill}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-5 md:p-7 max-w-xl w-full shadow-2xl border border-gray-200 dark:border-gray-700 my-0 sm:my-6 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />
            
            {/* Header Modal */}
            <div className="flex justify-between items-start pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">Sistem Pembayaran Fleksibel</span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>✂️ Split Bill & Cicil Tagihan</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Nota #A-{splitBillTargetOrder.id} • {splitBillTargetOrder.tableName || (splitBillTargetOrder.tableId ? 'Meja ' + splitBillTargetOrder.tableId : splitBillTargetOrder.orderType)} • Tamu: <span className="font-bold text-gray-800 dark:text-gray-200">{splitBillTargetOrder.customerName || 'Tamu'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSplitBill}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pt-3">
              
              {/* Metric Card: Real-time Balances */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-bold">Total Nota</span>
                  <span className="text-xs md:text-sm font-black text-gray-800 dark:text-gray-100">
                    Rp {splitBillTargetOrder.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Sudah Terbayar</span>
                  <span className="text-xs md:text-sm font-black text-emerald-600 dark:text-emerald-400">
                    Rp {(splitBillTargetOrder.paidAmount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-amber-100/60 dark:bg-amber-950/40 rounded-xl py-1 px-1 border border-amber-300 dark:border-amber-800">
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 block font-bold uppercase">Sisa Tagihan</span>
                  <span className="text-xs md:text-sm font-black text-amber-700 dark:text-amber-400">
                    Rp {(splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Tab Selector 3 Metode Split */}
              <div className="flex rounded-2xl bg-gray-100 dark:bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setSplitTab('item')}
                  className={'flex-1 py-2 rounded-xl text-xs font-bold transition-all ' + (splitTab === 'item' ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}
                >
                  🍱 Split per Menu
                </button>
                <button
                  type="button"
                  onClick={() => setSplitTab('equal')}
                  className={'flex-1 py-2 rounded-xl text-xs font-bold transition-all ' + (splitTab === 'equal' ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}
                >
                  👥 Bagi Rata
                </button>
                <button
                  type="button"
                  onClick={() => setSplitTab('partial')}
                  className={'flex-1 py-2 rounded-xl text-xs font-bold transition-all ' + (splitTab === 'partial' ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}
                >
                  💵 Cicil / Parsial
                </button>
              </div>

              {/* TAB 1: SPLIT PER MENU */}
              {splitTab === 'item' && (
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Pilih menu yang ingin dibayar pelanggan saat ini:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(splitBillTargetOrder.items || []).map((item: any) => {
                      const totalQty = item.qty || 1;
                      const paidQty = item.paidQty || 0;
                      const unpaidQty = Math.max(0, totalQty - paidQty);
                      const selectedQty = splitSelectedItems[item.id] || 0;
                      const isFullyPaid = unpaidQty === 0;

                      return (
                        <div key={item.id} className={'flex justify-between items-center p-2 rounded-xl border text-xs ' + (isFullyPaid ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60 border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700')}>
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-gray-800 dark:text-gray-200 block">{item.namaMenu || item.nama}</span>
                            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                              <div className="text-[10px] text-gray-400">
                                {item.selectedModifiers.map((m: any) => m.optionName).join(', ')}
                              </div>
                            )}
                            <div className="text-[11px] text-yellow-600 dark:text-yellow-500 font-bold">
                              Rp {(item.hargaSatuan || item.harga).toLocaleString('id-ID')}
                              <span className="text-gray-400 font-normal ml-2">({paidQty}/{totalQty} lunas)</span>
                            </div>
                          </div>

                          {isFullyPaid ? (
                            <span className="text-[10px] font-bold text-green-700 bg-green-50 dark:bg-green-950/60 px-2 py-1 rounded-lg">
                              ✓ Lunas
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={() => setSplitSelectedItems(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                className="w-6 h-6 rounded bg-white dark:bg-gray-800 font-black text-gray-700 dark:text-gray-200"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-black text-xs">{selectedQty}</span>
                              <button
                                type="button"
                                onClick={() => setSplitSelectedItems(prev => ({ ...prev, [item.id]: Math.min(unpaidQty, (prev[item.id] || 0) + 1) }))}
                                className="w-6 h-6 rounded bg-amber-500 font-black text-white"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs font-bold">
                    <span>Estimasi Subtotal Pilihan:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-black text-sm">
                      Rp {calculateSplitItemTotal().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: BAGI RATA (SPLIT EQUALLY) */}
              {splitTab === 'equal' && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Bagi rata untuk:</span>
                    <div className="flex gap-1.5">
                      {[2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSplitNumPeople(n)}
                          className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' + (splitNumPeople === n ? 'bg-amber-500 text-white shadow' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700')}
                        >
                          {n} Orang
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kalkulasi Per Orang dengan Pembulatan Presisi */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5 text-xs">
                    {Array.from({ length: splitNumPeople }).map((_, idx) => {
                      const rem = (splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total);
                      const baseShare = Math.floor(rem / splitNumPeople);
                      const mod = rem % splitNumPeople;
                      const share = idx === 0 ? baseShare + mod : baseShare;

                      return (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            👤 Bagian Orang #{idx + 1} {idx === 0 && mod > 0 && <span className="text-[10px] text-gray-400">(+sisa pembulatan)</span>}:
                          </span>
                          <span className="font-black text-amber-600 dark:text-amber-400">
                            Rp {share.toLocaleString('id-ID')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                    ℹ️ Pembayaran ini akan melunasi <b>Bagian Orang #1</b> sebesar <b>Rp {(Math.floor((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) / splitNumPeople) + ((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) % splitNumPeople)).toLocaleString('id-ID')}</b>.
                  </p>
                </div>
              )}

              {/* TAB 3: CICIL / PARSIAL BEBAS */}
              {splitTab === 'partial' && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Masukkan nominal yang ingin dibayar saat ini (Rp):
                  </label>
                  <input
                    type="number"
                    value={splitCustomAmount}
                    onChange={(e) => setSplitCustomAmount(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-lg font-black text-gray-900 dark:text-white outline-none focus:border-amber-500"
                    placeholder="Contoh: 50000"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {[20000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSplitCustomAmount(amt.toString())}
                        className="py-1 px-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                      >
                        {amt / 1000}rb
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSplitCustomAmount((splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total).toString())}
                      className="py-1 px-2 text-xs bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg font-bold text-amber-700 dark:text-amber-400"
                    >
                      Sisa Tagihan
                    </button>
                  </div>
                </div>
              )}

              {/* METODE PEMBAYARAN & UANG DITERIMA */}
              <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Metode Pembayaran untuk Split Ini:</span>
                <div className="grid grid-cols-3 gap-2">
                  {["Cash", "QRIS", "Transfer"].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitPaymentMethod(m)}
                      className={'py-2 rounded-xl text-xs font-bold transition-all border ' + (splitPaymentMethod === m ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {splitPaymentMethod === 'Cash' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Uang Tunai Diterima Kasir (Rp):</label>
                      <button
                        type="button"
                        onClick={() => {
                          const amt = splitTab === 'item' ? calculateSplitItemTotal() :
                                      splitTab === 'equal' ? (Math.floor((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) / splitNumPeople) + ((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) % splitNumPeople)) :
                                      Number(splitCustomAmount) || 0;
                          setSplitCashTendered(amt.toString());
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        Uang Pas
                      </button>
                    </div>
                    <input
                      type="number"
                      value={splitCashTendered}
                      onChange={(e) => setSplitCashTendered(e.target.value)}
                      placeholder="Nominal uang kertas yang diserahkan"
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-base font-black text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Upload Bukti Pembayaran Split QRIS / Transfer */}
                {(splitPaymentMethod === 'QRIS' || splitPaymentMethod === 'Transfer') && (
                  <PaymentProofUpload
                    proof={splitProof}
                    onChange={setSplitProof}
                    paymentMethod={splitPaymentMethod}
                  />
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Catatan Tambahan (Opsional):</label>
                  <input
                    type="text"
                    value={splitNotes}
                    onChange={(e) => setSplitNotes(e.target.value)}
                    placeholder="Contoh: Dibayar oleh Mas Budi"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              {/* RIWAYAT PEMBAYARAN PARSIAL NOTA INI */}
              {splitBillTargetOrder.payments && splitBillTargetOrder.payments.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 block mb-2">
                    📋 Riwayat Cicilan / Pembayaran Sebelumnya ({splitBillTargetOrder.payments.length}):
                  </span>
                  <div className="space-y-2">
                    {splitBillTargetOrder.payments.map((p: any, pIdx: number) => {
                      const isRef = p.status === 'refunded';
                      return (
                        <div key={p.id || pIdx} className={'p-2.5 rounded-xl border text-xs flex justify-between items-center ' + (isRef ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700')}>
                          <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              #{pIdx + 1} • {p.paymentMethod} • Rp {p.amount.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              {p.paidAt ? new Date(p.paidAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} • {p.splitType} • {p.operatorName}
                            </span>
                            {isRef && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                                [REFUNDED: {p.refundReason || 'Dibatalkan'}]
                              </span>
                            )}
                          </div>
                          {!isRef && (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const partialText = generatePartialPaymentReceipt(splitBillTargetOrder, p, storeSettings);
                                  printReceiptText(partialText, 'Bukti_Bayar_Parsial');
                                }}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-[10px] font-bold"
                              >
                                🖨️ Struk
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestRefundPayment(p)}
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-[10px] font-bold border border-rose-200 dark:border-rose-800"
                              >
                                ❌ Refund
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex space-x-2">
              <button
                type="button"
                onClick={handleCloseSplitBill}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleExecuteSplitPayment}
                disabled={isSplitProcessing}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSplitProcessing ? 'Memproses...' : '💰 Proses Pembayaran Split'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL OTORISASI REFUND PEMBAYARAN PARSIAL */}
      {isRefundModalOpen && refundTargetPayment && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => { setIsRefundModalOpen(false); setRefundTargetPayment(null); }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mb-2">Konfirmasi Refund Pembayaran</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Anda akan mengembalikan dana sebesar <b>Rp {refundTargetPayment.amount.toLocaleString('id-ID')}</b> ({refundTargetPayment.paymentMethod}) kepada pelanggan. Sisa tagihan meja akan bertambah kembali.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Alasan Refund:</label>
                <input
                  type="text"
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder="Misal: Pelanggan salah nominal / batal menu"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-rose-500"
                />
              </div>

              {storeSettings.enablePin && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">PIN Otorisasi Admin:</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={refundPinInput}
                    onChange={(e) => setRefundPinInput(e.target.value)}
                    placeholder="Masukkan 4-6 digit PIN"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-center text-lg font-black tracking-widest text-gray-900 dark:text-white outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => { setIsRefundModalOpen(false); setRefundTargetPayment(null); }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRefundPayment}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
              >
                Konfirmasi Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Diskon */}
      {isDiscountModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={handleCloseDiscountModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Beri Diskon / Promo</h3>
            
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-4">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ' + (discountType === 'percent' ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                Persen (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('nominal')}
                className={'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ' + (discountType === 'nominal' ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                Nominal (Rp)
              </button>
            </div>

            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
              {discountType === 'percent' ? 'Masukkan Persen Diskon:' : 'Masukkan Nominal Diskon (Rp):'}
            </label>
            <input 
              type="number"
              placeholder={discountType === 'percent' ? 'Contoh: 10' : 'Contoh: 10000'}
              value={tempDiscountVal}
              onChange={(e) => setTempDiscountVal(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-lg font-black text-gray-900 dark:text-white mb-4 outline-none focus:border-emerald-500"
            />

            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={handleCloseDiscountModal}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => {
                  const enteredVal = Number(tempDiscountVal) || 0;
                  if (discountType === 'percent') {
                    if (enteredVal < 0 || enteredVal > 100) {
                      alert("Persentase diskon harus di antara 0% sampai 100%");
                      return;
                    }
                    setDiscountValue(enteredVal);
                  } else {
                    if (enteredVal < 0) {
                      alert("Diskon tidak boleh bernilai negatif");
                      return;
                    }
                    if (enteredVal > rawSubtotal) {
                      alert("Diskon nominal (Rp " + enteredVal.toLocaleString('id-ID') + ") melebihi subtotal. Diskon dibatasi maksimal Rp " + rawSubtotal.toLocaleString('id-ID') + " agar total tidak minus.");
                      setDiscountValue(rawSubtotal);
                    } else {
                      setDiscountValue(enteredVal);
                    }
                  }
                  setIsDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DIALOG PERINGATAN UNSAVED CHANGES --- */}
      {unsavedConfirm?.isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setUnsavedConfirm(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              {unsavedConfirm.title || "Perubahan Belum Disimpan"}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              {unsavedConfirm.message || "Input yang Anda ketik belum disimpan. Yakin ingin membatalkan?"}
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setUnsavedConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
              >
                Lanjut Mengisi
              </button>
              <button
                type="button"
                onClick={() => {
                  const cb = unsavedConfirm.onDiscard;
                  setUnsavedConfirm(null);
                  cb();
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95"
              >
                Buang Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Wizard Toko Baru */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onComplete={async () => {
          setIsOnboardingOpen(false);
          await loadData();
          await refreshShiftData();
        }}
        currentSettings={storeSettings}
      />

    </div>
    </>
  );
}
