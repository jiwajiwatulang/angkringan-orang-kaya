"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { getStoreSettings, loadStoreSettingsAsync, subscribeStoreSettings, StoreSettings, isTableManagementEnabled } from '@/lib/settings';
import { getMenus, getTables, getOrders, getActiveShift, getShiftLiveStats, openShift, closeShift, addCashMovement, recordPayment, refundPartialPayment, getOrderPayments, exportAllData, clearTable } from '@/lib/api';
import { 
  generateEscPosReceipt, 
  generatePartialPaymentReceipt, 
  generateReceiptHtml, 
  generateZReportReceipt, 
  generateZReportHtml, 
  executePrintDocument 
} from '@/lib/receipt';
import PaymentProofUpload from '@/components/PaymentProofUpload';
import OnboardingWizard from '@/components/OnboardingWizard';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileHomeScreen from '@/components/mobile/MobileHomeScreen';
import MobileCatalogScreen from '@/components/mobile/MobileCatalogScreen';
import MobileTableScreen from '@/components/mobile/MobileTableScreen';
import MobileOrdersScreen from '@/components/mobile/MobileOrdersScreen';
import MobileMoreScreen from '@/components/mobile/MobileMoreScreen';
import MobileBottomNav, { MobileTab } from '@/components/mobile/MobileBottomNav';
import MobileFloatingCartBar from '@/components/mobile/MobileFloatingCartBar';
import { checkCashierAccess, CashierAccessStatus } from '@/lib/licenseGuard';
import { activateLicenseServer } from '@/lib/ordersClient';

type MenuItem = { id: number; nama: string; harga: number; kategori: string; isGroup?: boolean; variants?: MenuItem[]; isSoldOut?: boolean; modifiers?: any[]; };
type CartItem = MenuItem & { qty: number; selectedModifiers?: { groupName: string; optionName: string; harga: number }[]; itemKey?: string };

export default function POSPage() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [view, setView] = useState<'meja' | 'menu'>('meja');
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // --- CLOSED BETA & LICENSE GUARD STATES ---
  const [accessStatus, setAccessStatus] = useState<CashierAccessStatus>({
    isValid: true,
    isDemo: false,
    status: 'trial_active',
  });
  const [isAccessChecking, setIsAccessChecking] = useState(true);
  const [activationInputKey, setActivationInputKey] = useState("");
  const [activationNotice, setActivationNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isActivatingKey, setIsActivatingKey] = useState(false);

  const handleActivateFromGate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activationInputKey.trim()) return;
    setIsActivatingKey(true);
    setActivationNotice(null);
    try {
      const res = await activateLicenseServer(
        activationInputKey.trim(),
        typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'HP Kasir' : 'Desktop Kasir'
      );
      if (res.success) {
        setActivationNotice({ type: 'success', message: 'Aktivasi berhasil! Memuat kasir...' });
        const refreshed = await checkCashierAccess(true);
        setAccessStatus(refreshed);
      } else {
        setActivationNotice({ type: 'error', message: res.error || 'Aktivasi gagal. Periksa nomor lisensi Anda.' });
      }
    } catch (err: any) {
      setActivationNotice({ type: 'error', message: err.message || 'Terjadi kesalahan aktivasi.' });
    } finally {
      setIsActivatingKey(false);
    }
  };

  const handleStartDemo = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('sakunota_demo_mode', 'true');
        const url = new URL(window.location.href);
        url.searchParams.set('demo', 'true');
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
    }
    setAccessStatus({
      isValid: true,
      isDemo: true,
      status: 'trial_active',
      businessName: 'Demo Warung SakuNota',
      daysRemaining: 7,
      hoursRemaining: 168,
    });
    setIsLoading(true);
    loadData();
  };

  const handleExitDemo = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('sakunota_demo_mode');
        const url = new URL(window.location.href);
        url.searchParams.delete('demo');
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
      window.location.href = '/';
    }
  };

  // --- ATOMIC MODAL & HISTORY MANAGER ---
  const isProgrammaticPopRef = useRef<boolean>(false);
  const modDirtyRef = useRef<boolean>(false);

  const pushModalHistory = (name: string) => {
    if (typeof window !== "undefined") {
      try {
        window.history.pushState({ sakunotaModal: name }, "");
      } catch (_) {}
    }
  };

  const popModalHistory = () => {
    if (typeof window !== "undefined" && window.history.state?.sakunotaModal) {
      isProgrammaticPopRef.current = true;
      try {
        window.history.back();
      } catch (_) {}
    }
  };

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [cartSheetDragY, setCartSheetDragY] = useState(0);
  const cartSheetTouchStartRef = useRef<number | null>(null);

  const handleCartTouchStart = (e: React.TouchEvent) => {
    cartSheetTouchStartRef.current = e.touches[0].clientY;
  };

  const handleCartTouchMove = (e: React.TouchEvent) => {
    if (cartSheetTouchStartRef.current === null) return;
    const deltaY = e.touches[0].clientY - cartSheetTouchStartRef.current;
    if (deltaY > 0) {
      setCartSheetDragY(deltaY);
    } else {
      setCartSheetDragY(0);
    }
  };

  const handleCartTouchEnd = () => {
    if (cartSheetDragY > 70) {
      closeMobileCart();
    }
    setCartSheetDragY(0);
    cartSheetTouchStartRef.current = null;
  };

  const openMobileCart = () => {
    setIsMobileCartOpen(true);
    setCartSheetDragY(0);
    pushModalHistory("cart");
  };

  const closeMobileCart = () => {
    setIsMobileCartOpen(false);
    setCartSheetDragY(0);
    popModalHistory();
  };

  // Modifier Bottom Sheet Drag State
  const [modSheetDragY, setModSheetDragY] = useState(0);
  const modSheetTouchStartRef = useRef<number | null>(null);

  const handleModTouchStart = (e: React.TouchEvent) => {
    modSheetTouchStartRef.current = e.touches[0].clientY;
  };

  const handleModTouchMove = (e: React.TouchEvent) => {
    if (modSheetTouchStartRef.current === null) return;
    const diff = e.touches[0].clientY - modSheetTouchStartRef.current;
    if (diff > 0) setModSheetDragY(diff);
    else setModSheetDragY(0);
  };

  const handleModTouchEnd = () => {
    if (modSheetDragY > 70) {
      handleCloseModifiers();
    }
    setModSheetDragY(0);
    modSheetTouchStartRef.current = null;
  };

  // Payment Bottom Sheet Drag State
  const [paymentSheetDragY, setPaymentSheetDragY] = useState(0);
  const paymentSheetTouchStartRef = useRef<number | null>(null);

  const handlePaymentTouchStart = (e: React.TouchEvent) => {
    paymentSheetTouchStartRef.current = e.touches[0].clientY;
  };

  const handlePaymentTouchMove = (e: React.TouchEvent) => {
    if (paymentSheetTouchStartRef.current === null) return;
    const diff = e.touches[0].clientY - paymentSheetTouchStartRef.current;
    if (diff > 0) setPaymentSheetDragY(diff);
    else setPaymentSheetDragY(0);
  };

  const handlePaymentTouchEnd = () => {
    if (paymentSheetDragY > 70) {
      handleClosePaymentModal();
    }
    setPaymentSheetDragY(0);
    paymentSheetTouchStartRef.current = null;
  };

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [oldCart, setOldCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuPage, setMenuPage] = useState<number>(1);
  const [modItemNotes, setModItemNotes] = useState<string>("");

  useEffect(() => {
    setMenuPage(1);
  }, [searchQuery, activeCategory]);

  const getCategoryIcon = (category: string, name?: string) => {
    const c = (category || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (c.includes('minum') || n.includes('teh') || n.includes('kopi') || n.includes('jeruk') || n.includes('wedang') || n.includes('susu') || n.includes('es ') || n.includes('lemon')) return '🥤';
    if (c.includes('nasi') || n.includes('nasi') || n.includes('ayam') || n.includes('bebek') || n.includes('mie') || n.includes('soto') || n.includes('bakso')) return '🍚';
    if (c.includes('sate') || n.includes('sate') || n.includes('sunduk')) return '🍢';
    if (c.includes('snack') || c.includes('gorengan') || n.includes('mendoan') || n.includes('tahu') || n.includes('tempe') || n.includes('pisang') || n.includes('bakwan')) return '🥟';
    if (c.includes('roti') || n.includes('roti') || n.includes('bakar')) return '🍞';
    return '🍽️';
  };

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
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('view=menu') || window.location.search.includes('tab=menu')) {
        setView('menu');
        setMobileTab('menu');
      } else if (window.location.search.includes('tab=meja') || window.location.search.includes('view=meja')) {
        setView('meja');
        setMobileTab('meja');
      } else if (window.location.search.includes('tab=nota')) {
        setMobileTab('nota');
      } else if (window.location.search.includes('tab=lainnya')) {
        setMobileTab('lainnya');
      } else if (window.location.search.includes('tab=home')) {
        setMobileTab('home');
      }
    }
  }, []);

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
          popModalHistory();
        }
      });
    } else {
      setIsSplitBillModalOpen(false);
      popModalHistory();
    }
  };

  const openPaymentModal = () => {
    setIsMobileCartOpen(false);
    setIsPaymentModalOpen(true);
    setPaymentSheetDragY(0);
    pushModalHistory("payment");
  };

  const handleClosePaymentModal = () => {
    const isDirty = customerName.trim() !== "" || 
      notes.trim() !== "" || 
      (cashTendered.trim() !== "" && cashTendered !== "0") ||
      checkoutProof !== null;
    if (isDirty) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Pembayaran?",
        message: "Data pelanggan, uang diterima, atau bukti pembayaran belum diproses. Yakin ingin membatalkan?",
        onDiscard: () => {
          setIsPaymentModalOpen(false);
          setPaymentSheetDragY(0);
          popModalHistory();
        }
      });
    } else {
      setIsPaymentModalOpen(false);
      setPaymentSheetDragY(0);
      popModalHistory();
    }
  };

  const handleCloseModifiers = () => {
    const totalSelected = Object.values(selectedModOptions).flat().length;
    const hasCustomSelection = modDirtyRef.current || (totalSelected > 0 && Object.values(selectedModOptions).flat().some(o => (o.harga || 0) > 0 || totalSelected > 1));
    if (hasCustomSelection) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Batalkan Pilihan Varian?",
        message: "Pilihan topping / varian menu yang sudah Anda pilih belum ditambahkan ke keranjang. Yakin ingin membatalkan?",
        onDiscard: () => {
          modDirtyRef.current = false;
          setActiveModItem(null);
          setSelectedModOptions({});
          setModSheetDragY(0);
          popModalHistory();
        }
      });
    } else {
      modDirtyRef.current = false;
      setActiveModItem(null);
      setSelectedModOptions({});
      setModSheetDragY(0);
      popModalHistory();
    }
  };

  const handleReleaseTable = async () => {
    const tableObj = tableData.find(t => t.id.toString() === selectedTable);
    const tStatus = tableObj ? getTableStatus(tableObj) : null;

    if (tStatus === 'lunas') {
      await handleClearTable(parseInt(selectedTable));
      setIsMobileCartOpen(false);
      return;
    }

    if (cart.length > 0) {
      setUnsavedConfirm({
        isOpen: true,
        title: "Lepas Meja & Kosongkan Keranjang?",
        message: `Ada ${cart.length} item di dalam keranjang yang belum dipesan. Yakin ingin mengosongkan keranjang dan melepas meja?`,
        onDiscard: () => {
          resetCart();
          setCustomerName("");
          setSelectedTable("");
          setIsMobileCartOpen(false);
        }
      });
    } else {
      resetCart();
      setCustomerName("");
      setSelectedTable("");
      setIsMobileCartOpen(false);
    }
  };

  // Android Hardware Back button listener: closes active modal or bottom-sheet before exiting
  useEffect(() => {
    let removeListener: any = null;
    try {
      if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
        App.addListener('backButton', ({ canGoBack }) => {
          if (unsavedConfirm?.isOpen) {
            setUnsavedConfirm(null);
          } else if (receiptData) {
            closeReceipt();
          } else if (blindCloseResult) {
            setBlindCloseResult(null);
          } else if (isSplitBillModalOpen) {
            handleCloseSplitBill();
          } else if (isPaymentModalOpen) {
            handleClosePaymentModal();
          } else if (activeModItem) {
            handleCloseModifiers();
          } else if (activeVariantGroup) {
            setActiveVariantGroup(null);
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
          } else if (isMobileCartOpen) {
            closeMobileCart();
          } else if (view === 'menu' && selectedTable) {
            setView('meja');
          } else if (canGoBack) {
            window.history.back();
          }
        }).then(handle => {
          removeListener = handle;
        }).catch(() => {});
      }

      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (unsavedConfirm?.isOpen) {
            setUnsavedConfirm(null);
          } else if (receiptData) {
            closeReceipt();
          } else if (blindCloseResult) {
            setBlindCloseResult(null);
          } else if (isSplitBillModalOpen) {
            handleCloseSplitBill();
          } else if (isPaymentModalOpen) {
            handleClosePaymentModal();
          } else if (activeModItem) {
            handleCloseModifiers();
          } else if (activeVariantGroup) {
            setActiveVariantGroup(null);
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
          } else if (isMobileCartOpen) {
            closeMobileCart();
          } else if (isOnboardingOpen) {
            setIsOnboardingOpen(false);
          }
        }
      };
      window.addEventListener('keydown', handleEscapeKey);
      return () => {
        window.removeEventListener('keydown', handleEscapeKey);
        try {
          if (removeListener && typeof removeListener.remove === 'function') {
            removeListener.remove();
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      try {
        if (removeListener && typeof removeListener.remove === 'function') {
          removeListener.remove();
        }
      } catch (_) {}
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
    view,
    selectedTable,
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
    selectedModOptions,
  ]);

  // Web & Mobile Safari / Chrome PopState Back Navigation Guard
  useEffect(() => {
    const handlePopState = () => {
      if (isProgrammaticPopRef.current) {
        isProgrammaticPopRef.current = false;
        return;
      }

      if (unsavedConfirm?.isOpen) {
        setUnsavedConfirm(null);
      } else if (receiptData) {
        setReceiptData(null);
      } else if (blindCloseResult) {
        setBlindCloseResult(null);
      } else if (isSplitBillModalOpen) {
        handleCloseSplitBill();
      } else if (isPaymentModalOpen) {
        handleClosePaymentModal();
      } else if (activeModItem) {
        handleCloseModifiers();
      } else if (activeVariantGroup) {
        setActiveVariantGroup(null);
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
      } else if (isMobileCartOpen) {
        setIsMobileCartOpen(false);
        setCartSheetDragY(0);
      } else if (view === 'menu' && selectedTable) {
        setView('meja');
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    unsavedConfirm,
    receiptData,
    blindCloseResult,
    isSplitBillModalOpen,
    isPaymentModalOpen,
    activeModItem,
    activeVariantGroup,
    isRefundModalOpen,
    isDiscountModalOpen,
    isCashMovementModalOpen,
    isOpenShiftModalOpen,
    isCloseShiftModalOpen,
    isMobileCartOpen,
    view,
    selectedTable,
    customerName,
    notes,
    cashTendered,
    selectedModOptions,
    tempDiscountVal,
    discountValue,
    splitSelectedItems,
    splitCustomAmount,
    splitCashTendered,
  ]);

  const loadData = async () => {
    try {
      try {
        const freshSettings = await loadStoreSettingsAsync();
        setStoreSettings(freshSettings);
      } catch (_) {
        setStoreSettings(getStoreSettings());
      }
      await refreshShiftData();
      const menus = await getMenus();
      const tables = await getTables();
      const orders = await getOrders();
      
      // Group variants
      const groupedMenus: MenuItem[] = [];
      const groups: Record<string, MenuItem[]> = {};
      
      (menus || []).forEach((m: any) => {
        if (!m) return;
        if (m.nama && (m.nama.includes('(Hot)') || m.nama.includes('(Ice)'))) {
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
            id: (variants[0].id || 1) * 1000, // pseudo id
            nama: baseName,
            harga: variants[0].harga,
            kategori: variants[0].kategori,
            isGroup: true,
            variants: variants
          });
        } else if (variants[0]) {
          groupedMenus.push(variants[0]);
        }
      }

      setMenuData(groupedMenus);
      setTableData(tables || []);
      setAllOrders(orders || []);
      setActiveOrders((orders || []).filter((o: any) => o.status === 'unpaid'));
    } catch (err) {
      console.error("Gagal memuat data kasir:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("demo=true")) {
      try {
        sessionStorage.setItem("sakunota_demo_mode", "true");
      } catch (_) {}
    }
    async function initAccess() {
      setIsAccessChecking(true);
      try {
        const res = await checkCashierAccess();
        setAccessStatus(res);
      } catch (e) {
        console.error("Gagal memeriksa akses kasir:", e);
      } finally {
        setIsAccessChecking(false);
      }
    }
    initAccess();

    loadData();
    const interval = setInterval(loadData, 5000);

    const handlePop = () => {
      initAccess();
    };
    window.addEventListener("popstate", handlePop);

    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", handlePop);
    };
  }, []);

  const categories = ["Semua", ...Array.from(new Set(menuData.filter(Boolean).map(m => m.kategori || 'Lainnya')))];

  const filteredMenu = menuData.filter(m => 
    m &&
    (activeCategory === "Semua" || m.kategori === activeCategory) &&
    ((m.nama || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTableStatus = (table: any) => {
    if (!table) return 'kosong';
    if ((activeOrders || []).some(o => o && o.tableId === table.id && o.status !== 'paid' && o.status !== 'void')) return 'open';
    if (table.status === 'lunas') return 'lunas';
    return 'kosong';
  };

  const loadOrderIntoCart = (order: any) => {
    const loadedCart = order.items.map((i: any) => {
      const mods = i.selectedModifiers || [];
      const modSignature = mods.map((m: any) => `${m.groupName}:${m.optionName}`).sort().join('|');
      return {
        id: i.menuItemId,
        nama: i.nama || i.namaMenu || menuData.find(m => m.id === i.menuItemId)?.nama || 'Item Terhapus',
        harga: i.hargaSatuan,
        kategori: i.kategori || i.kategoriMenu || menuData.find(m => m.id === i.menuItemId)?.kategori || 'Lainnya',
        qty: i.qty || i.quantity,
        selectedModifiers: mods,
        itemKey: modSignature ? `${i.menuItemId}_${modSignature}` : `${i.menuItemId}`
      };
    });
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
    resetCart();
    setOrderType("Dine-in");
    setSelectedTable(table.id.toString());
    
    if (status === 'open') {
      const numTableId = Number(table.id);
      const strTableId = String(table.id);
      const order = activeOrders.find(o => 
        (Number(o.tableId) === numTableId || String(o.tableId) === strTableId) && 
        o.status !== 'paid' && o.status !== 'void'
      );
      if (order) {
        loadOrderIntoCart(order);
        setCustomerName(order.customerName || "");
      } else {
        setCustomerName("");
      }
    } else {
      // Meja kosong atau lunas yang dibuka untuk pesanan baru: selalu mulai dengan nama pembeli bersih
      setCustomerName("");
    }
    
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

      // Otomatis cetak struk Z-Report terisolasi
      try {
        const escposText = generateZReportReceipt(closed, storeSettings);
        const htmlContent = generateZReportHtml(closed, storeSettings);
        await executePrintDocument({
          title: 'Z_Report_Tutup_Shift',
          escposText,
          htmlContent,
          settings: storeSettings
        });
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

  const handleClearTable = async (targetTableId?: number | string) => {
    const tId = targetTableId || (selectedTable ? selectedTable : null);
    if (!tId) return;
    try {
      const { clearTable } = await import('@/lib/api');
      await clearTable(tId);
      setSelectedTable("");
      setCustomerName("");
      resetCart();
      setView('meja');
      await loadData();
    } catch (e: any) {
      alert(e.message || "Gagal mengosongkan meja");
    }
  };
  const printReceiptText = async (rawText: string, jobName: string = 'Struk', htmlContent?: string) => {
    try {
      const is80 = storeSettings.paperWidth === '80mm';
      const defaultHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 0; size: ${is80 ? '80mm' : '58mm'} auto; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Courier New', Courier, monospace; font-size: ${is80 ? '13px' : '11px'}; line-height: 1.25; background: #fff !important; color: #000 !important; width: ${is80 ? '72mm' : '52mm'}; margin: 0 auto; padding: 8px 4px; white-space: pre-wrap; }
          </style>
        </head>
        <body>${rawText}</body>
        </html>
      `;
      await executePrintDocument({
        title: jobName,
        escposText: rawText,
        htmlContent: htmlContent || defaultHtml,
        settings: storeSettings
      });
    } catch (err: any) {
      console.warn("Print error:", err);
      alert("Gagal mencetak struk: " + (err.message || err));
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
        openPaymentModal();
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
      if (!storeSettings.adminPin) {
        alert("PIN Otorisasi Admin belum dikonfigurasi. Harap konfigurasi PIN di Pengaturan.");
        return;
      }
      if (refundPinInput !== storeSettings.adminPin) {
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
    setModSheetDragY(0);
    pushModalHistory("modifier");
    modDirtyRef.current = false;
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
    modDirtyRef.current = true;
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
    modDirtyRef.current = false;
    setActiveModItem(null);
    setSelectedModOptions({});
    setModSheetDragY(0);
    popModalHistory();
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
  const selectedTableObj = (tableData || []).find(t => t && t.id != null && t.id.toString() === selectedTable);
  const selectedTableStatus = selectedTableObj ? getTableStatus(selectedTableObj) : null;
  const isDrinkCategory = (cat: string) => {
    if(!cat) return false;
    const c = cat.toLowerCase();
    return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') || c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
  };

  const processPayment = async (isDraftOnly = false, status = 'paid') => {
    if (cart.length === 0) return;

    if (status === 'paid' && paymentMethod === 'Cash') {
      const tendered = Number(cashTendered) || 0;
      if (tendered < totalPrice) {
        alert(`Uang tunai kurang! Diterima: Rp ${tendered.toLocaleString('id-ID')}, Total tagihan: Rp ${totalPrice.toLocaleString('id-ID')}`);
        return;
      }
    }

    const effectiveName = customerName.trim() || (selectedTableObj ? `Meja ${selectedTableObj.nomor.replace(/^Meja\s*/i, '')}` : "Tamu");
    
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
        customerName: effectiveName,
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
        customerName: effectiveName,
        notes,
        paymentMethod,
        orderType,
        tableName: payload.tableId ? tableData.find(t => t.id === payload.tableId)?.nomor : null,
        items: finalItems,
        total: finalTotal
      };
      
      setReceiptData(newReceipt);
      pushModalHistory("receipt");

      resetCart();
      setOrderType("Dine-in");
      setSelectedTable("");
      setView('meja');
      setIsPaymentModalOpen(false);
      setIsMobileCartOpen(false);
      setCartSheetDragY(0);
      setPaymentSheetDragY(0);
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
    pushModalHistory("receipt");
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
    if (!dataToPrint) return;
    setPrintMode(mode);
    
    try {
      const escposText = generateEscPosReceipt(dataToPrint, mode, storeSettings);
      const htmlContent = generateReceiptHtml(dataToPrint, mode, storeSettings);
      const modeLabel = mode === 'food' ? 'Dapur' : mode === 'drink' ? 'Bar' : 'Nota_POS';
      await executePrintDocument({
        title: modeLabel,
        escposText,
        htmlContent,
        settings: storeSettings
      });
    } catch (e: any) {
      console.warn('Gagal memanggil print:', e);
      alert('Gagal memanggil print: ' + (e.message || e));
    }
    setPrintMode('all');
  };
  const closeReceipt = () => {
    setReceiptData(null);
    popModalHistory();
  };


  const renderCartInner = (isMobile: boolean) => {
    if (!isMobile) {
      return (
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-line bg-surface rounded-t-3xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-fg tracking-tight">{editingOrderId ? 'Edit Open Bill' : 'Pesanan Anda'}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/60 text-accent-text font-extrabold">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} item
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTable && (
                  <button 
                    type="button"
                    onClick={handleReleaseTable} 
                    className="text-xs font-bold hover:bg-red-500/15 bg-red-950/40 text-red-400 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Lepas Meja
                  </button>
                )}
              </div>
            </div>

            {selectedTableObj && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${selectedTableStatus === 'open' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : selectedTableStatus === 'lunas' ? 'bg-accent/10 text-accent-text border border-accent/30' : 'bg-card text-slate-200 border border-line'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                  {selectedTableObj.nomor.replace(/^Meja\s*/i, '')}
                  <span className="opacity-70 ml-1">({selectedTableStatus === 'open' ? 'Open Bill' : selectedTableStatus === 'lunas' ? 'Lunas' : 'Kosong'})</span>
                </div>
                {customerName && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-line text-fg border border-line shadow-sm">
                    👤 {customerName}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-card">
            {cart.length === 0 && selectedTableStatus === 'lunas' && (() => {
              const paidOrder = allOrders
                .filter(o => o.tableId === selectedTableObj?.id && o.status === 'paid')
                .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
              const displayCustomer = customerName || paidOrder?.customerName || (selectedTableObj ? `Meja ${selectedTableObj.nomor.replace(/^Meja\s*/i, '')}` : "Tamu");

              return (
                <div className="text-center mt-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-3 border border-accent/40 shadow-sm">✅</div>
                  <p className="font-extrabold text-base text-fg">Tagihan Meja Ini Sudah LUNAS</p>
                  
                  <div className="bg-surface border border-line rounded-xl p-3.5 mt-3 text-xs text-slate-300 text-left w-full space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-line">
                      <span className="text-muted font-medium">Pelanggan:</span>
                      <span className="font-bold text-accent-text text-sm">👤 {displayCustomer}</span>
                    </div>
                    {paidOrder && (
                      <>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted">No. Nota:</span>
                          <span className="font-mono text-fg font-semibold">#{paidOrder.id}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted">Total Bayar:</span>
                          <span className="font-extrabold text-fg">Rp {paidOrder.total.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted">Metode:</span>
                          <span className="font-semibold text-fg">{paidOrder.paymentMethod || 'Cash'}</span>
                        </div>
                      </>
                    )}
                    <p className="text-[11px] text-muted pt-1 leading-snug">
                      Meja siap dikosongkan untuk tamu berikutnya, atau pilih menu di samping untuk membuat pesanan baru.
                    </p>
                  </div>

                  <button 
                    onClick={() => { handleClearTable(); setIsMobileCartOpen(false); }} 
                    className="w-full mt-4 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Kosongkan Meja (Lepas)</span>
                  </button>
                </div>
              );
            })()}
            
            {cart.length === 0 && selectedTableStatus !== 'lunas' && (
              <div className="text-center text-muted mt-12 flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                <p className="font-medium text-sm">Belum ada pesanan.</p>
              </div>
            )}

            {cart.map(item => (
              <div key={item.itemKey || item.id} className="flex justify-between items-start border-b border-line pb-4">
                <div className="flex-1 pr-3">
                  <h4 className="font-bold text-fg text-sm md:text-base leading-tight">{item.nama}</h4>
                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {item.selectedModifiers.map((m: any, mIdx: number) => (
                        <div key={mIdx} className="text-[11px] text-muted flex items-center gap-1">
                          <span>•</span>
                          <span>{m.optionName}</span>
                          {m.harga > 0 && <span className="font-bold text-accent-text">(+Rp {m.harga.toLocaleString('id-ID')})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className=" text-accent-text text-sm font-extrabold mt-1">Rp {item.harga.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center bg-surface rounded-xl p-1 border border-line shadow-sm">
                  <button onClick={() => updateQty(item.itemKey || item.id, -1)} className="w-8 h-8 rounded-lg bg-card text-fg hover:bg-card flex items-center justify-center font-black transition-colors">-</button>
                  <span className="w-8 text-center font-bold text-fg text-sm">{item.qty}</span>
                  <button onClick={() => updateQty(item.itemKey || item.id, 1)} className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover text-white flex items-center justify-center font-black transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 bg-surface border-t border-line shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            {cart.length > 0 && (
              <div className="mb-3 space-y-1.5 text-xs text-muted border-b border-line pb-3">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-fg">Rp {rawSubtotal.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center">
                  {discountAmount > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className=" text-accent-text font-bold">
                        🏷️ Diskon ({discountType === 'percent' ? discountValue + '%' : 'Rp'}):
                      </span>
                      <button 
                        onClick={() => { setDiscountValue(0); setTempDiscountVal(""); }}
                        className="text-red-500 hover:text-red-400 text-[10px] underline"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsDiscountModalOpen(true)}
                      className=" text-accent-text font-bold hover:underline flex items-center gap-1"
                    >
                      + Tambah Diskon / Promo
                    </button>
                  )}
                  {discountAmount > 0 && (
                    <span className="font-bold text-accent-text">-Rp {discountAmount.toLocaleString('id-ID')}</span>
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
              <span className=" text-muted font-bold text-xs uppercase tracking-wider">Total Pembayaran</span>
              <span className="text-2xl md:text-3xl font-black text-fg leading-none tracking-tight">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex gap-2">
              {editingOrderId && (
                <button onClick={handleShowDraftBill} className="w-1/4 bg-card border border-line text-fg py-3.5 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all">📝 Draft</button>
              )}
              {(editingOrderId || (orderType === "Dine-in" && selectedTable && activeOrders.some(o => o.tableId === parseInt(selectedTable)))) && (
                <button 
                  type="button"
                  onClick={handleOpenSplitBillFromCart} 
                  className="w-1/3 bg-line hover:bg-slate-600 text-white py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  ✂️ Split Bill
                </button>
              )}
              <button 
                onClick={openPaymentModal} 
                className="flex-1 bg-accent hover:bg-accent-hover text-white py-3.5 rounded-xl font-extrabold text-sm md:text-base shadow-lg shadow-accent/25 active:scale-95 transition-all disabled:opacity-40" 
                disabled={cart.length === 0}
              >
                Lanjut ke Pembayaran →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. MOBILE & TABLET VIEW (Responsive Landscape Split-Screen + Portrait Sheet)
    return (
      <div className="flex flex-col landscape:flex-row flex-1 min-h-0 h-full w-full overflow-hidden bg-card">
        {/* LEFT PANE in landscape / TOP & MIDDLE in portrait: Header + Cart Items List */}
        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-card">
          {/* Header */}
          <div 
            className="px-4 py-2 sm:px-5 sm:pb-3 sm:pt-2 border-b border-line bg-surface rounded-t-3xl landscape:rounded-none shrink-0"
            onTouchStart={handleCartTouchStart}
            onTouchMove={handleCartTouchMove}
            onTouchEnd={handleCartTouchEnd}
          >
            {/* Grab handle: ONLY visible in portrait mode, hidden in landscape to save vertical pixels */}
            <div 
              className="flex flex-col items-center justify-center -mt-1 mb-2 pt-1 pb-0.5 cursor-pointer select-none active:opacity-70 touch-none landscape:hidden"
              onClick={closeMobileCart}
              title="Ketuk atau tarik ke bawah untuk menutup"
            >
              <div className="w-14 h-1.5 bg-slate-600 rounded-full mb-1"></div>
              <span className="text-[10px] text-muted font-semibold flex items-center gap-1">
                <span>↓</span> Tarik ke bawah atau ketuk untuk kembali
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold text-fg tracking-tight">{editingOrderId ? 'Edit Open Bill' : 'Pesanan Anda'}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/60 text-accent-text font-extrabold">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} item
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTable && (
                  <button 
                    type="button"
                    onClick={handleReleaseTable} 
                    className="text-[11px] sm:text-xs font-bold hover:bg-red-500/15 bg-red-950/40 text-red-400 px-2.5 py-1 rounded-full transition-colors"
                  >
                    Lepas Meja
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeMobileCart}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-card hover:bg-line text-slate-300 flex items-center justify-center text-sm sm:text-base font-bold shadow-sm transition-all active:scale-90"
                  aria-label="Tutup keranjang"
                  title="Tutup dan kembali ke daftar menu"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Meja badge & Customer Name */}
            <div className="mt-2 flex items-center gap-2">
              {selectedTableObj && (
                <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm shrink-0 ${selectedTableStatus === 'open' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : selectedTableStatus === 'lunas' ? 'bg-accent/10 text-accent-text border border-accent/30' : 'bg-card text-slate-200 border border-line'}`}>
                  <span>🪑</span>
                  <span>{selectedTableObj.nomor.replace(/^Meja\s*/i, '')}</span>
                  <span className="opacity-70 text-[10px]">({selectedTableStatus === 'open' ? 'Open' : selectedTableStatus === 'lunas' ? 'Lunas' : 'Kosong'})</span>
                </div>
              )}

            </div>
          </div>

          {/* Scrollable Cart Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 sm:space-y-4 bg-card overscroll-contain">
            {cart.length === 0 && selectedTableStatus === 'lunas' && (() => {
              const paidOrder = allOrders
                .filter(o => o.tableId === selectedTableObj?.id && o.status === 'paid')
                .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
              const displayCustomer = customerName || paidOrder?.customerName || (selectedTableObj ? `Meja ${selectedTableObj.nomor.replace(/^Meja\s*/i, '')}` : "Tamu");

              return (
                <div className="text-center py-4 flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl sm:text-3xl mb-2 sm:mb-3 border border-accent/40 shadow-sm">✅</div>
                  <p className="font-extrabold text-sm sm:text-base text-fg">Tagihan Meja Ini Sudah LUNAS</p>
                  
                  <div className="bg-surface border border-line rounded-xl p-3 mt-2 text-xs text-slate-300 text-left w-full space-y-1.5">
                    <div className="flex justify-between items-center pb-1.5 border-b border-line">
                      <span className="text-muted font-medium">Pelanggan:</span>
                      <span className="font-bold text-accent-text text-sm">👤 {displayCustomer}</span>
                    </div>
                    {paidOrder && (
                      <>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted">No. Nota:</span>
                          <span className="font-mono text-fg font-semibold">#{paidOrder.id}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted">Total Bayar:</span>
                          <span className="font-extrabold text-fg">Rp {paidOrder.total.toLocaleString('id-ID')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => { handleClearTable(); setIsMobileCartOpen(false); }} 
                    className="w-full mt-3 py-2.5 sm:py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>🔄</span>
                    <span>Kosongkan Meja (Lepas)</span>
                  </button>
                </div>
              );
            })()}
            
            {cart.length === 0 && selectedTableStatus !== 'lunas' && (
              <div className="text-center text-muted py-8 flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 mb-2 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                <p className="font-medium text-xs sm:text-sm">Belum ada pesanan.</p>
              </div>
            )}

            {cart.map(item => (
              <div key={item.itemKey || item.id} className="flex justify-between items-start border-b border-line pb-2.5 sm:pb-4">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-fg text-xs sm:text-sm md:text-base leading-tight">{item.nama}</h4>
                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {item.selectedModifiers.map((m: any, mIdx: number) => (
                        <div key={mIdx} className="text-[10px] sm:text-[11px] text-muted flex items-center gap-1">
                          <span>•</span>
                          <span>{m.optionName}</span>
                          {m.harga > 0 && <span className="font-bold text-accent-text">(+Rp {m.harga.toLocaleString('id-ID')})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-accent-text text-xs sm:text-sm font-extrabold mt-0.5 sm:mt-1">Rp {item.harga.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center bg-surface rounded-xl p-0.5 sm:p-1 border border-line shadow-sm shrink-0">
                  <button onClick={() => updateQty(item.itemKey || item.id, -1)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-card text-fg hover:bg-card flex items-center justify-center font-black transition-colors text-sm">-</button>
                  <span className="w-7 sm:w-8 text-center font-bold text-fg text-xs sm:text-sm">{item.qty}</span>
                  <button onClick={() => updateQty(item.itemKey || item.id, 1)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent hover:bg-accent-hover text-white flex items-center justify-center font-black transition-colors text-sm">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE in landscape / BOTTOM in portrait: Payment & Actions */}
        <div className="bg-surface border-t landscape:border-t-0 landscape:border-l border-line p-3.5 sm:p-5 landscape:p-3.5 landscape:w-72 sm:landscape:w-80 landscape:shrink-0 flex flex-col justify-between shrink-0 overflow-y-auto shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div>
            {/* Rincian Diskon & Biaya */}
            {cart.length > 0 && (
              <div className="mb-2 sm:mb-3 space-y-1 text-[11px] sm:text-xs text-muted border-b border-line pb-2 sm:pb-3">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-fg">Rp {rawSubtotal.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center">
                  {discountAmount > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-accent-text font-bold">
                        🏷️ Diskon ({discountType === 'percent' ? discountValue + '%' : 'Rp'}):
                      </span>
                      <button 
                        onClick={() => { setDiscountValue(0); setTempDiscountVal(""); }}
                        className="text-red-500 hover:text-red-400 text-[10px] underline"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="text-accent-text font-bold hover:underline flex items-center gap-1"
                    >
                      + Tambah Diskon / Promo
                    </button>
                  )}
                  {discountAmount > 0 && (
                    <span className="font-bold text-accent-text">-Rp {discountAmount.toLocaleString('id-ID')}</span>
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

            <div className="flex justify-between items-end mb-2.5 sm:mb-4">
              <span className="text-muted font-bold text-[10px] sm:text-xs uppercase tracking-wider">Total Pembayaran</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-fg leading-none tracking-tight">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <button
              type="button"
              onClick={closeMobileCart}
              className="w-full py-2 sm:py-2.5 rounded-xl bg-card hover:bg-line/80 border border-line text-fg font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-sm"
            >
              <span>←</span>
              <span>Tambah Menu Lain</span>
            </button>
            <div className="flex gap-2">
              {editingOrderId && (
                <button onClick={handleShowDraftBill} className="w-1/4 bg-card border border-line text-fg py-2.5 sm:py-3.5 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all">📝 Draft</button>
              )}
              {(editingOrderId || (orderType === "Dine-in" && selectedTable && activeOrders.some(o => o.tableId === parseInt(selectedTable)))) && (
                <button 
                  type="button"
                  onClick={handleOpenSplitBillFromCart} 
                  className="w-1/3 bg-line hover:bg-slate-600 text-white py-2.5 sm:py-3.5 rounded-xl font-bold text-xs md:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  ✂️ Split
                </button>
              )}
              <button 
                onClick={openPaymentModal} 
                className="flex-1 bg-accent hover:bg-accent-hover text-white py-2.5 sm:py-3.5 rounded-xl font-extrabold text-sm md:text-base shadow-lg shadow-accent/25 active:scale-95 transition-all disabled:opacity-40" 
                disabled={cart.length === 0}
              >
                Bayar →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isAccessChecking) {
    return (
      <div className="flex flex-col h-screen bg-surface text-fg items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-fg">Memeriksa Izin Kasir SakuNota...</h2>
        <p className="text-xs text-muted mt-1">Kasir jalan tanpa internet • Memvalidasi lisensi & masa coba</p>
      </div>
    );
  }

  if (!accessStatus.isValid) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 md:p-8">
        <div className="max-w-xl w-full mx-auto my-auto py-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border-2 border-blue-200 mb-4 shadow-sm">
              {accessStatus.status === 'trial_expired' ? (
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : accessStatus.isClockTampered ? (
                <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold mb-2">
              <span>SakuNota • PT Pemuda Gaya Bebas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {accessStatus.status === 'trial_expired'
                ? 'Masa Coba 7 Hari Selesai'
                : accessStatus.isClockTampered
                ? 'Peringatan Waktu Perangkat Dimundurkan'
                : accessStatus.status === 'revoked'
                ? 'Akses Kasir Telah Dicabut'
                : 'Aktivasi Lisensi Kasir SakuNota'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {accessStatus.error || 'Masukkan Kode Lisensi Resmi, Lisensi Tester, atau Kode Trial Anda di bawah ini untuk membuka kasir.'}
            </p>
          </div>

          {/* Direct Activation Form Box (Primary & High-Contrast Light Blue) */}
          <div className="bg-white border-2 border-blue-300 rounded-3xl p-5 sm:p-6 mb-5 shadow-lg shadow-blue-900/5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 mb-1.5 flex items-center gap-2">
              <span>🔑</span>
              <span>Punya Kode Lisensi / Lisensi Tester? Aktifkan Langsung:</span>
            </h2>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Tempel kode lisensi Anda (contoh: <strong>SN-TEST-...</strong>, <strong>SN-XXXX-...</strong>, atau <strong>SN-TRIAL-...</strong>) tanpa perlu Nomor Pesanan atau Kode Akses Rahasia:
            </p>
            <form onSubmit={handleActivateFromGate} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={activationInputKey}
                  onChange={(e) => setActivationInputKey(e.target.value.toUpperCase())}
                  placeholder="Contoh: SN-TEST-XXXX atau SN-XXXX-XXXX-XXXX"
                  className="flex-1 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 outline-none uppercase"
                />
                <button
                  type="submit"
                  disabled={isActivatingKey || !activationInputKey.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap shadow-md shadow-blue-600/25 active:scale-95"
                >
                  {isActivatingKey ? 'Memeriksa...' : '🚀 Aktifkan Kasir'}
                </button>
              </div>
              {activationNotice && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  activationNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {activationNotice.message}
                </div>
              )}
            </form>
          </div>

          {/* Quick Demo Access Box */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-white border border-blue-200 text-blue-600 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                🎮
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Ingin Mencoba Simulasi Kasir Tanpa Lisensi?</h3>
                <p className="text-xs text-slate-600 mt-0.5">Buka Demo Sandbox interaktif gratis untuk mencoba menu, meja, dan cetak struk.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartDemo}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-sm active:scale-95 shrink-0"
            >
              Buka Demo Kasir →
            </button>
          </div>

          {/* Guarantee Box: Data Never Held Hostage */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5 text-slate-800 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Jaminan Keamanan: Data Usaha Anda 100% Milik Anda</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Semua data menu, riwayat transaksi, dan rekap shift kasir tersimpan utuh di perangkat Anda. Anda dapat mengunduh cadangan data kapan saja.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportBackupFromPos}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    <span>📥</span> Unduh Cadangan Data (.JSON)
                  </button>
                  {backupSuccessNotice && (
                    <span className="text-xs text-emerald-700 font-bold">{backupSuccessNotice}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compact 4-Grid Navigation & CTAs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Link
              href="/?beli=true"
              className="bg-blue-600 hover:bg-blue-700 text-white font-black p-3 rounded-xl text-xs transition-colors flex flex-col items-center justify-center gap-1 shadow-xs"
            >
              <span className="text-base">💳</span>
              <span>Beli Lisensi Rp50rb</span>
            </Link>
            <Link
              href="/?beta=register"
              className="bg-white hover:bg-blue-50 border border-slate-200 text-slate-800 font-bold p-3 rounded-xl text-xs transition-colors flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">📝</span>
              <span>Trial 7 Hari</span>
            </Link>
            <Link
              href="/panduan"
              className="bg-white hover:bg-blue-50 border border-slate-200 text-slate-800 font-bold p-3 rounded-xl text-xs transition-colors flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">📖</span>
              <span>Buku Panduan</span>
            </Link>
            <Link
              href="/tentang"
              className="bg-white hover:bg-blue-50 border border-slate-200 text-slate-800 font-bold p-3 rounded-xl text-xs transition-colors flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">🏢</span>
              <span>Tentang Kami</span>
            </Link>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 py-3">
          SakuNota - Kasir Jalan Tanpa Internet &copy; 2026 <strong>PT Pemuda Gaya Bebas</strong>.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-surface text-fg items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-fg">Memuat Data Kasir...</h2>
        <p className="text-xs text-muted mt-1">Menyiapkan menu, meja, dan database lokal</p>
      </div>
    );
  }

  return (
    <>
    <div id="main-app-container" className="flex flex-col h-screen font-sans relative bg-surface text-fg transition-colors duration-200 overflow-hidden">
      {/* Demo Sandbox Alert Banner */}
      {accessStatus.isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-amber-950 font-medium shrink-0 z-40">
          <div className="flex items-center gap-2">
            <span className="font-black bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase shadow-xs">DEMO SANDBOX</span>
            <span>Anda sedang mencoba mode simulasi kasir. Seluruh data transaksi di sini adalah simulasi lokal.</span>
          </div>
          <div className="flex items-center gap-3 mt-1 sm:mt-0 font-bold">
            <button type="button" onClick={handleExitDemo} className="text-amber-900 hover:text-amber-950 font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 transition-colors">← Keluar Demo</button>
          </div>
        </div>
      )}

      {/* Trial Expiry Countdown Banner */}
      {!accessStatus.isDemo && accessStatus.licenseType === "trial" && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-blue-950 font-medium shrink-0 z-40">
          <div className="flex items-center gap-2">
            <span className="font-black bg-blue-600 text-white px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase shadow-xs">CLOSED BETA TRIAL</span>
            <span>Sisa waktu: <strong>{accessStatus.daysRemaining ?? 7} hari</strong> ({accessStatus.hoursRemaining ?? 168} jam). Usaha: <strong>{accessStatus.businessName}</strong></span>
          </div>
          <Link href="/?beli=true" className="mt-1 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] shadow-sm">
            Upgrade Permanen Rp50.000 →
          </Link>
        </div>
      )}
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleClosePaymentModal}
        >
          <div 
            className=" bg-card p-6 md:p-8 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh] transition-transform ease-out"
            style={{
              transform: paymentSheetDragY > 0 ? `translateY(${paymentSheetDragY}px)` : undefined,
              touchAction: 'pan-y'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div 
              className="flex flex-col items-center justify-center pt-1 pb-2 cursor-pointer select-none sm:hidden touch-none"
              onTouchStart={handlePaymentTouchStart}
              onTouchMove={handlePaymentTouchMove}
              onTouchEnd={handlePaymentTouchEnd}
              onClick={handleClosePaymentModal}
            >
              <div className="w-14 h-1.5 bg-slate-600 rounded-full mb-1"></div>
              <span className="text-[10px] text-muted font-semibold flex items-center gap-1">
                <span>↓</span> Tarik ke bawah untuk batal
              </span>
            </div>

            <div 
              className="flex justify-between items-center mb-4"
              onTouchStart={handlePaymentTouchStart}
              onTouchMove={handlePaymentTouchMove}
              onTouchEnd={handlePaymentTouchEnd}
            >
              <h2 className="text-xl font-bold text-fg">Selesaikan Pembayaran</h2>
              <button 
                type="button"
                onClick={handleClosePaymentModal}
                className="w-9 h-9 rounded-full bg-line text-muted hover:text-fg flex items-center justify-center text-sm font-bold active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {/* Prominent Total Tagihan at TOP */}
              <div className="bg-surface border border-line rounded-2xl p-4 text-center mb-4 shadow-inner">
                <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">Total Tagihan</span>
                <span className="text-3xl font-black text-accent-text tracking-tight">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
                {discountAmount > 0 && (
                  <span className="text-[11px] text-accent-text font-bold block mt-0.5">
                    (Diskon Rp {discountAmount.toLocaleString('id-ID')})
                  </span>
                )}
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">Tipe Pesanan</label>
                  <div className="flex space-x-2">
                    {["Dine-in", "Takeaway"].map((type) => (
                      <button 
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border ${orderType === type ? 'bg-accent border-accent text-white shadow-sm' : ' bg-surface border-line text-muted'}`}
                      >
                        {type === 'Dine-in' ? '🍽️ Dine-in (Makan di Tempat)' : '🥡 Takeaway (Bungkus)'}
                      </button>
                    ))}
                  </div>
                </div>
                {orderType === "Dine-in" && (
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">Pilih Meja</label>
                    <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                      {tableData.map(table => {
                        const tStatus = getTableStatus(table);
                        const isSelected = selectedTable === table.id.toString();
                        const bgClass = tStatus === 'open' 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' 
                          : tStatus === 'lunas' 
                          ? 'bg-accent/10 text-accent-text border-accent/30' 
                          : ' bg-card text-slate-300 border-line';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => setSelectedTable(table.id.toString())}
                            className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${bgClass} ${isSelected ? 'ring-2 ring-accent ring-offset-1 scale-105 shadow-sm font-black' : 'opacity-80 hover:opacity-100'}`}
                          >
                            {table.nomor.replace(/^Meja\s*/i, '')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Nama Pelanggan</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Pelanggan (Opsional)"
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-sm text-fg focus:border-accent outline-none transition-colors" 
                  />
                  <div className="mt-2.5">
                    <label className="block text-xs font-bold text-muted mb-1">Catatan</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan pesanan (Opsional)"
                      className="w-full bg-surface border border-line rounded-xl p-2.5 text-sm text-fg focus:border-accent outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 mt-2">Metode Pembayaran</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "Cash", label: "Tunai", icon: "💵" },
                      { id: "QRIS", label: "QRIS", icon: "📱" },
                      { id: "Transfer", label: "Transfer", icon: "💳" },
                      { id: "E-Wallet", label: "E-Wallet", icon: "👛" }
                    ].map((method) => (
                      <button 
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === method.id 
                            ? 'bg-accent border-accent text-white shadow-md shadow-accent/30' 
                            : ' bg-surface border-line text-muted hover:border-slate-500'
                        }`}
                      >
                        <span className="text-sm">{method.icon}</span>
                        <span>{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Bill Trigger */}
                <div className="pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted">Pilihan Tagihan:</span>
                    <button
                      type="button"
                      onClick={handleOpenSplitBillFromPaymentModal}
                      className="text-xs font-bold text-accent-text hover:text-accent-text hover:underline flex items-center gap-1"
                    >
                      <span>✂️ Split Bill / Cicil</span>
                    </button>
                  </div>
                </div>

                {/* Kalkulator Uang Masuk & Kembalian */}
                {paymentMethod === "Cash" && (
                  <div className="mt-2 p-3.5 bg-surface/80 rounded-2xl border border-line">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-300">Uang Diterima (Rp)</label>
                      <button 
                        type="button"
                        onClick={() => setCashTendered(totalPrice.toString())}
                        className="text-xs text-accent-text font-bold hover:underline"
                      >
                        Uang Pas
                      </button>
                    </div>
                    <input 
                      type="number"
                      placeholder={totalPrice.toString()}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className={`w-full bg-card border rounded-xl p-2.5 text-lg font-black text-fg outline-none transition-colors ${
                        (Number(cashTendered) || 0) > 0 && (Number(cashTendered) || 0) < totalPrice
                          ? 'border-red-500 focus:border-red-500'
                          : ' border-line focus:border-accent'
                      }`}
                    />
                    
                    {/* Tombol Cepat Pecahan Uang */}
                    <div className="grid grid-cols-5 gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setCashTendered(totalPrice.toString())}
                        className="py-1 px-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-bold hover:bg-blue-100 transition-colors shadow-sm"
                        title="Isi nominal pas sesuai total tagihan"
                      >
                        Pas
                      </button>
                      {[10000, 20000, 50000, 100000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashTendered(amt.toString())}
                          className="py-1 px-1.5 text-xs bg-card border border-line rounded-lg font-bold text-fg hover:bg-surface transition-colors shadow-sm"
                        >
                          {amt >= 1000 ? (amt / 1000) + 'rb' : amt}
                        </button>
                      ))}
                    </div>

                    {/* Validasi Uang Kurang / Indikator Kembalian */}
                    {(!cashTendered || (Number(cashTendered) || 0) < totalPrice) ? (
                      <div className="mt-2.5 p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center justify-between shadow-sm">
                        <span>⚠️ Uang tunai kurang:</span>
                        <span className="font-extrabold text-red-800">
                          -Rp {(totalPrice - (Number(cashTendered) || 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 pt-2.5 border-t border-line flex justify-between items-center">
                        <span className="text-xs font-semibold text-muted">Kembalian:</span>
                        <span className="text-base font-black text-blue-600">
                          Rp {Math.max(0, (Number(cashTendered) || 0) - totalPrice).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Bukti Pembayaran untuk QRIS, Transfer, atau E-Wallet */}
                {(paymentMethod === "QRIS" || paymentMethod === "Transfer" || paymentMethod === "E-Wallet") && (
                  <PaymentProofUpload
                    proof={checkoutProof}
                    onChange={setCheckoutProof}
                    paymentMethod={paymentMethod}
                  />
                )}
            </div>
          </div>
          <div className="border-t border-line pt-3 mt-2 shrink-0 bg-card">
            
              {cart.length > 0 && (discountAmount > 0 || serviceAmount > 0 || taxAmount > 0) && (
                <div className="mb-3 p-3 bg-surface rounded-xl space-y-1 text-xs text-muted border border-line">
                  <div className="flex justify-between"><span>Subtotal</span><span>Rp {rawSubtotal.toLocaleString('id-ID')}</span></div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-accent-text font-semibold"><span>Diskon</span><span>-Rp {discountAmount.toLocaleString('id-ID')}</span></div>
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
              <span className=" text-muted font-bold text-sm">Total Pembayaran</span>
              <span className="text-2xl font-black text-accent-text">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={handleClosePaymentModal} 
                className="px-4 py-3 rounded-xl bg-line text-fg hover:bg-line font-bold text-xs transition-colors"
              >
                Batal
              </button>
              {orderType === "Dine-in" && selectedTable && (
                <button 
                  type="button"
                  onClick={() => processPayment(true, 'unpaid')} 
                  className="flex-1 py-3 rounded-xl bg-line hover:bg-slate-600 text-white font-bold transition-all shadow-sm text-xs active:scale-95"
                >
                  📥 Open Bill
                </button>
              )}
              <button 
                type="button"
                disabled={isProcessingPayment}
                onClick={() => {
                  if (paymentMethod === 'Cash') {
                    const tendered = Number(cashTendered) || 0;
                    if (tendered < totalPrice) {
                      alert(`Uang tunai kurang dari total pesanan!\n\nTotal Tagihan: Rp ${totalPrice.toLocaleString('id-ID')}\nUang Diterima: Rp ${tendered.toLocaleString('id-ID')}\nKekurangan: Rp ${(totalPrice - tendered).toLocaleString('id-ID')}\n\nSilakan masukkan nominal yang cukup atau ketuk tombol [Pas].`);
                      return;
                    }
                  }
                  processPayment(false, 'paid');
                }} 
                className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-extrabold transition-all shadow-md text-xs sm:text-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? 'Memproses...' : 'Bayar Sekarang'}
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
            className="bg-card text-fg p-6 rounded-2xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto pr-2">
              {/* theme-skip-start */}
              <div id="printable-receipt" className="bg-white text-black rounded-lg font-mono text-sm leading-tight p-2 relative">
                {receiptData.isDraft && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <span className="text-6xl font-black rotate-[-45deg] tracking-widest uppercase">DRAFT</span>
                  </div>
                )}
                <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                  {storeSettings.storeLogo && printMode === 'all' && (
                    <div className="flex justify-center mb-2">
                      <img src={storeSettings.storeLogo} alt="Logo Toko" className="max-h-16 max-w-[120px] object-contain" />
                    </div>
                  )}
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
                              <td className="py-1 text-base font-medium">
                                <div>{item.qty}x {item.nama}</div>
                                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                  <div className="pl-3 mt-0.5 space-y-0.5 text-[11px] font-normal text-gray-700">
                                    {item.selectedModifiers.map((m: any, mIdx: number) => (
                                      <div key={mIdx}>
                                        • {m.optionName || m.nama}{m.harga > 0 ? ` (+Rp ${Number(m.harga).toLocaleString('id-ID')})` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {printMode === 'all' && <td className="py-1 text-right align-top">Rp {(item.qty * (item.harga || item.hargaSatuan || 0)).toLocaleString('id-ID')}</td>}
                            </tr>
                          ))}
                        </>
                      )}
                      {(printMode === 'all' || printMode === 'drink') && receiptData.items.filter((i:any) => isDrinkCategory(i.kategori)).length > 0 && (
                        <>
                          <tr><td colSpan={printMode === 'all' ? 2 : 1} className="font-bold pt-3 pb-1 border-b border-gray-200">Minuman</td></tr>
                          {receiptData.items.filter((i:any) => isDrinkCategory(i.kategori)).map((item: any, idx: number) => (
                            <tr key={'d'+idx}>
                              <td className="py-1 text-base font-medium">
                                <div>{item.qty}x {item.nama}</div>
                                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                  <div className="pl-3 mt-0.5 space-y-0.5 text-[11px] font-normal text-gray-700">
                                    {item.selectedModifiers.map((m: any, mIdx: number) => (
                                      <div key={mIdx}>
                                        • {m.optionName || m.nama}{m.harga > 0 ? ` (+Rp ${Number(m.harga).toLocaleString('id-ID')})` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {printMode === 'all' && <td className="py-1 text-right align-top">Rp {(item.qty * (item.harga || item.hargaSatuan || 0)).toLocaleString('id-ID')}</td>}
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
                        <div className="flex justify-between mt-1 text-blue-600 font-bold"><span>Kembalian</span><span>Rp {Number(receiptData.change || 0).toLocaleString('id-ID')}</span></div>
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
                      {storeSettings.enableWatermark && <p className="mt-2 text-[9px] text-gray-400">[ SakuNota ]</p>}
                    </>
                  ) : (
                    <p>--- BATAS PESANAN ---</p>
                  )}
                </div>
              </div>
            </div>

            {/* theme-skip-end */}
            <div className="mt-6 flex flex-col space-y-2 border-t pt-4">
              {receiptData.isDraft && (
                <button onClick={() => { closeReceipt(); processPayment(false, 'paid'); }} className="w-full py-3 mb-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-lg shadow-lg shadow-accent/20 flex justify-center items-center space-x-2 transition-transform active:scale-95">
                  <span>Bayar Lunas Sekarang</span>
                </button>
              )}
              <button onClick={() => handlePrint('all')} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold flex items-center justify-center space-x-2 shadow transition-transform active:scale-95">
                <span>Cetak Semua</span>
              </button>
              <div className="flex space-x-2">
                {receiptData.items.some((i:any) => !isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('food')} className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors">Cetak Makanan</button>
                )}
                {receiptData.items.some((i:any) => isDrinkCategory(i.kategori)) && (
                  <button onClick={() => handlePrint('drink')} className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors">Cetak Minuman</button>
                )}
              </div>
              <button onClick={closeReceipt} className="w-full py-2.5 mt-2 rounded-xl bg-card hover:bg-line text-fg font-bold transition-colors">Tutup</button>
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
            className=" bg-card p-6 rounded-3xl w-full max-w-sm shadow-2xl relative border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-4 text-fg text-center">Pilih Varian {activeVariantGroup.title}</h2>
            <div className="space-y-3">
              {activeVariantGroup.variants.map((v: MenuItem) => (
                <button
                  key={v.id}
                  onClick={() => { addToCart(v); setActiveVariantGroup(null); }}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-transform active:scale-95 flex justify-between px-5 ${v.isSoldOut ? 'bg-card text-muted cursor-not-allowed opacity-60' : ' hover:bg-accent/15 border bg-accent/40 text-accent-text border-accent/40 shadow-sm'}`}
                  disabled={v.isSoldOut}
                >
                  <span>{v.nama}</span>
                  <span className="font-black">Rp {v.harga.toLocaleString('id-ID')}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setActiveVariantGroup(null)} className="w-full mt-4 py-3 rounded-2xl bg-line text-fg font-bold hover:bg-slate-600 transition-colors">Batal</button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- DESKTOP APPLICATION WORKSPACE (>= 1024px / lg:flex) --- */}
      {/* ======================================================== */}
      <div className="hidden lg:flex flex-col h-full w-full overflow-hidden">
        {/* Top Application Header (Full Width) */}
        <header className="h-16 bg-card border-b border-line px-4 flex items-center justify-between shrink-0 z-30 transition-colors">
        {/* Left: Brand & Store Name */}
        <Link href="/" className="flex items-center space-x-3 hover:opacity-85 transition-opacity" title="Kembali ke Beranda SakuNota">
          {storeSettings.storeLogo ? (
            <img
              src={storeSettings.storeLogo}
              alt="Logo Toko"
              className="w-10 h-10 rounded-xl object-contain bg-surface border border-line shadow-sm flex-shrink-0 p-0.5"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-black text-sm shadow-md shadow-accent/30 flex-shrink-0">
              SN
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-black text-fg leading-tight truncate">
              {storeSettings.storeName || 'SakuNota'}
            </h1>
            <span className="text-[11px] text-muted font-medium line-clamp-1">
              {storeSettings.storeAddress || 'Kasir Jalan Tanpa Internet'}
            </span>
          </div>
        </Link>

        {/* Center: Switcher Meja / Menu */}
        <div className="flex bg-surface rounded-xl p-1 border border-line shadow-inner">
          {isTableManagementEnabled(storeSettings) && (
            <button 
              type="button"
              onClick={() => setView('meja')} 
              className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'meja' 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-muted hover:text-fg'
              }`}
            >
              🍽️ Meja
            </button>
          )}
          <button 
            type="button"
            onClick={() => setView('menu')} 
            className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
              view === 'menu' 
                ? 'bg-accent text-white shadow-sm' 
                : 'text-muted hover:text-fg'
            }`}
          >
            ☕ {isTableManagementEnabled(storeSettings) ? 'Menu' : 'Kasir / Katalog'}
          </button>
        </div>

        {/* Right: Shift Status & Admin Button */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {activeShift ? (
            <div className="flex items-center gap-1.5 bg-accent/20 border border-accent/40 px-3 py-1.5 rounded-full text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0"></span>
              <span className="font-bold text-accent-text truncate max-w-[80px] md:max-w-none">{activeShift.operatorName}</span>
              <span className="hidden md:inline text-muted">|</span>
              <span className="hidden md:inline font-bold text-accent-text">Rp {(currentShiftStats?.expectedCash || activeShift.startingCash || 0).toLocaleString('id-ID')}</span>
              <button 
                type="button"
                onClick={() => setIsCashMovementModalOpen(true)}
                className="ml-1 text-[11px] font-bold text-accent-text hover:underline"
                title="Catat Kas Masuk / Keluar"
              >
                [+/- Kas]
              </button>
              <button 
                type="button"
                onClick={openCloseShiftModal}
                className="text-[11px] font-bold text-rose-400 hover:underline"
                title="Tutup Shift Kasir"
              >
                [Tutup]
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="flex items-center gap-1.5 bg-accent/20 border border-accent/40 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold text-accent-text hover:bg-accent/30 shadow-sm transition-transform active:scale-95 shrink-0"
              title="Buka Shift Kasir"
            >
              <span>💼</span>
              <span className="hidden sm:inline">Buka Shift</span>
            </button>
          )}

          <Link 
            href="/admin" 
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-surface border border-line text-xs font-bold text-fg hover:border-accent hover:text-accent-text transition-colors flex items-center gap-1.5"
            title="Halaman Admin"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Horizontal Workspace Below Top Header */}
      <div className="flex-1 flex overflow-hidden w-full print:hidden">
        {/* Left Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-52 bg-card border-r border-line p-3 justify-between shrink-0 select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted px-2.5 py-1 block">Navigasi Utama</span>
            <button
              type="button"
              onClick={() => setView('menu')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                view === 'menu'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-fg hover:bg-surface'
              }`}
            >
              <span className="text-sm">☕</span>
              <span>Kasir & Menu</span>
            </button>
            {isTableManagementEnabled(storeSettings) && (
              <button
                type="button"
                onClick={() => setView('meja')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  view === 'meja'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-fg hover:bg-surface'
                }`}
              >
                <span className="text-sm">🍽️</span>
                <span>Kelola Meja</span>
              </button>
            )}
            <Link
              href={accessStatus.isDemo ? "/admin/transaksi?demo=true" : "/admin/transaksi"}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition-all"
            >
              <span className="text-sm">🧾</span>
              <span>Riwayat Transaksi</span>
            </Link>
            <Link
              href={accessStatus.isDemo ? "/admin/shift?demo=true" : "/admin/shift"}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition-all"
            >
              <span className="text-sm">💼</span>
              <span>Shift & Kas Laci</span>
            </Link>
            <Link
              href={accessStatus.isDemo ? "/admin/menu?demo=true" : "/admin/menu"}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition-all"
            >
              <span className="text-sm">📦</span>
              <span>Katalog & Stok</span>
            </Link>
            <Link
              href={accessStatus.isDemo ? "/admin/pengaturan?demo=true" : "/admin/pengaturan"}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition-all"
            >
              <span className="text-sm">⚙️</span>
              <span>Pengaturan POS</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-line">
            <div className="px-2.5 py-2 rounded-xl bg-surface border border-line text-[11px] text-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-emerald-400">Siap Tanpa Internet</span>
            </div>
          </div>
        </aside>

        {/* Central Workspace */}
        <div className="flex-1 flex flex-col h-full pb-20 lg:pb-0 overflow-hidden bg-surface transition-colors">
          {view === 'meja' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface flex flex-col">
              {/* Meja Summary Bar */}
              <div className="mb-4 p-3 bg-card rounded-2xl border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-fg text-sm">Denah Meja</span>
                  <span className="text-[11px] text-muted">
                    Total {tableData.length} Meja
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                    Tersedia: {tableData.filter(t => getTableStatus(t) === 'kosong').length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                    Terisi: {tableData.filter(t => getTableStatus(t) === 'open').length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-text font-bold text-[10px]">
                    Lunas: {tableData.filter(t => getTableStatus(t) === 'lunas').length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
                {(tableData || []).map(table => {
                  if (!table || table.id == null) return null;
                  const tStatus = getTableStatus(table);
                  const openOrder = (activeOrders || []).find(o => o && o.tableId === table.id && o.status !== 'paid' && o.status !== 'void');
                  const paidOrder = tStatus === 'lunas' 
                    ? (allOrders || []).filter(o => o && o.tableId === table.id && o.status === 'paid').sort((a, b) => (b.id || 0) - (a.id || 0))[0] 
                    : null;
                  const activeTableOrder = openOrder || paidOrder;
                  const name = activeTableOrder?.customerName;
                  const isSelected = selectedTable === (table.id != null ? table.id.toString() : '');
                  const style = tStatus === 'open' 
                    ? { card: 'border-rose-500 bg-card shadow-rose-500/10', badge: 'bg-rose-600 text-white', label: 'Terisi (Open)', labelCls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' } 
                    : tStatus === 'lunas' 
                    ? { card: 'border-accent bg-card shadow-accent/10', badge: 'bg-accent text-white', label: 'Lunas', labelCls: 'bg-accent/15 text-accent-text font-bold' } 
                    : { card: 'border-line bg-card hover:border-accent/40', badge: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-black', label: 'Kosong', labelCls: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold' };
                  return (
                    <div 
                      key={table.id} 
                      onClick={() => handleTableClick(table)} 
                      className={`relative rounded-2xl border-2 ${style.card} p-4 h-40 flex flex-col items-center justify-between shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer ${isSelected ? 'ring-4 ring-accent/70' : ''}`}
                    >
                      <span className={`w-12 h-12 rounded-full ${style.badge} text-xl flex items-center justify-center shadow-md mt-1`}>
                        {(table.nomor || '').replace(/^Meja\s*/i, '')}
                      </span>
                      <div className="flex flex-col items-center text-center w-full px-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${style.labelCls}`}>
                          {style.label}
                        </span>
                        {name && (
                          <span className={`mt-1 text-xs font-bold truncate max-w-full ${tStatus === 'lunas' ? 'text-accent-text' : 'text-fg'}`}>
                            👤 {name}
                          </span>
                        )}
                        {openOrder && (
                          <span className="text-[11px] font-extrabold text-rose-400 mt-0.5">
                            Rp {(openOrder.total ?? 0).toLocaleString('id-ID')}
                          </span>
                        )}
                        {paidOrder && (
                          <span className="text-[10px] font-semibold text-muted mt-0.5 truncate max-w-full">
                            Nota #{paidOrder.id} • Rp {(paidOrder.total ?? 0).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>

                      {tStatus === 'lunas' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearTable(table.id);
                          }}
                          className="w-full py-1 text-[11px] font-bold bg-accent hover:bg-accent-hover text-white rounded-lg transition-transform active:scale-95 shadow-sm"
                        >
                          🔄 Lepas Meja
                        </button>
                      ) : (
                        <div className="h-5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'menu' && (() => {
            const menuItemsPerPage = 12;
            const totalMenuPages = Math.max(1, Math.ceil(filteredMenu.length / menuItemsPerPage));
            const paginatedMenu = filteredMenu.slice((menuPage - 1) * menuItemsPerPage, menuPage * menuItemsPerPage);

            return (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-4 md:p-6 pb-2 shrink-0">
                  <div className="flex flex-col space-y-3 mb-2">
                    <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                      {categories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setActiveCategory(cat)} 
                          className={`px-4 py-2 rounded-full whitespace-nowrap text-xs md:text-sm font-bold border transition-all ${
                            activeCategory === cat 
                              ? 'bg-accent border-accent text-white shadow-md shadow-accent/20' 
                              : ' bg-card border-line text-slate-700 dark:text-slate-300 hover:text-fg hover:border-slate-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Cari menu makanan atau minuman..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                      className="w-full bg-card border border-line rounded-xl p-3 text-sm text-fg focus:border-accent outline-none transition-colors shadow-sm" 
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
                  {paginatedMenu.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-card rounded-2xl border border-line">
                      <span className="text-4xl mb-2">🔍</span>
                      <p className="text-sm font-bold text-fg">Tidak ada menu yang sesuai</p>
                      <p className="text-xs text-muted mt-1">Coba kata kunci lain atau pilih kategori Semua.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                      {paginatedMenu.map(item => {
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
                            className={`group bg-card rounded-2xl border text-left transition-all flex flex-col justify-between overflow-hidden relative shadow-sm ${
                              isSoldOut 
                                ? 'opacity-60 border-line bg-surface/50 cursor-not-allowed' 
                                : 'border-line hover:border-accent hover:shadow-lg active:scale-[0.98]'
                            }`}
                          >
                            {/* Culinary Thumbnail Image Box */}
                            <div className="h-24 sm:h-28 w-full bg-surface/70 flex items-center justify-center text-3xl sm:text-4xl relative border-b border-line group-hover:scale-105 transition-transform duration-200">
                              <span>{getCategoryIcon(item.kategori, item.nama)}</span>
                              
                              {isSoldOut ? (
                                <span className="absolute top-2 right-2 text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                                  Habis
                                </span>
                              ) : item.isGroup ? (
                                <span className="absolute top-2 right-2 text-[10px] bg-accent/80 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                                  Varian
                                </span>
                              ) : hasModifiers ? (
                                <span className="absolute top-2 right-2 text-[10px] bg-accent/25 border border-accent/40 text-accent-text px-2 py-0.5 rounded-full font-bold shadow-sm">
                                  + Pilihan
                                </span>
                              ) : null}
                            </div>

                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold line-clamp-1 leading-tight text-xs sm:text-sm text-fg">
                                  {item.nama}
                                </h3>
                                <span className="text-[10px] text-muted mt-0.5 block font-medium">
                                  {item.kategori}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-line/60">
                                <p className="text-accent-text font-black text-xs sm:text-sm">
                                  Rp {item.harga.toLocaleString('id-ID')}
                                </p>
                                {!isSoldOut && (
                                  <span className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center text-xs font-bold shadow-sm group-hover:scale-110 transition-transform">
                                    +
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Catalog Pagination Footer */}
                {filteredMenu.length > menuItemsPerPage && (
                  <div className="p-3 border-t border-line flex items-center justify-between text-xs bg-card shrink-0">
                    <span className="text-muted font-semibold">
                      Menampilkan {((menuPage - 1) * menuItemsPerPage) + 1} - {Math.min(menuPage * menuItemsPerPage, filteredMenu.length)} dari {filteredMenu.length} menu
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={menuPage === 1}
                        onClick={() => setMenuPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-line font-bold disabled:opacity-40 hover:border-accent text-fg transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="px-2 font-bold text-accent-text">
                        {menuPage} / {totalMenuPages}
                      </span>
                      <button
                        type="button"
                        disabled={menuPage === totalMenuPages}
                        onClick={() => setMenuPage(p => Math.min(totalMenuPages, p + 1))}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-line font-bold disabled:opacity-40 hover:border-accent text-fg transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Floating Cart Button (Mobile) */}
        {(!isMobileCartOpen && (cart.length > 0 || selectedTable)) && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-line shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30">
            <button 
              onClick={openMobileCart}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-2xl py-3.5 px-5 flex justify-between items-center shadow-lg shadow-accent/30 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-card/20 px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" /></svg>
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </div>
                <div className="text-left leading-tight text-white">
                   <span className="block text-[11px] opacity-90 font-bold uppercase tracking-wider">
                     {customerName ? `${selectedTableObj ? `Meja ${selectedTableObj.nomor.replace(/^Meja\s*/i, '')} • ` : ''}${customerName}` : (selectedTableObj ? `Meja ${selectedTableObj.nomor.replace(/^Meja\s*/i, '')}` : 'Tanpa Meja')}
                   </span>
                   <span className="block font-black text-sm">Lihat Keranjang</span>
                </div>
              </div>
              <div className="font-black text-base tracking-tight bg-card/20 px-3 py-1 rounded-xl shadow-sm">
                Rp {totalPrice.toLocaleString('id-ID')} →
              </div>
            </button>
          </div>
        )}

        {/* Desktop Sidebar Cart */}
        <div className="hidden lg:flex flex-col w-80 xl:w-96 bg-card border-l border-line shadow-2xl z-20 shrink-0">
          {renderCartInner(false)}
        </div>
      </div>
      </div>

      {/* ======================================================== */}
      {/* --- DEDICATED MOBILE & TABLET APPLICATION SHELL (< 1024px) --- */}
      {/* ======================================================== */}
      <div className="flex lg:hidden flex-col h-full w-full overflow-hidden bg-app">
        {/* Mobile Top Header */}
        <MobileHeader
          storeSettings={storeSettings}
          activeShift={activeShift}
          currentShiftStats={currentShiftStats}
          onOpenCashMovement={() => setIsCashMovementModalOpen(true)}
          onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
          onOpenCloseShiftModal={openCloseShiftModal}
        />

        {/* Mobile Active Screen Views */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {mobileTab === 'home' && (
            <MobileHomeScreen
              menuData={menuData}
              activeShift={activeShift}
              currentShiftStats={currentShiftStats}
              tableData={tableData}
              activeOrders={activeOrders}
              onNavigate={(t) => setMobileTab(t)}
              onAddToCart={(item) => addToCart(item)}
              onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
              onOpenCloseShiftModal={openCloseShiftModal}
              onOpenCashMovement={() => setIsCashMovementModalOpen(true)}
              onSearchFocus={(q) => {
                setSearchQuery(q);
                setMobileTab('menu');
              }}
            />
          )}

          {mobileTab === 'menu' && (
            <MobileCatalogScreen
              menuData={menuData}
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAddToCart={(item) => addToCart(item)}
            />
          )}

          {mobileTab === 'meja' && (
            <MobileTableScreen
              tableData={tableData}
              activeOrders={activeOrders}
              selectedTable={selectedTable}
              onSelectTable={(id) => setSelectedTable(id)}
              onTableAction={(table) => {
                handleTableClick(table);
                setMobileTab('menu');
              }}
              onOpenNewOrderForTable={(tableId) => {
                setSelectedTable(tableId);
                setOrderType('Dine-in');
                setMobileTab('menu');
              }}
              onClearTable={async (tableId) => {
                await clearTable(tableId);
                await loadData();
              }}
            />
          )}

          {mobileTab === 'nota' && (
            <MobileOrdersScreen
              allOrders={allOrders}
              onReprintReceipt={(order) => {
                const receiptDoc = {
                  id: order.id,
                  tableId: order.tableId,
                  customerName: order.customerName,
                  orderType: order.orderType,
                  items: order.items,
                  total: order.total,
                  paymentMethod: order.paymentMethod,
                  cashTendered: order.cashTendered,
                  change: order.change,
                  date: order.createdAt || new Date().toISOString(),
                  tax: order.tax || 0,
                  service: order.service || 0,
                  discount: order.discount || 0,
                  subtotal: order.subtotal || order.total,
                };
                handlePrint('all', receiptDoc);
              }}
              onOpenSplitBill={(order) => {
                setSplitBillTargetOrder(order);
                setIsSplitBillModalOpen(true);
                pushModalHistory('splitbill');
              }}
            />
          )}

          {mobileTab === 'lainnya' && (
            <MobileMoreScreen
              storeSettings={storeSettings}
              activeShift={activeShift}
              currentShiftStats={currentShiftStats}
              onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
              onOpenCloseShiftModal={openCloseShiftModal}
              onOpenCashMovement={() => setIsCashMovementModalOpen(true)}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
            />
          )}

          {/* Floating Cart Bar (appears when items exist in cart and cart sheet is closed) */}
          {!isMobileCartOpen && (
            <MobileFloatingCartBar
              itemCount={cart.reduce((s, i) => s + i.qty, 0)}
              totalPrice={totalPrice}
              onOpenCart={openMobileCart}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          currentTab={mobileTab}
          onTabChange={setMobileTab}
          occupiedTablesCount={(tableData || []).filter((t) => t && (t.status === 'terisi' || t.status === 'open')).length}
          enableTables={isTableManagementEnabled(storeSettings)}
        />

        {/* Mobile Bottom Sheet Cart */}
        {isMobileCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={closeMobileCart}
              aria-label="Tutup keranjang"
            />
            <div 
              className="relative bg-surface rounded-t-3xl landscape:rounded-none shadow-2xl flex flex-col max-h-[88vh] landscape:max-h-[100dvh] landscape:h-[100dvh] w-full animate-in slide-in-from-bottom-2 duration-200 transition-transform ease-out overflow-hidden"
              style={{
                transform: cartSheetDragY > 0 ? `translateY(${cartSheetDragY}px)` : undefined,
                touchAction: 'pan-y'
              }}
            >
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
            className=" bg-card rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/60 text-accent-text flex items-center justify-center text-2xl font-black mb-3">
              💼
            </div>
            <h3 className="text-xl font-black text-fg">Buka Shift Kasir Baru</h3>
            <p className="text-xs text-muted mt-1 mb-5">Mulai sesi kerja kasir dan masukkan uang kas modal awal di laci.</p>

            <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Kasir / Operator:</label>
                <input 
                  type="text" 
                  value={shiftOperatorName}
                  onChange={(e) => setShiftOperatorName(e.target.value)}
                  placeholder="Nama Kasir"
                  className="w-full border border-line rounded-xl p-2.5 text-sm text-fg bg-surface outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Modal Awal Laci Kas (Rp):</label>
                <input 
                  type="number" 
                  value={shiftStartingCash}
                  onChange={(e) => setShiftStartingCash(e.target.value)}
                  placeholder="0"
                  className="w-full border border-line rounded-xl p-3 text-lg font-black text-fg bg-surface outline-none focus:border-accent"
                  required
                />
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {[100000, 200000, 500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setShiftStartingCash(amt.toString())}
                      className="py-1 px-2 text-xs bg-line hover:bg-slate-600 rounded-lg text-fg font-semibold transition-colors"
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
                  className="flex-1 py-3 bg-line text-fg rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-black shadow-lg shadow-accent/20 transition-all active:scale-95"
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
            className=" bg-card rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-fg mb-1">Catat Arus Kas Laci</h3>
            <p className="text-xs text-muted mb-4">Catat pengeluaran operasional toko atau penambahan modal kas kecil.</p>

            <form onSubmit={handleCashMovementSubmit} className="space-y-4">
              <div className="flex rounded-xl bg-line p-1">
                <button
                  type="button"
                  onClick={() => setCashMovementType('out')}
                  className={'flex-1 py-2 rounded-lg text-xs font-bold transition-all ' + (cashMovementType === 'out' ? 'bg-rose-600 text-white shadow' : ' text-slate-300')}
                >
                  🔴 Kas Keluar (Biaya)
                </button>
                <button
                  type="button"
                  onClick={() => setCashMovementType('in')}
                  className={'flex-1 py-2 rounded-lg text-xs font-bold transition-all ' + (cashMovementType === 'in' ? 'bg-accent text-white shadow' : ' text-slate-300')}
                >
                  🔵 Kas Masuk (+)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nominal (Rp):</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={cashMovementAmount}
                  onChange={(e) => setCashMovementAmount(e.target.value)}
                  className="w-full border border-line rounded-xl p-3 text-lg font-black text-fg bg-surface outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Alasan / Keperluan:</label>
                <input 
                  type="text" 
                  placeholder="Keterangan pengeluaran / pemasukan kas"
                  value={cashMovementReason}
                  onChange={(e) => setCashMovementReason(e.target.value)}
                  className="w-full border border-line rounded-xl p-2.5 text-sm text-fg bg-surface outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleCloseCashMovement}
                  className="flex-1 py-3 bg-line text-fg rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 transition-all active:scale-95"
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
            className=" bg-card rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl my-8 border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/60 text-accent-text flex items-center justify-center text-2xl font-black">
                📊
              </div>
              <div>
                <h3 className="text-xl font-black text-fg">Tutup Shift Kasir (Z-Report)</h3>
                <p className="text-xs text-muted">Operator: <strong>{currentShiftStats.operatorName}</strong></p>
              </div>
            </div>

            {/* Petunjuk Blind Close */}
            <div className=" bg-accent/40 p-4 rounded-2xl border border-accent/40 mb-5">
              <p className="text-xs font-bold text-accent-text mb-1">🔒 Prosedur Blind Close:</p>
              <p className="text-xs text-accent-text leading-relaxed">
                Silakan hitung seluruh uang fisik (kertas & koin) yang ada di laci kasir saat ini. Angka sistem sengaja disembunyikan agar hasil penghitungan murni objektif.
              </p>
            </div>
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-fg mb-1">
                  Hitung & Masukkan Uang Fisik di Laci (Rp):
                </label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0"
                  value={countedPhysicalCash}
                  onChange={(e) => setCountedPhysicalCash(e.target.value)}
                  className="w-full border-2 border-accent rounded-xl p-3 text-2xl font-black text-fg bg-surface outline-none"
                  required
                />
              </div>

              {countedPhysicalCash !== "" && (
                <div className="p-3 rounded-xl border flex justify-between items-center text-xs font-bold" style={{
                  backgroundColor: Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '#eff6ff' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? '#fef2f2' : '#eff6ff',
                  borderColor: Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '#bfdbfe' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? '#fecaca' : '#bfdbfe',
                }}>
                  <span>Status Selisih Kas:</span>
                  <span className="text-sm font-black" style={{
                    color: Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '#1d4ed8' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? '#991b1b' : '#1e40af',
                  }}>
                    {Number(countedPhysicalCash) === currentShiftStats.expectedCash ? '✓ COCOK / PAS (Rp 0)' : Number(countedPhysicalCash) < currentShiftStats.expectedCash ? 'KURANG (-Rp ' + (currentShiftStats.expectedCash - Number(countedPhysicalCash)).toLocaleString('id-ID') + ')' : 'LEBIH (+Rp ' + (Number(countedPhysicalCash) - currentShiftStats.expectedCash).toLocaleString('id-ID') + ')'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-muted mb-1">Catatan Penutupan (Opsional):</label>
                <input 
                  type="text" 
                  placeholder="Catatan hasil hitung kasir"
                  value={closingShiftNotes}
                  onChange={(e) => setClosingShiftNotes(e.target.value)}
                  className="w-full border border-line rounded-xl p-2.5 text-xs text-fg bg-surface outline-none focus:border-accent"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleCloseCloseShift}
                  className="flex-1 py-3 bg-line text-fg rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-black shadow-lg shadow-accent/20 transition-all active:scale-95"
                >
                  Tutup & Cetak Struk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pilihan Modifier & Add-on Menu (High-Contrast Light Blue & White Bottom Sheet) */}
      {activeModItem && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleCloseModifiers}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-2 border-blue-200 relative flex flex-col max-h-[88vh] transition-transform ease-out text-slate-900"
            style={{
              transform: modSheetDragY > 0 ? `translateY(${modSheetDragY}px)` : undefined,
              touchAction: 'pan-y'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div 
              className="flex flex-col items-center justify-center pt-1 pb-2 cursor-pointer select-none sm:hidden touch-none"
              onTouchStart={handleModTouchStart}
              onTouchMove={handleModTouchMove}
              onTouchEnd={handleModTouchEnd}
              onClick={handleCloseModifiers}
            >
              <div className="w-14 h-1.5 bg-blue-300 rounded-full mb-1"></div>
              <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                <span>↓</span> Tarik ke bawah untuk tutup
              </span>
            </div>

            <div 
              className="flex justify-between items-center pb-4 border-b border-blue-100 gap-3"
              onTouchStart={handleModTouchStart}
              onTouchMove={handleModTouchMove}
              onTouchEnd={handleModTouchEnd}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl shrink-0">
                  {getCategoryIcon(activeModItem.kategori, activeModItem.nama)}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase block">Pilihan Menu &amp; Varian</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">{activeModItem.nama}</h3>
                  <p className="text-xs text-blue-700 font-extrabold mt-0.5">
                    Harga Dasar: Rp {activeModItem.harga.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModifiers}
                className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center justify-center text-sm font-black active:scale-90 transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Daftar Kelompok Modifier */}
            <div className="mt-4 space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {(activeModItem.modifiers || []).map((group: any) => {
                const selected = selectedModOptions[group.id] || [];
                const isSingle = group.maxSelect === 1;

                return (
                  <div key={group.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-black text-slate-900">
                        {group.nama}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${
                        group.minSelect >= 1 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {group.minSelect >= 1 ? (isSingle ? 'Wajib (Pilih 1)' : `Wajib (Min ${group.minSelect})`) : 'Opsional'}
                      </span>
                    </div>

                    {isSingle ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {group.options.map((opt: any) => {
                          const isChecked = selected.some((o: any) => o.id === opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleModOption(group, opt)}
                              className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                                isChecked
                                  ? 'bg-blue-600 border-blue-600 text-white font-black shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400 font-bold'
                              }`}
                            >
                              <div className="text-xs font-extrabold leading-tight">{opt.nama}</div>
                              <div className={`text-[10px] mt-0.5 ${isChecked ? 'text-blue-100 font-extrabold' : 'text-blue-600 font-bold'}`}>
                                {opt.harga > 0 ? `+Rp ${opt.harga.toLocaleString('id-ID')}` : 'Gratis'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        {group.options.map((opt: any) => {
                          const isChecked = selected.some((o: any) => o.id === opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleModOption(group, opt)}
                              className={`w-full p-2.5 rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-600 text-blue-900 font-extrabold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                                  isChecked ? 'bg-blue-600 border-blue-600 text-white font-black' : 'border-slate-300 bg-white'
                                }`}>
                                  {isChecked ? '✓' : ''}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{opt.nama}</span>
                              </div>
                              {opt.harga > 0 ? (
                                <span className="text-xs font-black text-blue-600">
                                  +Rp {opt.harga.toLocaleString('id-ID')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500">Gratis</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Catatan Khusus Dapur */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Catatan Khusus untuk Dapur (Opsional):
                </label>
                <input
                  type="text"
                  value={modItemNotes}
                  onChange={(e) => {
                    modDirtyRef.current = true;
                    setModItemNotes(e.target.value);
                  }}
                  placeholder="Contoh: jangan terlalu pedas, es dipisah..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 outline-none"
                />
              </div>
            </div>

            {/* Bottom Bar Total & Action */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-600 block font-bold uppercase">Subtotal Item</span>
                <span className="text-base font-black text-blue-600">
                  Rp {(
                    activeModItem.harga +
                    Object.values(selectedModOptions).flat().reduce((sum: number, opt: any) => sum + (opt.harga || 0), 0)
                  ).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModifiers}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModifiers}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition-transform active:scale-95"
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
            className=" bg-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-line my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center pb-4 border-b border-line">
              <span className="text-4xl">🏁</span>
              <h3 className="text-xl font-black text-fg mt-2">Laporan Tutup Shift (Z-Report)</h3>
              <p className="text-xs text-muted">Shift #{blindCloseResult.id} • Operator: <span className="font-bold text-fg">{blindCloseResult.operatorName}</span></p>
            </div>

            {/* Status Rekonsiliasi Banner */}
            <div className={`mt-4 p-4 rounded-2xl text-center border ${
              blindCloseResult.cashDifference === 0 || blindCloseResult.difference === 0 
                ? ' bg-accent/40 border-accent/40 text-accent-text'
                : (blindCloseResult.cashDifference || blindCloseResult.difference || 0) > 0
                ? ' bg-amber-950/40 border-amber-700 text-amber-300'
                : ' bg-rose-950/40 border-rose-700 text-rose-300'
            }`}>
              <p className="text-[11px] font-bold uppercase tracking-wider">Hasil Rekonsiliasi Kas Fisik</p>
              <p className="text-xl font-black mt-1">
                {(blindCloseResult.cashDifference === 0 || blindCloseResult.difference === 0) && '🔵 COCOK / PAS (Rp 0)'}
                {(blindCloseResult.cashDifference || blindCloseResult.difference || 0) > 0 && `🟡 LEBIH (+Rp ${(blindCloseResult.cashDifference || blindCloseResult.difference).toLocaleString('id-ID')})`}
                {(blindCloseResult.cashDifference || blindCloseResult.difference || 0) < 0 && `🔴 KURANG (-Rp ${Math.abs(blindCloseResult.cashDifference || blindCloseResult.difference).toLocaleString('id-ID')})`}
              </p>
            </div>

            {/* Rincian Finansial Kas Fisik Laci */}
            <div className="mt-4 bg-surface/60 p-4 rounded-2xl border border-line space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Modal Awal Kas:</span>
                <span className="font-bold">Rp {blindCloseResult.startingCash?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-accent-text font-bold">
                <span>+ Penjualan Tunai Bersih:</span>
                <span>Rp {blindCloseResult.cashSales?.toLocaleString('id-ID')}</span>
              </div>
              {blindCloseResult.cashIn > 0 && (
                <div className="flex justify-between text-accent-text font-medium">
                  <span>+ Kas Masuk Manual:</span>
                  <span>Rp {blindCloseResult.cashIn?.toLocaleString('id-ID')}</span>
                </div>
              )}
              {blindCloseResult.cashOut > 0 && (
                <div className="flex justify-between text-rose-400 font-medium">
                  <span>- Kas Keluar (Biaya Operasional):</span>
                  <span>-Rp {blindCloseResult.cashOut?.toLocaleString('id-ID')}</span>
                </div>
              )}
              {blindCloseResult.cashRefunds > 0 && (
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>- Refund Tunai Pelanggan:</span>
                  <span>-Rp {blindCloseResult.cashRefunds?.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-line flex justify-between font-bold text-fg">
                <span>Total Kas Fisik Seharusnya:</span>
                <span className="font-black text-sm">Rp {blindCloseResult.expectedCash?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-accent-text font-bold">
                <span>Hasil Hitung Fisik Kasir:</span>
                <span className="font-black text-sm">Rp {blindCloseResult.actualCash?.toLocaleString('id-ID')}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-line flex justify-between font-black text-sm">
                <span>Selisih:</span>
                <span className={(blindCloseResult.cashDifference || blindCloseResult.difference || 0) === 0 ? 'text-accent-text' : (blindCloseResult.cashDifference || blindCloseResult.difference || 0) > 0 ? 'text-amber-400' : 'text-rose-400'}>
                  Rp {(blindCloseResult.cashDifference !== undefined ? blindCloseResult.cashDifference : blindCloseResult.difference)?.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Info Non-Tunai (Rekonsiliasi Bank/QRIS) */}
            <div className="mt-3 p-3 bg-accent/30 rounded-xl border border-accent/40 text-xs">
              <div className="flex justify-between text-accent-text font-bold">
                <span>Penjualan Non-Tunai (QRIS/Transfer):</span>
                <span>Rp {blindCloseResult.nonCashSales?.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[10px] text-accent-text mt-1 leading-relaxed">
                ℹ️ Penjualan QRIS & transfer langsung masuk ke rekening bank/merchant QRIS, tidak dihitung sebagai uang fisik di laci kasir.
              </p>
            </div>

            {blindCloseResult.notes && (
              <div className="mt-3 text-xs text-muted bg-surface p-2.5 rounded-xl">
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
                  className="flex-1 py-3 bg-line hover:bg-slate-600 text-fg rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <span>🖨️ Cetak Z-Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBlindCloseResult(null)}
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 transition-all active:scale-95"
                >
                  Selesai & Tutup
                </button>
              </div>
              <button
                type="button"
                onClick={handleExportBackupFromPos}
                className="w-full py-2.5 bg-accent/40 hover:bg-accent-hover/40 text-accent-text border border-accent/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>💾 Cadangkan Data Kasir (Unduh JSON)</span>
              </button>
              {backupSuccessNotice && (
                <p className="text-[11px] font-bold text-center text-accent-text animate-in fade-in">
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
            className=" bg-card rounded-t-3xl sm:rounded-2xl p-5 md:p-7 max-w-xl w-full shadow-2xl border border-line my-0 sm:my-6 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile touch */}
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-3 sm:hidden" />
            
            {/* Header Modal */}
            <div className="flex justify-between items-start pb-3 border-b border-line">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-accent-text uppercase">Sistem Pembayaran Fleksibel</span>
                <h3 className="text-xl font-black text-fg flex items-center gap-2">
                  <span>✂️ Split Bill & Cicil Tagihan</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Nota #A-{splitBillTargetOrder.id} • {splitBillTargetOrder.tableName || (splitBillTargetOrder.tableId ? 'Meja ' + splitBillTargetOrder.tableId : splitBillTargetOrder.orderType)} • Tamu: <span className="font-bold text-fg">{splitBillTargetOrder.customerName || 'Tamu'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSplitBill}
                className="w-8 h-8 rounded-full bg-line text-muted hover:text-fg flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pt-3">
              
              {/* Metric Card: Real-time Balances */}
              <div className="grid grid-cols-3 gap-2 bg-surface/60 p-3 rounded-2xl border border-line text-center">
                <div>
                  <span className="text-[10px] text-muted block font-bold">Total Nota</span>
                  <span className="text-xs md:text-sm font-black text-fg">
                    Rp {splitBillTargetOrder.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-accent-text block font-bold">Sudah Terbayar</span>
                  <span className="text-xs md:text-sm font-black text-accent-text">
                    Rp {(splitBillTargetOrder.paidAmount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className=" bg-amber-950/40 rounded-xl py-1 px-1 border border-amber-800">
                  <span className="text-[10px] text-amber-300 block font-bold uppercase">Sisa Tagihan</span>
                  <span className="text-xs md:text-sm font-black text-amber-400">
                    Rp {(splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Tab Selector 3 Metode Split */}
              <div className="flex rounded-2xl bg-line p-1">
                <button
                  type="button"
                  onClick={() => setSplitTab('item')}
                  className={'flex-1 py-2 rounded-xl text-xs font-bold transition-all ' + (splitTab === 'item' ? ' bg-card text-amber-400 shadow-sm' : 'text-muted hover:text-fg')}
                >
                  🍱 Split per Menu
                </button>
                <button
                  type="button"
                  onClick={() => setSplitTab('equal')}
                  className={'flex-1 py-2 rounded-xl text-xs font-bold transition-all ' + (splitTab === 'equal' ? ' bg-card text-amber-400 shadow-sm' : 'text-muted hover:text-fg')}
                >
                  👥 Bagi Rata
                </button>
                <button
                  type="button"
                  onClick={() => setSplitTab('partial')}
                  className={'flex-1 py-2 rounded-xl text-xs font-bold transition-all ' + (splitTab === 'partial' ? ' bg-card text-amber-400 shadow-sm' : 'text-muted hover:text-fg')}
                >
                  💵 Cicil / Parsial
                </button>
              </div>

              {/* TAB 1: SPLIT PER MENU */}
              {splitTab === 'item' && (
                <div className="space-y-2 bg-surface/40 p-3 rounded-2xl border border-line">
                  <span className="text-xs font-bold text-slate-300 block mb-1">
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
                        <div key={item.id} className={'flex justify-between items-center p-2 rounded-xl border text-xs ' + (isFullyPaid ? ' bg-card/50 opacity-60 border-line' : ' bg-card border-line')}>
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-fg block">{item.namaMenu || item.nama}</span>
                            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                              <div className="text-[10px] text-muted">
                                {item.selectedModifiers.map((m: any) => m.optionName).join(', ')}
                              </div>
                            )}
                            <div className="text-[11px] text-yellow-500 font-bold">
                              Rp {(item.hargaSatuan || item.harga).toLocaleString('id-ID')}
                              <span className="text-muted font-normal ml-2">({paidQty}/{totalQty} lunas)</span>
                            </div>
                          </div>

                          {isFullyPaid ? (
                            <span className="text-[10px] font-bold text-accent-text bg-accent/60 px-2 py-1 rounded-lg">
                              ✓ Lunas
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-line">
                              <button
                                type="button"
                                onClick={() => setSplitSelectedItems(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                className="w-6 h-6 rounded bg-card font-black text-fg"
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
                  <div className="pt-2 border-t border-line flex justify-between items-center text-xs font-bold">
                    <span>Estimasi Subtotal Pilihan:</span>
                    <span className=" text-amber-400 font-black text-sm">
                      Rp {calculateSplitItemTotal().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: BAGI RATA (SPLIT EQUALLY) */}
              {splitTab === 'equal' && (
                <div className="space-y-3 bg-surface/40 p-4 rounded-2xl border border-line">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300">Bagi rata untuk:</span>
                    <div className="flex gap-1.5">
                      {[2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSplitNumPeople(n)}
                          className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' + (splitNumPeople === n ? 'bg-amber-500 text-white shadow' : ' bg-card text-slate-300 border border-line')}
                        >
                          {n} Orang
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kalkulasi Per Orang dengan Pembulatan Presisi */}
                  <div className=" bg-card p-3 rounded-xl border border-line space-y-1.5 text-xs">
                    {Array.from({ length: splitNumPeople }).map((_, idx) => {
                      const rem = (splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total);
                      const baseShare = Math.floor(rem / splitNumPeople);
                      const mod = rem % splitNumPeople;
                      const share = idx === 0 ? baseShare + mod : baseShare;

                      return (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-line last:border-0">
                          <span className="font-semibold text-slate-300">
                            👤 Bagian Orang #{idx + 1} {idx === 0 && mod > 0 && <span className="text-[10px] text-muted">(+sisa pembulatan)</span>}:
                          </span>
                          <span className="font-black text-amber-400">
                            Rp {share.toLocaleString('id-ID')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted leading-snug">
                    ℹ️ Pembayaran ini akan melunasi <b>Bagian Orang #1</b> sebesar <b>Rp {(Math.floor((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) / splitNumPeople) + ((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) % splitNumPeople)).toLocaleString('id-ID')}</b>.
                  </p>
                </div>
              )}

              {/* TAB 3: CICIL / PARSIAL BEBAS */}
              {splitTab === 'partial' && (
                <div className="space-y-3 bg-surface/40 p-4 rounded-2xl border border-line">
                  <label className="block text-xs font-bold text-slate-300">
                    Masukkan nominal yang ingin dibayar saat ini (Rp):
                  </label>
                  <input
                    type="number"
                    value={splitCustomAmount}
                    onChange={(e) => setSplitCustomAmount(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl p-3 text-lg font-black text-fg outline-none focus:border-amber-500"
                    placeholder="Contoh: 50000"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {[20000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSplitCustomAmount(amt.toString())}
                        className="py-1 px-2 text-xs bg-card border border-line rounded-lg font-semibold text-slate-300 hover:bg-card"
                      >
                        {amt / 1000}rb
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSplitCustomAmount((splitBillTargetOrder.remainingBalance !== undefined ? splitBillTargetOrder.remainingBalance : splitBillTargetOrder.total).toString())}
                      className="py-1 px-2 text-xs bg-amber-950/60 border border-amber-800 rounded-lg font-bold text-amber-400"
                    >
                      Sisa Tagihan
                    </button>
                  </div>
                </div>
              )}

              {/* METODE PEMBAYARAN & UANG DITERIMA */}
              <div className=" bg-surface/40 p-4 rounded-2xl border border-line space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Metode Pembayaran untuk Split Ini:</span>
                <div className="grid grid-cols-3 gap-2">
                  {["Cash", "QRIS", "Transfer"].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitPaymentMethod(m)}
                      className={'py-2 rounded-xl text-xs font-bold transition-all border ' + (splitPaymentMethod === m ? 'bg-accent border-accent text-white shadow' : ' bg-card border-line text-slate-300')}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {splitPaymentMethod === 'Cash' && (
                  <div className="pt-2 border-t border-line">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-muted">Uang Tunai Diterima Kasir (Rp):</label>
                      <button
                        type="button"
                        onClick={() => {
                          const amt = splitTab === 'item' ? calculateSplitItemTotal() :
                                      splitTab === 'equal' ? (Math.floor((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) / splitNumPeople) + ((splitBillTargetOrder.remainingBalance || splitBillTargetOrder.total) % splitNumPeople)) :
                                      Number(splitCustomAmount) || 0;
                          setSplitCashTendered(amt.toString());
                        }}
                        className="text-[11px] text-accent-text font-bold hover:underline"
                      >
                        Uang Pas
                      </button>
                    </div>
                    <input
                      type="number"
                      value={splitCashTendered}
                      onChange={(e) => setSplitCashTendered(e.target.value)}
                      placeholder="Nominal uang kertas yang diserahkan"
                      className="w-full bg-card border border-line rounded-xl p-2.5 text-base font-black text-fg outline-none focus:border-accent"
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
                  <label className="block text-[11px] font-bold text-muted mb-1">Catatan Tambahan (Opsional):</label>
                  <input
                    type="text"
                    value={splitNotes}
                    onChange={(e) => setSplitNotes(e.target.value)}
                    placeholder="Contoh: Dibayar oleh Mas Budi"
                    className="w-full bg-card border border-line rounded-xl p-2 text-xs text-fg"
                  />
                </div>
              </div>

              {/* RIWAYAT PEMBAYARAN PARSIAL NOTA INI */}
              {splitBillTargetOrder.payments && splitBillTargetOrder.payments.length > 0 && (
                <div className=" bg-surface/40 p-4 rounded-2xl border border-line">
                  <span className="text-xs font-black text-fg block mb-2">
                    📋 Riwayat Cicilan / Pembayaran Sebelumnya ({splitBillTargetOrder.payments.length}):
                  </span>
                  <div className="space-y-2">
                    {splitBillTargetOrder.payments.map((p: any, pIdx: number) => {
                      const isRef = p.status === 'refunded';
                      return (
                        <div key={p.id || pIdx} className={'p-2.5 rounded-xl border text-xs flex justify-between items-center ' + (isRef ? ' bg-rose-950/20 border-rose-900/40' : ' bg-card border-line')}>
                          <div>
                            <span className="font-bold text-fg">
                              #{pIdx + 1} • {p.paymentMethod} • Rp {p.amount.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-muted block">
                              {p.paidAt ? new Date(p.paidAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} • {p.splitType} • {p.operatorName}
                            </span>
                            {isRef && (
                              <span className="text-[10px] font-bold text-rose-400 block mt-0.5">
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
                                className="px-2 py-1 bg-line hover:bg-line text-fg rounded-lg text-[10px] font-bold"
                              >
                                🖨️ Struk
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestRefundPayment(p)}
                                className="px-2 py-1 bg-rose-950 text-rose-400 hover:bg-rose-500/15 rounded-lg text-[10px] font-bold border border-rose-800"
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
            <div className="mt-4 pt-3 border-t border-line flex space-x-2">
              <button
                type="button"
                onClick={handleCloseSplitBill}
                className="flex-1 py-3 bg-line text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleExecuteSplitPayment}
                disabled={isSplitProcessing}
                className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
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
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-rose-400 mb-2">Konfirmasi Refund Pembayaran</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Anda akan mengembalikan dana sebesar <b>Rp {refundTargetPayment.amount.toLocaleString('id-ID')}</b> ({refundTargetPayment.paymentMethod}) kepada pelanggan. Sisa tagihan meja akan bertambah kembali.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Alasan Refund:</label>
                <input
                  type="text"
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder="Keterangan pembatalan transaksi"
                  className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs text-fg outline-none focus:border-rose-500"
                />
              </div>

              {storeSettings.enablePin && (
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">PIN Otorisasi Admin:</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={refundPinInput}
                    onChange={(e) => setRefundPinInput(e.target.value)}
                    placeholder="Masukkan 4-6 digit PIN"
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-center text-lg font-black tracking-widest text-fg outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => { setIsRefundModalOpen(false); setRefundTargetPayment(null); }}
                className="flex-1 py-2.5 bg-line text-fg rounded-xl text-xs font-bold transition-colors"
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
            className=" bg-card rounded-2xl p-6 max-w-xs w-full shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-fg mb-3">Beri Diskon / Promo</h3>
            
            <div className="flex rounded-xl bg-line p-1 mb-4">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ' + (discountType === 'percent' ? ' bg-card text-accent-text shadow-sm' : 'text-muted hover:text-slate-200')}
              >
                Persen (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('nominal')}
                className={'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ' + (discountType === 'nominal' ? ' bg-card text-accent-text shadow-sm' : 'text-muted hover:text-slate-200')}
              >
                Nominal (Rp)
              </button>
            </div>

            <label className="block text-xs font-bold text-muted mb-1">
              {discountType === 'percent' ? 'Masukkan Persen Diskon (%):' : 'Masukkan Nominal Diskon (Rp):'}
            </label>
            <input 
              type="number"
              placeholder="0"
              value={tempDiscountVal}
              onChange={(e) => setTempDiscountVal(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl p-3 text-lg font-black text-fg mb-4 outline-none focus:border-accent"
            />

            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={handleCloseDiscountModal}
                className="flex-1 py-2.5 bg-line text-fg rounded-xl font-bold text-xs transition-colors"
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
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs shadow-lg shadow-accent/20 transition-all active:scale-95"
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
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end -mt-2 -mr-2 mb-1">
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setUnsavedConfirm(null)}
                className="text-muted hover:text-fg p-1.5 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="w-12 h-12 bg-amber-950/60 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-fg mb-1">
              {unsavedConfirm.title || "Perubahan Belum Disimpan"}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              {unsavedConfirm.message || "Input yang Anda ketik belum disimpan. Yakin ingin membatalkan?"}
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                aria-label="Batal"
                onClick={() => setUnsavedConfirm(null)}
                className="flex-1 py-2.5 bg-line hover:bg-slate-600 text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Batal
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
