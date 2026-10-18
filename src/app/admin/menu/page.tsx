"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import {
  getMenus,
  createMenu,
  updateMenu,
  toggleMenuSoldOut,
  deleteMenus,
  bulkImportMenus,
  bulkUpdateMenuPrices,
  bulkUpdateMenuCategory,
  bulkToggleMenuStock,
  bulkDeleteMenus,
  exportAllData,
} from "@/lib/api";
import {
  downloadMenuTemplate,
  parseMenuFile,
  exportMenusToExcel,
  downloadFile,
  MenuImportValidationResult,
} from "@/lib/excelUtils";
import { App } from "@capacitor/app";
import { ModifierGroup, ModifierOption } from "@/lib/dexie";
import BarcodeCameraModal from "@/components/BarcodeCameraModal";

type MenuItem = {
  id: number;
  sku?: string;
  nama: string;
  harga: number;
  kategori: string;
  isSoldOut?: boolean;
  modifiers?: ModifierGroup[];
};

export default function AdminMenuPage() {
  const { showToast } = useAdmin();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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

  // Multi-select for Bulk Actions
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

  // Bulk Modals State
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [bulkPriceType, setBulkPriceType] = useState<"nominal" | "percent">("nominal");
  const [bulkPriceValue, setBulkPriceValue] = useState("");

  const [isBulkCategoryOpen, setIsBulkCategoryOpen] = useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState("Nasi");
  const [isCustomBulkCategory, setIsCustomBulkCategory] = useState(false);
  const [customBulkCategory, setCustomBulkCategory] = useState("");

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<MenuImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<"upsert" | "create_only" | "update_existing">("upsert");
  const [importAutoBackup, setImportAutoBackup] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Bottom Sheet Form State (Tambah & Edit Single)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [formSku, setFormSku] = useState("");
  const [isBarcodeScanOpen, setIsBarcodeScanOpen] = useState(false);
  const [formNama, setFormNama] = useState("");
  const [formHarga, setFormHarga] = useState("");
  const [formKategori, setFormKategori] = useState("Lauk");
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [customKategori, setCustomKategori] = useState("");
  const [formIsSoldOut, setFormIsSoldOut] = useState(false);
  const [formEnableModifiers, setFormEnableModifiers] = useState(false);
  const [formModifiers, setFormModifiers] = useState<ModifierGroup[]>([]);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [stockUpdatingId, setStockUpdatingId] = useState<number | null>(null);

  // Confirmation Modals Single Delete & Unsaved Guard
  const [menuToDelete, setMenuToDelete] = useState<MenuItem | null>(null);
  const [unsavedConfirm, setUnsavedConfirm] = useState<{
    isOpen: boolean;
    onDiscard: () => void;
  } | null>(null);

  const loadData = async () => {
    try {
      const data = await getMenus();
      setMenus(data);
    } catch (e) {
      console.error("Error loading menus:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Back button handling
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (unsavedConfirm?.isOpen) {
          setUnsavedConfirm(null);
        } else if (menuToDelete) {
          setMenuToDelete(null);
        } else if (isBulkDeleteOpen) {
          setIsBulkDeleteOpen(false);
        } else if (isBulkPriceOpen) {
          setIsBulkPriceOpen(false);
        } else if (isBulkCategoryOpen) {
          setIsBulkCategoryOpen(false);
        } else if (isImportOpen) {
          setIsImportOpen(false);
        } else if (isSheetOpen) {
          handleCloseSheet();
        } else if (selectedMenuIds.length > 0) {
          setSelectedMenuIds([]);
        }
      })
        .then((handle) => {
          removeListener = handle;
        })
        .catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [
    isSheetOpen,
    unsavedConfirm,
    menuToDelete,
    isBulkDeleteOpen,
    isBulkPriceOpen,
    isBulkCategoryOpen,
    isImportOpen,
    selectedMenuIds,
    formNama,
    formHarga,
    formKategori,
    customKategori,
  ]);

  // Sort & Pagination State
  const [sortBy, setSortBy] = useState<"nama_asc" | "nama_desc" | "harga_asc" | "harga_desc" | "stok_first">("nama_asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Reset pagination on filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, itemsPerPage]);

  const categories = ["Semua", ...Array.from(new Set(menus.map((m) => m.kategori).filter(Boolean)))];

  const filteredMenus = menus.filter((m) => {
    const matchesSearch =
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sku && m.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "Semua" || m.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedMenus = [...filteredMenus].sort((a, b) => {
    if (sortBy === "nama_asc") return a.nama.localeCompare(b.nama, "id");
    if (sortBy === "nama_desc") return b.nama.localeCompare(a.nama, "id");
    if (sortBy === "harga_asc") return a.harga - b.harga;
    if (sortBy === "harga_desc") return b.harga - a.harga;
    if (sortBy === "stok_first") {
      if (Boolean(a.isSoldOut) === Boolean(b.isSoldOut)) return a.nama.localeCompare(b.nama, "id");
      return a.isSoldOut ? 1 : -1;
    }
    return 0;
  });

  const totalPages = itemsPerPage === 0 ? 1 : Math.max(1, Math.ceil(sortedMenus.length / itemsPerPage));
  const startIndex = itemsPerPage === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const paginatedMenus = itemsPerPage === 0 ? sortedMenus : sortedMenus.slice(startIndex, startIndex + itemsPerPage);

  // Multi-selection helpers
  const handleToggleSelectMenu = (id: number) => {
    setSelectedMenuIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = sortedMenus.map((m) => m.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedMenuIds.includes(id));
    if (allSelected) {
      setSelectedMenuIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedMenuIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const isAllFilteredSelected =
    sortedMenus.length > 0 && sortedMenus.every((m) => selectedMenuIds.includes(m.id));

  // --- SINGLE MENU ACTIONS ---
  const handleOpenAdd = () => {
    setEditingMenu(null);
    setFormSku(""); // SKU benar-benar opsional & kosong
    setFormNama("");
    setFormHarga("");
    const defaultCat = categories.find((c) => c !== "Semua") || "Lauk";
    setFormKategori(defaultCat);
    setIsCustomKategori(false);
    setCustomKategori("");
    setFormIsSoldOut(false); // Tersedia
    setFormEnableModifiers(false);
    setFormModifiers([]);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setFormSku(menu.sku || "");
    setFormNama(menu.nama);
    setFormHarga(menu.harga.toString());
    setFormKategori(menu.kategori || "Lauk");
    setIsCustomKategori(false);
    setCustomKategori("");
    setFormIsSoldOut(Boolean(menu.isSoldOut));
    const hasMods = Boolean(menu.modifiers && menu.modifiers.length > 0);
    setFormEnableModifiers(hasMods);
    setFormModifiers(menu.modifiers ? JSON.parse(JSON.stringify(menu.modifiers)) : []);
    setIsSheetOpen(true);
  };

  // Helper Template Pilihan Cepat (Tingkat Pedas, Lalapan, Manis, Suhu)
  const toggleQuickTemplate = (type: "spicy" | "lalapan" | "sweetness" | "temp") => {
    const templates = {
      spicy: {
        id: "mod_spicy",
        nama: "Pilihan Tingkat Pedas",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: "sp_none", nama: "Tidak Pedas", harga: 0 },
          { id: "sp_mild", nama: "Sedang", harga: 0 },
          { id: "sp_hot", nama: "Pedas", harga: 0 },
        ],
      },
      lalapan: {
        id: "mod_lalapan",
        nama: "Pilihan Tambah Lalapan",
        required: false,
        minSelect: 0,
        maxSelect: 1,
        options: [
          { id: "opt_lalapan", nama: "Tambah Lalapan Segar", harga: 2000 },
        ],
      },
      sweetness: {
        id: "mod_sweetness",
        nama: "Pilihan Tingkat Manis",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: "sw_normal", nama: "Gula Normal", harga: 0 },
          { id: "sw_less", nama: "Sedikit Gula", harga: 0 },
          { id: "sw_none", nama: "Tanpa Gula", harga: 0 },
        ],
      },
      temp: {
        id: "mod_temp",
        nama: "Pilihan Suhu Minuman",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: "temp_ice", nama: "Dingin / Pakai Es", harga: 0 },
          { id: "temp_hot", nama: "Hangat / Panas", harga: 0 },
        ],
      },
    };

    const target = templates[type];
    const exists = formModifiers.some((g) => g.id === target.id || g.nama === target.nama);
    if (exists) {
      setFormModifiers((prev) => prev.filter((g) => g.id !== target.id && g.nama !== target.nama));
    } else {
      setFormModifiers((prev) => [...prev, JSON.parse(JSON.stringify(target))]);
    }
  };

  const handleAddCustomGroup = () => {
    const newId = "mod_" + Date.now();
    const newGroup: ModifierGroup = {
      id: newId,
      nama: "",
      required: false,
      minSelect: 0,
      maxSelect: 1,
      options: [
        { id: "opt_" + Date.now() + "_1", nama: "", harga: 0 },
      ],
    };
    setFormModifiers((prev) => [...prev, newGroup]);
  };

  const handleRemoveGroup = (groupIndex: number) => {
    setFormModifiers((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  const handleUpdateGroup = (groupIndex: number, patch: Partial<ModifierGroup>) => {
    setFormModifiers((prev) => prev.map((g, idx) => (idx === groupIndex ? { ...g, ...patch } : g)));
  };

  const handleAddOption = (groupIndex: number) => {
    const newOpt: ModifierOption = {
      id: "opt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      nama: "",
      harga: 0,
    };
    setFormModifiers((prev) =>
      prev.map((g, idx) => (idx === groupIndex ? { ...g, options: [...g.options, newOpt] } : g))
    );
  };

  const handleUpdateOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<ModifierOption>
  ) => {
    setFormModifiers((prev) =>
      prev.map((g, gIdx) => {
        if (gIdx !== groupIndex) return g;
        const updatedOpts = g.options.map((opt, oIdx) =>
          oIdx === optionIndex ? { ...opt, ...patch } : opt
        );
        return { ...g, options: updatedOpts };
      })
    );
  };

  const handleRemoveOption = (groupIndex: number, optionIndex: number) => {
    setFormModifiers((prev) =>
      prev.map((g, gIdx) => {
        if (gIdx !== groupIndex) return g;
        return { ...g, options: g.options.filter((_, oIdx) => oIdx !== optionIndex) };
      })
    );
  };

  const isFormDirty = () => {
    if (editingMenu) {
      const finalKat = isCustomKategori ? customKategori.trim() : formKategori.trim();
      const origKat = editingMenu.kategori.trim();
      const origSku = (editingMenu.sku || "").trim();
      const origMods = JSON.stringify(editingMenu.modifiers || []);
      const curMods = JSON.stringify(formEnableModifiers ? formModifiers : []);

      return (
        formNama.trim() !== editingMenu.nama.trim() ||
        Number(formHarga) !== editingMenu.harga ||
        finalKat !== origKat ||
        formSku.trim() !== origSku ||
        formIsSoldOut !== Boolean(editingMenu.isSoldOut) ||
        curMods !== origMods
      );
    } else {
      return (
        formNama.trim() !== "" ||
        formHarga.trim() !== "" ||
        formSku.trim() !== "" ||
        formEnableModifiers ||
        formModifiers.length > 0
      );
    }
  };

  const handleCloseSheet = () => {
    if (isFormDirty()) {
      setUnsavedConfirm({
        isOpen: true,
        onDiscard: () => {
          setIsSheetOpen(false);
          setEditingMenu(null);
        },
      });
    } else {
      setIsSheetOpen(false);
      setEditingMenu(null);
    }
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingMenu) return;

    const finalKat = isCustomKategori ? customKategori.trim() || "Lainnya" : formKategori.trim();
    const finalHarga = Number(formHarga);
    const cleanNama = formNama.trim();

    if (!cleanNama) {
      showToast("Nama menu tidak boleh kosong.", "error");
      return;
    }

    if (isNaN(finalHarga) || finalHarga < 0) {
      showToast("Harga jual harus berupa angka valid (minimal Rp 0).", "error");
      return;
    }

    // Validasi Pilihan Menu & Tambahan jika aktif
    let finalModifiers: ModifierGroup[] = [];
    if (formEnableModifiers && formModifiers.length > 0) {
      for (let i = 0; i < formModifiers.length; i++) {
        const group = formModifiers[i];
        if (!group.nama.trim()) {
          showToast(`Grup pilihan ke-${i + 1} belum memiliki nama.`, "error");
          return;
        }
        if (!group.options || group.options.length === 0) {
          showToast(`Grup pilihan "${group.nama}" harus memiliki minimal 1 pilihan opsi.`, "error");
          return;
        }
        for (let j = 0; j < group.options.length; j++) {
          const opt = group.options[j];
          if (!opt.nama.trim()) {
            showToast(`Pilihan ke-${j + 1} pada grup "${group.nama}" belum memiliki nama.`, "error");
            return;
          }
        }
      }
      finalModifiers = formModifiers;
    }

    setIsSavingMenu(true);
    try {
      if (editingMenu) {
        await updateMenu(editingMenu.id, {
          sku: formSku.trim(),
          nama: cleanNama,
          harga: finalHarga,
          kategori: finalKat,
          isSoldOut: formIsSoldOut,
          modifiers: finalModifiers,
        });
        showToast(`Menu "${cleanNama}" berhasil diperbarui`, "success");
      } else {
        await createMenu({
          sku: formSku.trim() || undefined,
          nama: cleanNama,
          harga: finalHarga,
          kategori: finalKat,
          isSoldOut: formIsSoldOut,
          modifiers: finalModifiers,
        });
        showToast(`Menu "${cleanNama}" berhasil ditambahkan`, "success");
      }
      setIsSheetOpen(false);
      setEditingMenu(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan menu", "error");
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleSetStock = async (menu: MenuItem, isSoldOut: boolean) => {
    // Idempotent: klik status yang sedang aktif tidak melakukan aksi ulang
    if (Boolean(menu.isSoldOut) === isSoldOut) return;

    setStockUpdatingId(menu.id);
    try {
      await toggleMenuSoldOut(menu.id, isSoldOut);
      showToast(
        `Status "${menu.nama}" diubah menjadi ${isSoldOut ? "HABIS (Tidak Tersedia)" : "TERSEDIA"}`,
        isSoldOut ? "error" : "success"
      );
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah status ketersediaan: " + err.message);
    } finally {
      setStockUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!menuToDelete) return;
    try {
      await deleteMenus([menuToDelete.id]);
      showToast(`Menu "${menuToDelete.nama}" telah dihapus`, "info");
      setMenuToDelete(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus menu: " + err.message);
    }
  };

  // --- BULK ACTIONS LOGIC ---
  const handleBulkToggleStock = async (isSoldOut: boolean) => {
    if (selectedMenuIds.length === 0) return;
    try {
      await bulkToggleMenuStock(selectedMenuIds, isSoldOut);
      showToast(
        `${selectedMenuIds.length} menu berhasil diubah menjadi ${isSoldOut ? "HABIS" : "TERSEDIA"}`,
        isSoldOut ? "error" : "success"
      );
      setSelectedMenuIds([]);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah stok massal: " + err.message);
    }
  };

  const handleBulkPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(bulkPriceValue);
    if (isNaN(val) || val === 0) {
      alert("Masukkan nilai penyesuaian harga yang valid (bukan 0)");
      return;
    }

    try {
      const res = await bulkUpdateMenuPrices(selectedMenuIds, {
        type: bulkPriceType,
        value: val,
      });
      showToast(`Harga ${res.updatedCount} menu berhasil diperbarui!`, "success");
      setIsBulkPriceOpen(false);
      setBulkPriceValue("");
      setSelectedMenuIds([]);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah harga massal: " + err.message);
    }
  };

  const handleBulkCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKat = isCustomBulkCategory ? customBulkCategory.trim() : bulkCategoryTarget;
    if (!finalKat) {
      alert("Kategori tujuan tidak boleh kosong");
      return;
    }

    try {
      const res = await bulkUpdateMenuCategory(selectedMenuIds, finalKat);
      showToast(`Kategori ${res.updatedCount} menu diubah ke "${finalKat}"`, "success");
      setIsBulkCategoryOpen(false);
      setCustomBulkCategory("");
      setSelectedMenuIds([]);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah kategori massal: " + err.message);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    try {
      const res = await bulkDeleteMenus(selectedMenuIds);
      let msg = "";
      if (res.deletedCount > 0) msg += `${res.deletedCount} menu dihapus permanen. `;
      if (res.protectedCount > 0)
        msg += `${res.protectedCount} menu dilindungi & ditandai Habis karena ada riwayat transaksi.`;
      showToast(msg || "Menu berhasil diproses", "info");
      setIsBulkDeleteOpen(false);
      setSelectedMenuIds([]);
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus menu massal: " + err.message);
    }
  };

  // --- EXPORT & IMPORT EXCEL / CSV ---
  const handleExportCatalog = (format: "xlsx" | "csv" = "xlsx") => {
    try {
      exportMenusToExcel(menus, format);
      showToast(`Katalog ${menus.length} menu berhasil diexport ke ${format.toUpperCase()}!`, "success");
    } catch (err: any) {
      alert("Gagal export katalog menu: " + err.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    try {
      const result = await parseMenuFile(file);
      setImportResult(result);
    } catch (err: any) {
      alert("Gagal membaca file: " + err.message);
      setImportFile(null);
      setImportResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importResult || importResult.validRows.length === 0) {
      alert("Tidak ada baris menu yang valid untuk diimport.");
      return;
    }

    setIsImporting(true);
    try {
      // 1. Auto Backup jika diaktifkan
      if (importAutoBackup) {
        const fullBackup = await exportAllData();
        downloadFile(
          JSON.stringify(fullBackup, null, 2),
          `backup_sakunota_pre_import_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
          "application/json"
        );
      }

      // 2. Jalankan Import Massal
      const res = await bulkImportMenus(importResult.validRows, { mode: importMode });
      showToast(
        `Import selesai! ${res.createdCount} dibuat baru, ${res.updatedCount} diperbarui, ${res.skippedCount} dilewati.`,
        "success"
      );
      setIsImportOpen(false);
      setImportFile(null);
      setImportResult(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengimport menu: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 pb-24">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
            <span>🍽️</span>
            <span>Kelola Menu & Stok</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Total {menus.length} menu terdaftar di sistem SakuNota.
          </p>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={() => handleExportCatalog("xlsx")}
            className="px-3.5 py-2.5 bg-card hover:bg-line active:scale-95 text-fg font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            title="Download seluruh daftar menu dalam file Excel"
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h16v-6M12 3v12M7 10l5 5 5-5" /></svg></span>
            <span>Export Excel</span>
          </button>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportOpen(true);
            }}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-accent-text font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-blue-200"
            title="Import menu secara massal dari Excel atau CSV"
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M7 16v-4M12 16V5M17 16V9" /></svg></span>
            <span>Import Excel / CSV</span>
          </button>

          {/* Add Menu Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="text-base leading-none">+</span>
            <span>Tambah Menu</span>
          </button>
        </div>
      </div>

      {/* Search & Categories Filter */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama menu, SKU, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-line rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold text-fg outline-none focus:border-accent"
          />
          <span className="absolute left-3.5 top-3 text-muted text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-muted hover:text-muted font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills (horizontal scroll) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs items-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-accent text-white shadow-sm"
                  : " bg-card text-slate-300 hover:bg-card border border-line/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted font-bold">Urut:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-xl bg-card border border-line font-bold text-slate-300 outline-none"
              >
                <option value="nama_asc">🔤 Nama (A - Z)</option>
                <option value="nama_desc">🔤 Nama (Z - A)</option>
                <option value="harga_asc">💰 Harga (Termurah)</option>
                <option value="harga_desc">💰 Harga (Termahal)</option>
                <option value="stok_first">🟢 Stok Tersedia Dahulu</option>
              </select>
            </div>

            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted font-bold">Tampil:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="py-1.5 px-2.5 rounded-xl bg-card border border-line font-bold text-slate-300 outline-none"
              >
                <option value={12}>12 / hal</option>
                <option value={24}>24 / hal</option>
                <option value={48}>48 / hal</option>
                <option value={0}>Semua ({sortedMenus.length})</option>
              </select>
            </div>
          </div>

          {selectedMenuIds.length > 0 && (
            <span className=" text-accent-text font-black">
              {selectedMenuIds.length} menu dipilih
            </span>
          )}
        </div>

        {/* Selection Bar / Select All row & View Mode Switcher */}
        {sortedMenus.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 py-1 text-xs text-muted">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleSelectAllFiltered}
                  className="w-4 h-4 rounded text-accent-text focus:ring-accent rounded border-line"
                />
                <span>Pilih Semua {sortedMenus.length} Menu</span>
              </label>

              {itemsPerPage > 0 && sortedMenus.length > itemsPerPage && (
                <span className="text-[11px] text-muted font-semibold hidden sm:inline">
                  (Halaman {currentPage} dari {totalPages})
                </span>
              )}
            </div>

            {/* View Mode Toggle: Table vs Grid */}
            <div className="flex items-center gap-2">
              <div className="flex bg-card rounded-xl p-1 border border-line shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === "table" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg"
                  }`}
                >
                  <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14v14H5zM9 9h6M9 13h6M9 17h3" /></svg></span>
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === "grid" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg"
                  }`}
                >
                  <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg></span>
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Content: Table View or Grid View */}
      {isLoading ? (
        <div className="py-12 text-center text-muted text-xs">Memuat daftar menu...</div>
      ) : sortedMenus.length === 0 ? (
        <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
          <div className="text-4xl mb-2">🍽️</div>
          <h3 className="text-sm font-bold text-slate-300">Tidak ada menu yang cocok</h3>
          <p className="text-xs text-muted mt-1">Coba ganti kata kunci pencarian atau kategori filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === "table" ? (
            /* Structured Desktop Table View */
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-line bg-card/60 text-muted font-bold">
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleSelectAllFiltered}
                        className="w-4 h-4 rounded text-accent-text focus:ring-accent border-line"
                      />
                    </th>
                    <th className="py-3.5 px-3">Foto & Menu</th>
                    <th className="py-3.5 px-3">SKU</th>
                    <th className="py-3.5 px-3">Kategori</th>
                    <th className="py-3.5 px-3">Harga</th>
                    <th className="py-3.5 px-3">Modifier / Varian</th>
                    <th className="py-3.5 px-3">Status Stok</th>
                    <th className="py-3.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {paginatedMenus.map((menu) => {
                    const isSelected = selectedMenuIds.includes(menu.id);
                    const modCount = menu.modifiers?.length || 0;

                    return (
                      <tr
                        key={menu.id}
                        onClick={() => handleToggleSelectMenu(menu.id)}
                        className={`transition-colors cursor-pointer select-none ${
                          isSelected
                            ? "bg-accent/15"
                            : menu.isSoldOut
                            ? "bg-rose-500/5 hover:bg-rose-500/10"
                            : "hover:bg-card/50"
                        }`}
                      >
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectMenu(menu.id)}
                            className="w-4 h-4 text-accent-text rounded border-line focus:ring-accent cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-xl shrink-0 shadow-inner">
                              {getCategoryIcon(menu.kategori, menu.nama)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-sm text-fg block leading-tight truncate">
                                {menu.nama}
                              </span>
                              {menu.isSoldOut && (
                                <span className="text-[10px] text-rose-400 font-bold">● Stok Habis</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted">
                          {menu.sku || <span className="text-slate-500 italic">ID #{menu.id}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-lg bg-card border border-line text-[11px] font-bold text-slate-300">
                            {menu.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-sm text-accent-text">
                          Rp {menu.harga.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-3 text-muted">
                          {modCount > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {menu.modifiers?.map((g) => (
                                <span
                                  key={g.id}
                                  className="px-2 py-0.5 rounded-md bg-accent/15 text-accent-text text-[10px] font-bold"
                                  title={`${g.nama}: ${g.options.map((o) => o.nama).join(", ")}`}
                                >
                                  {g.nama}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex rounded-xl p-0.5 bg-card border border-line shadow-inner">
                            <button
                              type="button"
                              disabled={stockUpdatingId === menu.id}
                              onClick={() => handleSetStock(menu, false)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                !menu.isSoldOut
                                  ? "bg-emerald-600 text-white shadow-sm font-black cursor-default"
                                  : "text-muted hover:text-fg opacity-60 hover:opacity-100 cursor-pointer"
                              }`}
                              title={!menu.isSoldOut ? "Menu sedang tersedia (bisa dipesan)" : "Ubah status ke Tersedia"}
                            >
                              <span> Tersedia</span>
                            </button>
                            <button
                              type="button"
                              disabled={stockUpdatingId === menu.id}
                              onClick={() => handleSetStock(menu, true)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                menu.isSoldOut
                                  ? "bg-rose-600 text-white shadow-sm font-black cursor-default"
                                  : "text-muted hover:text-fg opacity-60 hover:opacity-100 cursor-pointer"
                              }`}
                              title={menu.isSoldOut ? "Menu sedang tidak tersedia (habis)" : "Ubah status ke Tidak Tersedia"}
                            >
                              <span> Habis</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(menu)}
                              className="w-8 h-8 rounded-xl bg-card hover:bg-line text-slate-300 flex items-center justify-center text-xs font-bold transition-colors"
                              title="Edit Menu"
                            ><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 12-12-3-3L5 16zM14 7l3 3" /></svg></button>
                            <button
                              type="button"
                              onClick={() => setMenuToDelete(menu)}
                              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold transition-colors"
                              title="Hapus Menu"
                            ><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedMenus.map((menu) => {
                const isSelected = selectedMenuIds.includes(menu.id);
                return (
                  <div
                    key={menu.id}
                    onClick={() => handleToggleSelectMenu(menu.id)}
                    className={`p-4 rounded-2xl sm:rounded-3xl bg-surface border transition-all flex flex-col justify-between cursor-pointer relative select-none ${
                      isSelected
                        ? "border-accent bg-accent/20 ring-2 ring-accent/30"
                        : menu.isSoldOut
                        ? " border-rose-900/40 bg-rose-500/10"
                        : " border-line hover:border-accent/50"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="mt-0.5 w-4 h-4 text-accent-text rounded border-line focus:ring-accent cursor-pointer pointer-events-none"
                          />
                          <div>
                            <h4 className="font-black text-sm text-fg leading-snug">
                              {menu.nama}
                            </h4>
                            {menu.sku && (
                              <span className="text-[10px] text-muted font-mono">
                                {menu.sku}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-card text-muted shrink-0">
                          {menu.kategori}
                        </span>
                      </div>

                      <div className="text-base font-black text-accent-text ml-6">
                        Rp {menu.harga.toLocaleString("id-ID")}
                      </div>
                    </div>

                    {/* Actions & Stock Toggle */}
                    <div
                      className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()} // don't toggle selection when clicking buttons
                    >
                      {/* 2-Option Mutually Exclusive Stock Controls */}
                      <div className="inline-flex rounded-xl p-0.5 bg-card border border-line shadow-inner">
                        <button
                          type="button"
                          disabled={stockUpdatingId === menu.id}
                          onClick={() => handleSetStock(menu, false)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            !menu.isSoldOut
                              ? "bg-emerald-600 text-white shadow-sm font-black cursor-default"
                              : "text-muted hover:text-fg opacity-60 hover:opacity-100 cursor-pointer"
                          }`}
                          title={!menu.isSoldOut ? "Menu sedang tersedia" : "Ubah status ke Tersedia"}
                        >
                          <span> Tersedia</span>
                        </button>
                        <button
                          type="button"
                          disabled={stockUpdatingId === menu.id}
                          onClick={() => handleSetStock(menu, true)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            menu.isSoldOut
                              ? "bg-rose-600 text-white shadow-sm font-black cursor-default"
                              : "text-muted hover:text-fg opacity-60 hover:opacity-100 cursor-pointer"
                          }`}
                          title={menu.isSoldOut ? "Menu sedang tidak tersedia (habis)" : "Ubah status ke Tidak Tersedia"}
                        >
                          <span> Habis</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(menu)}
                          className="w-8 h-8 rounded-xl bg-card hover:bg-line text-slate-300 flex items-center justify-center text-xs font-bold transition-colors"
                          title="Edit Menu"
                        ><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 12-12-3-3L5 16zM14 7l3 3" /></svg></button>
                        <button
                          type="button"
                          onClick={() => setMenuToDelete(menu)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold transition-colors"
                          title="Hapus Menu"
                        ><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Navigation Bar */}
          {itemsPerPage > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-line text-xs">
              <span className=" text-muted font-semibold">
                Menampilkan {Math.min(startIndex + 1, sortedMenus.length)} - {Math.min(startIndex + itemsPerPage, sortedMenus.length)} dari {sortedMenus.length} menu
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-card border border-line disabled:opacity-40 font-bold text-slate-300 hover:bg-card transition-all active:scale-95"
                >
                  ← Sebelumnya
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && (
                          <span className="px-1 text-muted">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                            currentPage === p
                              ? "bg-accent text-white shadow-md shadow-accent/20"
                              : " bg-card border border-line text-slate-300 hover:bg-card"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-card border border-line disabled:opacity-40 font-bold text-slate-300 hover:bg-card transition-all active:scale-95"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- FLOATING BULK ACTIONS TOOLBAR (WHEN ITEMS ARE SELECTED) --- */}
      {selectedMenuIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-[500px] z-40 bg-card/95 backdrop-blur-md text-white p-3.5 rounded-2xl sm:rounded-3xl shadow-2xl border border-line/80 animate-in slide-in-from-bottom-5 duration-200 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="text-xs font-black text-accent-text flex items-center gap-1.5">
              <span>✓</span>
              <span>{selectedMenuIds.length} Menu Terpilih</span>
            </span>
            <button
              onClick={() => setSelectedMenuIds([])}
              className="text-[11px] text-muted hover:text-white font-bold transition-colors"
            >
              Batal Pilih ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Ubah Harga */}
            <button
              type="button"
              onClick={() => {
                setBulkPriceValue("");
                setIsBulkPriceOpen(true);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5h20v14H2zM2 9h20M6 15h4" /></svg></span>
              <span>Ubah Harga</span>
            </button>

            {/* Ubah Kategori */}
            <button
              type="button"
              onClick={() => {
                setBulkCategoryTarget(categories.find((c) => c !== "Semua") || "Nasi");
                setIsCustomBulkCategory(false);
                setCustomBulkCategory("");
                setIsBulkCategoryOpen(true);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14v14H5zM9 9h6M9 13h6M9 17h3" /></svg></span>
              <span>Ubah Kategori</span>
            </button>

            {/* Set Tersedia */}
            <button
              type="button"
              onClick={() => handleBulkToggleStock(false)}
              className="px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0M8 12l3 3 5-6" /></svg></span>
              <span>Tersedia</span>
            </button>

            {/* Set Habis */}
            <button
              type="button"
              onClick={() => handleBulkToggleStock(true)}
              className="px-2.5 py-1.5 bg-amber-800/80 hover:bg-amber-700 text-amber-200 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0M8 12l3 3 5-6" /></svg></span>
              <span>Habis</span>
            </button>

            {/* Hapus Terpilih */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all ml-auto"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></span>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL UBAH HARGA MASSAL --- */}
      {isBulkPriceOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkPriceOpen(false)}
        >
          <div
            className=" bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1">
              💲 Ubah Harga Massal
            </h3>
            <p className="text-xs text-muted mb-4">
              Ubah harga serentak untuk <strong>{selectedMenuIds.length}</strong> menu terpilih.
            </p>

            <form onSubmit={handleBulkPriceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Tipe Penyesuaian:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkPriceType("nominal")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      bulkPriceType === "nominal"
                        ? "bg-accent text-white border-accent shadow-sm"
                        : " bg-card text-slate-300 border-line"
                    }`}
                  >
                    Nominal (+/- Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkPriceType("percent")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      bulkPriceType === "percent"
                        ? "bg-accent text-white border-accent shadow-sm"
                        : " bg-card text-slate-300 border-line"
                    }`}
                  >
                    Persentase (+/- %)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {bulkPriceType === "nominal"
                    ? "Nilai Rupiah (Gunakan minus '-' untuk diskon):"
                    : "Nilai Persentase (Contoh: 10 untuk +10%, -10 untuk -10%):"}
                </label>
                <input
                  type="number"
                  placeholder={bulkPriceType === "nominal" ? "Contoh: 2000 atau -1000" : "Contoh: 10 atau -5"}
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-base font-black text-fg outline-none focus:border-accent"
                  autoFocus
                  required
                />
                <span className="text-[11px] text-muted mt-1 block">
                  {bulkPriceType === "nominal"
                    ? "Harga baru = Harga saat ini + Nominal"
                    : "Harga baru = Harga saat ini ± (Persentase %)"}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPriceOpen(false)}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  Terapkan Harga Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL UBAH KATEGORI MASSAL --- */}
      {isBulkCategoryOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkCategoryOpen(false)}
        >
          <div
            className=" bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1">
              🏷️ Ubah Kategori Massal
            </h3>
            <p className="text-xs text-muted mb-4">
              Pindahkan <strong>{selectedMenuIds.length}</strong> menu terpilih ke kategori yang sama.
            </p>

            <form onSubmit={handleBulkCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pilih Kategori Tujuan:
                </label>
                <select
                  value={isCustomBulkCategory ? "Lainnya" : bulkCategoryTarget}
                  onChange={(e) => {
                    if (e.target.value === "Lainnya") {
                      setIsCustomBulkCategory(true);
                    } else {
                      setIsCustomBulkCategory(false);
                      setBulkCategoryTarget(e.target.value);
                    }
                  }}
                  className="w-full bg-card border border-line rounded-xl p-3 text-xs font-bold text-fg outline-none focus:border-accent"
                >
                  {categories
                    .filter((c) => c !== "Semua")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  <option value="Lainnya">+ Buat Kategori Baru...</option>
                </select>

                {isCustomBulkCategory && (
                  <input
                    type="text"
                    placeholder="Ketik kategori baru (contoh: Kopi / Dimsum)"
                    value={customBulkCategory}
                    onChange={(e) => setCustomBulkCategory(e.target.value)}
                    className="mt-2 w-full bg-card border border-accent rounded-xl p-2.5 text-xs text-fg outline-none"
                    autoFocus
                    required
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkCategoryOpen(false)}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  Pindahkan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HAPUS MASSAL --- */}
      {isBulkDeleteOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkDeleteOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🗑️
            </div>
            <h3 className="text-base font-black text-fg mb-1">
              Hapus {selectedMenuIds.length} Menu Terpilih?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4 text-left bg-card/60 p-3 rounded-xl border border-line/60">
              🛡️ <strong>Fitur Pengaman Finansial:</strong> Menu yang pernah memiliki riwayat transaksi/nota tidak akan dihapus dari database, melainkan otomatis dinonaktifkan (Status Habis) agar seluruh laporan penjualan masa lalu tetap akurat.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="flex-1 py-2.5 bg-card text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteSubmit}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL IMPORT MENU DARI EXCEL / CSV --- */}
      {isImportOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => !isImporting && setIsImportOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl border border-line my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <div>
                <h3 className="text-lg font-black text-fg flex items-center gap-2">
                  <span>📊</span>
                  <span>Import Menu Massal (Excel / CSV)</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  100% Offline tanpa internet. Mendukung format .xlsx, .xls, dan .csv.
                </p>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setIsImportOpen(false)}
                className="w-8 h-8 rounded-full bg-card text-muted hover:text-fg flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Step 1: Download Templates */}
              <div className="p-3.5 bg-card/60 rounded-2xl border border-line">
                <span className="text-xs font-black text-fg block mb-2">
                  Langkah 1: Unduh Format Template Resmi SakuNota
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadMenuTemplate("xlsx")}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h16v-6M12 3v12M7 10l5 5 5-5" /></svg></span>
                    <span>Download Template Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadMenuTemplate("csv")}
                    className="px-3 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 text-fg rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14v14H5zM9 9h6M9 13h6M9 17h3" /></svg></span>
                    <span>Download Template CSV</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Choose File */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Langkah 2: Pilih File Excel atau CSV yang Sudah Diisi:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  disabled={isParsing || isImporting}
                  className="w-full text-xs text-muted file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-accent/60 file:text-accent-text hover:file:bg-accent/15 cursor-pointer border border-line rounded-2xl p-2"
                />
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="py-4 text-center text-xs text-muted font-semibold animate-pulse">
                  Sedang membaca dan memvalidasi file Excel...
                </div>
              )}

              {/* Step 3: Validation Preview */}
              {importResult && (
                <div className="space-y-3 p-3.5 bg-accent/20 rounded-2xl border border-accent/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-accent-text">
                      Hasil Analisis File: {importFile?.name}
                    </span>
                    <span className="text-xs font-bold text-muted">
                      Total: {importResult.totalRows} baris
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-accent/40 rounded-xl border border-accent/40">
                      <div className="text-[10px] text-accent-text font-bold uppercase">
                        Siap Diimport
                      </div>
                      <div className="text-lg font-black text-accent-text">
                        {importResult.validRows.length} Menu
                      </div>
                    </div>

                    <div className="p-2.5 bg-rose-950/40 rounded-xl border border-rose-900/40">
                      <div className="text-[10px] text-rose-400 font-bold uppercase">
                        Gagal / Invalid
                      </div>
                      <div className="text-lg font-black text-rose-300">
                        {importResult.invalidRows.length} Baris
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-950/40 rounded-xl border border-amber-900/40 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-amber-400 font-bold uppercase">
                        SKU Duplikat
                      </div>
                      <div className="text-lg font-black text-amber-300">
                        {importResult.duplicateSkus.length} SKU
                      </div>
                    </div>
                  </div>

                  {/* Invalid details if any */}
                  {importResult.invalidRows.length > 0 && (
                    <div className="max-h-24 overflow-y-auto text-[11px] text-rose-400 bg-card p-2 rounded-xl border border-rose-900/50 space-y-1">
                      {importResult.invalidRows.map((err, idx) => (
                        <div key={idx}>
                          Baris {err.row}: {err.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Import Mode Options */}
                  <div className="pt-2 border-t border-accent/40">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Metode Penggabungan (Mode Import):
                    </label>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-start gap-2 p-2 rounded-xl bg-card border border-line cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="upsert"
                          checked={importMode === "upsert"}
                          onChange={() => setImportMode("upsert")}
                          className="mt-0.5 text-accent-text"
                        />
                        <div>
                          <strong className=" text-fg">Upsert (Sangat Direkomendasikan)</strong>
                          <p className="text-[11px] text-muted">
                            Tambah menu baru dan perbarui harga/kategori jika SKU atau Nama sudah ada.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded-xl bg-card border border-line cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="create_only"
                          checked={importMode === "create_only"}
                          onChange={() => setImportMode("create_only")}
                          className="mt-0.5 text-accent-text"
                        />
                        <div>
                          <strong className=" text-fg">Hanya Tambah Baru</strong>
                          <p className="text-[11px] text-muted">
                            Hanya masukkan menu yang belum terdaftar di sistem. Menu lama tidak akan diubah.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded-xl bg-card border border-line cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="update_existing"
                          checked={importMode === "update_existing"}
                          onChange={() => setImportMode("update_existing")}
                          className="mt-0.5 text-accent-text"
                        />
                        <div>
                          <strong className=" text-fg">Hanya Update Menu Lama</strong>
                          <p className="text-[11px] text-muted">
                            Perbarui harga & stok menu yang cocok, abaikan menu baru di file.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Auto-backup Checkbox */}
                  <label className="flex items-center gap-2 pt-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={importAutoBackup}
                      onChange={(e) => setImportAutoBackup(e.target.checked)}
                      className="w-4 h-4 rounded text-accent-text focus:ring-accent"
                    />
                    <span>🛡️ Buat file backup database otomatis sebelum proses import dimulai</span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setIsImportOpen(false)}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!importResult || importResult.validRows.length === 0 || isImporting}
                  onClick={handleExecuteImport}
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <span>Sedang Mengimport...</span>
                  ) : (
                    <span>
                      Mulai Import {importResult ? importResult.validRows.length : 0} Menu
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM SHEET FORM (TAMBAH / EDIT SINGLE MENU) --- */}
      {isSheetOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200 p-0 sm:p-4"
          onClick={handleCloseSheet}
        >
          <div
            className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl border border-line flex flex-col max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for touch */}
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex justify-between items-start pb-3 border-b border-line">
              <div>
                <h3 className="text-lg font-black text-fg flex items-center gap-2">
                  <span>{editingMenu ? "✏️ Edit Menu" : "➕ Tambah Menu Baru"}</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingMenu
                    ? `Perbarui rincian untuk "${editingMenu.nama}"`
                    : "Lengkapi data menu untuk ditambahkan ke kasir."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSheet}
                className="w-8 h-8 rounded-full bg-card hover:bg-line text-muted hover:text-fg flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4 pt-4">
              {/* Nama Menu */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ayam Panggang, Nasi Goreng, Es Teh"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-sm font-semibold text-fg outline-none focus:border-accent"
                  required
                  autoFocus
                />
              </div>

              {/* Harga Jual */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Harga Jual (Rp) *
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 15000"
                  value={formHarga}
                  onChange={(e) => setFormHarga(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-lg font-black text-accent-text outline-none focus:border-accent"
                  required
                  min="0"
                />
              </div>

              {/* Kategori Menu */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kategori Menu *
                </label>
                <select
                  value={isCustomKategori ? "Lainnya" : formKategori}
                  onChange={(e) => {
                    if (e.target.value === "Lainnya") {
                      setIsCustomKategori(true);
                    } else {
                      setIsCustomKategori(false);
                      setFormKategori(e.target.value);
                    }
                  }}
                  className="w-full bg-card border border-line rounded-xl p-3 text-xs font-bold text-fg outline-none focus:border-accent cursor-pointer"
                >
                  {Array.from(new Set(["Nasi", "Lauk", "Minuman", "Camilan", "Sate", "Wedang", ...menus.map((m) => m.kategori).filter(Boolean)])).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Lainnya">+ Buat Kategori Baru...</option>
                </select>
                <p className="text-[10px] text-muted mt-1">
                  Untuk mengelompokkan menu di halaman kasir.
                </p>

                {isCustomKategori && (
                  <input
                    type="text"
                    placeholder="Ketik kategori baru (contoh: Kopi, Roti Bakar, Paket Hemat)"
                    value={customKategori}
                    onChange={(e) => setCustomKategori(e.target.value)}
                    className="mt-2 w-full bg-card border border-accent rounded-xl p-2.5 text-xs text-fg outline-none"
                    autoFocus
                  />
                )}
              </div>

              {/* SKU / Kode Barcode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Kode Barcode / SKU (opsional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScanOpen(true)}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Pindai Barcode
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: 8992761136014 atau SKU-001"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="flex-1 bg-card border border-line rounded-xl p-3 text-xs font-mono text-fg outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScanOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-card border border-line hover:border-accent text-fg font-bold text-xs transition-colors shrink-0"
                  >
                    Scan
                  </button>
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Dapat dipindai langsung dengan barcode scanner fisik atau kamera HP saat transaksi di kasir.
                </p>
              </div>

              {/* Ketersediaan Menu (Stok) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ketersediaan Menu
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isSavingMenu}
                    onClick={() => setFormIsSoldOut(false)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      !formIsSoldOut
                        ? "bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-300 shadow-md font-black"
                        : "bg-card border-line text-muted hover:text-fg hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1.5">
                        <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0M8 12l3 3 5-6" /></svg></span>
                        <span>Tersedia</span>
                      </span>
                      {!formIsSoldOut && (
                        <span className="text-emerald-400 font-bold text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded-md">
                          ✓ Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted mt-0.5 font-normal">
                      Bisa dipesan di kasir
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingMenu}
                    onClick={() => setFormIsSoldOut(true)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formIsSoldOut
                        ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/30 text-rose-700 shadow-md font-black"
                        : "bg-card border-line text-muted hover:text-fg hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1.5">
                        <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0M8 12l3 3 5-6" /></svg></span>
                        <span>Tidak Tersedia</span>
                      </span>
                      {formIsSoldOut && (
                        <span className="text-rose-400 font-bold text-[10px] bg-rose-900/60 px-1.5 py-0.5 rounded-md">
                          ✓ Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted mt-0.5 font-normal">
                      Stok habis / ditutup
                    </p>
                  </button>
                </div>
                <p className="text-[10px] text-muted mt-1.5">
                  Status yang dipilih tidak perlu diklik ulang. Untuk mengganti status, pilih opsi satunya.
                </p>
              </div>

              {/* Pilihan Menu & Tambahan (Modifier) */}
              <div className="pt-3 border-t border-line space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formEnableModifiers}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormEnableModifiers(checked);
                      if (!checked) {
                        setFormModifiers([]);
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-accent focus:ring-accent border-line"
                  />
                  <div>
                    <span className="text-xs font-black text-fg">
                      Aktifkan pilihan tambahan untuk menu ini
                    </span>
                    <p className="text-[10px] text-muted leading-relaxed">
                      Tambahkan opsi tingkat pedas, ekstra lalapan, suhu minuman, atau topping tambahan.
                    </p>
                  </div>
                </label>

                {formEnableModifiers && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                    {/* Template Cepat */}
                    <div className="p-3 bg-card/60 rounded-2xl border border-line space-y-2">
                      <span className="text-[11px] font-bold text-muted block">
                        Template Cepat (Klik untuk menambah / mencopot):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleQuickTemplate("spicy")}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                            formModifiers.some((g) => g.id === "mod_spicy" || g.nama.includes("Pedas"))
                              ? "bg-accent text-white border-accent shadow-sm"
                              : "bg-surface border-line text-muted hover:text-fg"
                          }`}
                        >
                          <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h13M10 8c2-4 8-4 10 0l1 4H8zM2 3v6M5 3v6M2 6h3M3.5 9v12M8 16h13" /></svg></span>
                          <span>Tingkat Pedas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleQuickTemplate("lalapan")}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                            formModifiers.some((g) => g.id === "mod_lalapan" || g.nama.includes("Lalapan"))
                              ? "bg-accent text-white border-accent shadow-sm"
                              : "bg-surface border-line text-muted hover:text-fg"
                          }`}
                        >
                          <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h13M10 8c2-4 8-4 10 0l1 4H8zM2 3v6M5 3v6M2 6h3M3.5 9v12M8 16h13" /></svg></span>
                          <span>Tambah Lalapan (+2k)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleQuickTemplate("sweetness")}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                            formModifiers.some((g) => g.id === "mod_sweetness" || g.nama.includes("Manis"))
                              ? "bg-accent text-white border-accent shadow-sm"
                              : "bg-surface border-line text-muted hover:text-fg"
                          }`}
                        >
                          <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h13M10 8c2-4 8-4 10 0l1 4H8zM2 3v6M5 3v6M2 6h3M3.5 9v12M8 16h13" /></svg></span>
                          <span>Tingkat Manis</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleQuickTemplate("temp")}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                            formModifiers.some((g) => g.id === "mod_temp" || g.nama.includes("Suhu"))
                              ? "bg-accent text-white border-accent shadow-sm"
                              : "bg-surface border-line text-muted hover:text-fg"
                          }`}
                        >
                          <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h13M10 8c2-4 8-4 10 0l1 4H8zM2 3v6M5 3v6M2 6h3M3.5 9v12M8 16h13" /></svg></span>
                          <span>Es / Hangat</span>
                        </button>
                      </div>
                    </div>

                    {/* Daftar Grup Pilihan Aktif */}
                    {formModifiers.length === 0 ? (
                      <div className="p-4 bg-card/40 rounded-2xl border border-dashed border-line text-center text-xs text-muted">
                        Belum ada grup pilihan aktif. Klik template di atas atau buat grup baru di bawah.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formModifiers.map((group, gIdx) => (
                          <div
                            key={group.id || gIdx}
                            className="p-3.5 bg-card/80 rounded-2xl border border-line space-y-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                placeholder="Nama Grup (misal: Tingkat Pedas, Tambahan Lauk)"
                                value={group.nama}
                                onChange={(e) =>
                                  handleUpdateGroup(gIdx, { nama: e.target.value })
                                }
                                className="flex-1 bg-surface border border-line rounded-xl px-3 py-1.5 text-xs font-bold text-fg outline-none focus:border-accent"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveGroup(gIdx)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors shrink-0"
                                title="Hapus grup pilihan ini"
                              > Hapus
                              </button>
                            </div>

                            {/* Pengaturan Aturan Pilihan */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="font-bold text-muted">Aturan:</span>
                              <div className="inline-flex rounded-xl p-0.5 bg-surface border border-line">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateGroup(gIdx, {
                                      required: true,
                                      minSelect: 1,
                                      maxSelect: 1,
                                    })
                                  }
                                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                                    group.required && group.maxSelect === 1
                                      ? "bg-accent text-white shadow-xs"
                                      : "text-muted hover:text-fg"
                                  }`}
                                >
                                  Pilih 1 (Wajib)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateGroup(gIdx, {
                                      required: false,
                                      minSelect: 0,
                                      maxSelect: 1,
                                    })
                                  }
                                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                                    !group.required && group.maxSelect === 1
                                      ? "bg-accent text-white shadow-xs"
                                      : "text-muted hover:text-fg"
                                  }`}
                                >
                                  Pilih 1 (Opsional)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateGroup(gIdx, {
                                      required: false,
                                      minSelect: 0,
                                      maxSelect: Math.max(3, group.options.length),
                                    })
                                  }
                                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                                    group.maxSelect > 1
                                      ? "bg-accent text-white shadow-xs"
                                      : "text-muted hover:text-fg"
                                  }`}
                                >
                                  Boleh Pilih Banyak
                                </button>
                              </div>
                            </div>

                            {/* Daftar Opsi & Harga Tambahan */}
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-muted block">
                                Pilihan & Harga Tambahan:
                              </span>
                              {group.options.map((opt, oIdx) => (
                                <div key={opt.id || oIdx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Nama Opsi (misal: Sedang, Ekstra Telur)"
                                    value={opt.nama}
                                    onChange={(e) =>
                                      handleUpdateOption(gIdx, oIdx, { nama: e.target.value })
                                    }
                                    className="flex-1 bg-surface border border-line rounded-xl px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
                                    required
                                  />
                                  <div className="w-28 relative">
                                    <span className="absolute left-2.5 top-1.5 text-[10px] text-muted font-bold">
                                      +Rp
                                    </span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={opt.harga === 0 ? "" : opt.harga}
                                      onChange={(e) =>
                                        handleUpdateOption(gIdx, oIdx, {
                                          harga: Number(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full bg-surface border border-line rounded-xl pl-9 pr-2 py-1.5 text-xs font-mono font-bold text-accent-text outline-none focus:border-accent"
                                      min="0"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    disabled={group.options.length <= 1}
                                    onClick={() => handleRemoveOption(gIdx, oIdx)}
                                    className="w-7 h-7 rounded-lg bg-surface text-muted hover:text-rose-400 disabled:opacity-30 flex items-center justify-center text-xs font-bold"
                                    title="Hapus opsi ini"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => handleAddOption(gIdx)}
                                className="mt-1 px-3 py-1.5 bg-surface hover:bg-card border border-line text-xs font-bold text-accent-text rounded-xl transition-colors flex items-center gap-1"
                              >
                                <span>+</span>
                                <span>Tambah Pilihan Opsi</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddCustomGroup}
                      className="w-full py-2.5 bg-card hover:bg-line border border-dashed border-line text-xs font-bold text-fg rounded-2xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18" /></svg></span>
                      <span>Buat Grup Pilihan Baru (Kustom)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Form Actions Footer */}
              <div className="flex gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={handleCloseSheet}
                  disabled={isSavingMenu}
                  className="flex-1 py-3 bg-card hover:bg-line text-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMenu}
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingMenu ? (
                    <span>Sedang Menyimpan...</span>
                  ) : (
                    <span>{editingMenu ? "Simpan Perubahan" : "+ Tambah Menu"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOG: DELETE SINGLE MENU --- */}
      {menuToDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMenuToDelete(null)}
        >
          <div
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🗑️
            </div>
            <h3 className="text-base font-black text-fg mb-1">
              Hapus Menu Ini?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Menu <strong>"{menuToDelete.nama}"</strong> akan dihapus permanen dari daftar kasir.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setMenuToDelete(null)}
                className="flex-1 py-2.5 bg-line text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- UNSAVED CHANGES GUARD DIALOG --- */}
      {unsavedConfirm?.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setUnsavedConfirm(null)}
        >
          <div
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-950/60 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-fg mb-1">
              Batalkan Perubahan Menu?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Data rincian menu yang sedang Anda ketik belum disimpan. Yakin ingin membuang perubahan?
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setUnsavedConfirm(null)}
                className="flex-1 py-2.5 bg-line text-fg rounded-xl text-xs font-bold transition-colors"
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

      {/* Barcode Camera Scanner Modal */}
      <BarcodeCameraModal
        isOpen={isBarcodeScanOpen}
        onClose={() => setIsBarcodeScanOpen(false)}
        onScan={(scannedCode) => {
          setFormSku(scannedCode);
          showToast(`Barcode terdeteksi: ${scannedCode}`, "success");
        }}
        title="Pindai Barcode Menu"
      />
    </div>
  );
}
