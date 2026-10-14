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

type MenuItem = {
  id: number;
  sku?: string;
  nama: string;
  harga: number;
  kategori: string;
  isSoldOut?: boolean;
  modifiers?: any[];
};

export default function AdminMenuPage() {
  const { showToast } = useAdmin();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

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
  const [formNama, setFormNama] = useState("");
  const [formHarga, setFormHarga] = useState("");
  const [formKategori, setFormKategori] = useState("Nasi");
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [customKategori, setCustomKategori] = useState("");

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
    setFormSku(`SKU-${String(menus.length + 1).padStart(3, "0")}`);
    setFormNama("");
    setFormHarga("");
    setFormKategori("Nasi");
    setIsCustomKategori(false);
    setCustomKategori("");
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setFormSku(menu.sku || `SKU-${String(menu.id).padStart(3, "0")}`);
    setFormNama(menu.nama);
    setFormHarga(menu.harga.toString());
    const standardCategories = ["Nasi", "Lauk", "Minuman", "Camilan", "Sate", "Wedang"];
    if (standardCategories.includes(menu.kategori)) {
      setFormKategori(menu.kategori);
      setIsCustomKategori(false);
      setCustomKategori("");
    } else {
      setFormKategori("Lainnya");
      setIsCustomKategori(true);
      setCustomKategori(menu.kategori);
    }
    setIsSheetOpen(true);
  };

  const isFormDirty = () => {
    if (editingMenu) {
      const finalKat = isCustomKategori ? customKategori : formKategori;
      return (
        formNama.trim() !== editingMenu.nama ||
        Number(formHarga) !== editingMenu.harga ||
        finalKat.trim() !== editingMenu.kategori ||
        formSku.trim() !== (editingMenu.sku || "")
      );
    } else {
      return formNama.trim() !== "" || formHarga.trim() !== "" || customKategori.trim() !== "";
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
    const finalKat = isCustomKategori ? customKategori.trim() || "Lainnya" : formKategori;
    const finalHarga = Number(formHarga) || 0;

    if (!formNama.trim()) {
      alert("Nama menu tidak boleh kosong");
      return;
    }

    try {
      if (editingMenu) {
        await updateMenu(editingMenu.id, {
          sku: formSku.trim() || undefined,
          nama: formNama,
          harga: finalHarga,
          kategori: finalKat,
        });
        showToast(`Menu "${formNama}" berhasil diperbarui`, "success");
      } else {
        await createMenu({
          sku: formSku.trim() || undefined,
          nama: formNama,
          harga: finalHarga,
          kategori: finalKat,
        });
        showToast(`Menu "${formNama}" berhasil ditambahkan`, "success");
      }
      setIsSheetOpen(false);
      setEditingMenu(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal menyimpan menu: " + err.message);
    }
  };

  const handleToggleStock = async (menu: MenuItem) => {
    try {
      const newStatus = !menu.isSoldOut;
      await toggleMenuSoldOut(menu.id, newStatus);
      showToast(
        `Stok "${menu.nama}" diubah jadi ${newStatus ? "HABIS" : "TERSEDIA"}`,
        newStatus ? "error" : "success"
      );
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah status stok: " + err.message);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>🍽️</span>
            <span>Kelola Menu & Stok</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Total {menus.length} menu terdaftar di sistem SakuNota.
          </p>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={() => handleExportCatalog("xlsx")}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-95 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            title="Download seluruh daftar menu dalam file Excel"
          >
            <span>📥</span>
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
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 active:scale-95 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-blue-200 dark:border-blue-800"
            title="Import menu secara massal dari Excel atau CSV"
          >
            <span>📊</span>
            <span>Import Excel / CSV</span>
          </button>

          {/* Add Menu Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
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
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
          />
          <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
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
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200/60 dark:border-gray-700/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-bold">Urut:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 outline-none"
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
              <span className="text-gray-400 font-bold">Tampil:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="py-1.5 px-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 outline-none"
              >
                <option value={12}>12 / hal</option>
                <option value={24}>24 / hal</option>
                <option value={48}>48 / hal</option>
                <option value={0}>Semua ({sortedMenus.length})</option>
              </select>
            </div>
          </div>

          {selectedMenuIds.length > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-black">
              {selectedMenuIds.length} menu dipilih
            </span>
          )}
        </div>

        {/* Selection Bar / Select All row */}
        {sortedMenus.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={handleSelectAllFiltered}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 rounded border-gray-300"
              />
              <span>Pilih Semua {sortedMenus.length} Menu</span>
            </label>

            {itemsPerPage > 0 && sortedMenus.length > itemsPerPage && (
              <span className="text-[11px] text-gray-400 font-semibold">
                Halaman {currentPage} dari {totalPages}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Menu Cards / Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-xs">Memuat daftar menu...</div>
      ) : sortedMenus.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-4xl mb-2">🍽️</div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Tidak ada menu yang cocok</h3>
          <p className="text-xs text-gray-400 mt-1">Coba ganti kata kunci pencarian atau kategori filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedMenus.map((menu) => {
              const isSelected = selectedMenuIds.includes(menu.id);
              return (
                <div
                  key={menu.id}
                  onClick={() => handleToggleSelectMenu(menu.id)}
                  className={`p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border transition-all flex flex-col justify-between cursor-pointer relative select-none ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/30"
                      : menu.isSoldOut
                      ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/20"
                      : "border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50"
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
                          className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                        />
                        <div>
                          <h4 className="font-black text-sm text-gray-900 dark:text-white leading-snug">
                            {menu.nama}
                          </h4>
                          {menu.sku && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              {menu.sku}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                        {menu.kategori}
                      </span>
                    </div>

                    <div className="text-base font-black text-emerald-700 dark:text-emerald-400 ml-6">
                      Rp {menu.harga.toLocaleString("id-ID")}
                    </div>
                  </div>

                  {/* Actions & Stock Toggle */}
                  <div
                    className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()} // don't toggle selection when clicking buttons
                  >
                    {/* 1-Tap Stock Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStock(menu)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all active:scale-95 ${
                        menu.isSoldOut
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200"
                      }`}
                      title="Klik untuk ubah stok di kasir"
                    >
                      <span>{menu.isSoldOut ? "🔴 Habis" : "🟢 Tersedia"}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(menu)}
                        className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Edit Menu"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuToDelete(menu)}
                        className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Hapus Menu"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Navigation Bar */}
          {itemsPerPage > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-semibold">
                Menampilkan {Math.min(startIndex + 1, sortedMenus.length)} - {Math.min(startIndex + itemsPerPage, sortedMenus.length)} dari {sortedMenus.length} menu
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-all active:scale-95"
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
                          <span className="px-1 text-gray-400">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                            currentPage === p
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
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
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-all active:scale-95"
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
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-[500px] z-40 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md text-white p-3.5 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-700/80 animate-in slide-in-from-bottom-5 duration-200 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-gray-700/60 pb-2">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <span>✓</span>
              <span>{selectedMenuIds.length} Menu Terpilih</span>
            </span>
            <button
              onClick={() => setSelectedMenuIds([])}
              className="text-[11px] text-gray-400 hover:text-white font-bold transition-colors"
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
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span>💲</span>
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
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span>🏷️</span>
              <span>Ubah Kategori</span>
            </button>

            {/* Set Tersedia */}
            <button
              type="button"
              onClick={() => handleBulkToggleStock(false)}
              className="px-2.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span>🟢</span>
              <span>Tersedia</span>
            </button>

            {/* Set Habis */}
            <button
              type="button"
              onClick={() => handleBulkToggleStock(true)}
              className="px-2.5 py-1.5 bg-amber-800/80 hover:bg-amber-700 text-amber-200 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span>🔴</span>
              <span>Habis</span>
            </button>

            {/* Hapus Terpilih */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-2.5 py-1.5 bg-rose-800/80 hover:bg-rose-700 text-rose-200 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all ml-auto"
            >
              <span>🗑️</span>
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
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              💲 Ubah Harga Massal
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Ubah harga serentak untuk <strong>{selectedMenuIds.length}</strong> menu terpilih.
            </p>

            <form onSubmit={handleBulkPriceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tipe Penyesuaian:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkPriceType("nominal")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      bulkPriceType === "nominal"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    Nominal (+/- Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkPriceType("percent")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      bulkPriceType === "percent"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    Persentase (+/- %)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {bulkPriceType === "nominal"
                    ? "Nilai Rupiah (Gunakan minus '-' untuk diskon):"
                    : "Nilai Persentase (Contoh: 10 untuk +10%, -10 untuk -10%):"}
                </label>
                <input
                  type="number"
                  placeholder={bulkPriceType === "nominal" ? "Contoh: 2000 atau -1000" : "Contoh: 10 atau -5"}
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-base font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {bulkPriceType === "nominal"
                    ? "Harga baru = Harga saat ini + Nominal"
                    : "Harga baru = Harga saat ini ± (Persentase %)"}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPriceOpen(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
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
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              🏷️ Ubah Kategori Massal
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Pindahkan <strong>{selectedMenuIds.length}</strong> menu terpilih ke kategori yang sama.
            </p>

            <form onSubmit={handleBulkCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
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
                    className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-emerald-500 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-none"
                    autoFocus
                    required
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkCategoryOpen(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
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
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🗑️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              Hapus {selectedMenuIds.length} Menu Terpilih?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4 text-left bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
              🛡️ <strong>Fitur Pengaman Finansial:</strong> Menu yang pernah memiliki riwayat transaksi/nota tidak akan dihapus dari database, melainkan otomatis dinonaktifkan (Status Habis) agar seluruh laporan penjualan masa lalu tetap akurat.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
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
            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl border border-gray-100 dark:border-gray-800 my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📊</span>
                  <span>Import Menu Massal (Excel / CSV)</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  100% Offline tanpa internet. Mendukung format .xlsx, .xls, dan .csv.
                </p>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setIsImportOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Step 1: Download Templates */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 block mb-2">
                  Langkah 1: Unduh Format Template Resmi SakuNota
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadMenuTemplate("xlsx")}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span>📥</span>
                    <span>Download Template Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadMenuTemplate("csv")}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>📄</span>
                    <span>Download Template CSV</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Choose File */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Langkah 2: Pilih File Excel atau CSV yang Sudah Diisi:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  disabled={isParsing || isImporting}
                  className="w-full text-xs text-gray-500 dark:text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 dark:file:bg-emerald-950/60 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer border border-gray-200 dark:border-gray-700 rounded-2xl p-2"
                />
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="py-4 text-center text-xs text-gray-400 font-semibold animate-pulse">
                  Sedang membaca dan memvalidasi file Excel...
                </div>
              )}

              {/* Step 3: Validation Preview */}
              {importResult && (
                <div className="space-y-3 p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 dark:text-blue-300">
                      Hasil Analisis File: {importFile?.name}
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      Total: {importResult.totalRows} baris
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                        Siap Diimport
                      </div>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                        {importResult.validRows.length} Menu
                      </div>
                    </div>

                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                        Gagal / Invalid
                      </div>
                      <div className="text-lg font-black text-rose-700 dark:text-rose-300">
                        {importResult.invalidRows.length} Baris
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/40 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                        SKU Duplikat
                      </div>
                      <div className="text-lg font-black text-amber-700 dark:text-amber-300">
                        {importResult.duplicateSkus.length} SKU
                      </div>
                    </div>
                  </div>

                  {/* Invalid details if any */}
                  {importResult.invalidRows.length > 0 && (
                    <div className="max-h-24 overflow-y-auto text-[11px] text-rose-600 dark:text-rose-400 bg-white dark:bg-gray-800 p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-1">
                      {importResult.invalidRows.map((err, idx) => (
                        <div key={idx}>
                          Baris {err.row}: {err.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Import Mode Options */}
                  <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Metode Penggabungan (Mode Import):
                    </label>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="upsert"
                          checked={importMode === "upsert"}
                          onChange={() => setImportMode("upsert")}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <strong className="text-gray-900 dark:text-white">Upsert (Sangat Direkomendasikan)</strong>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Tambah menu baru dan perbarui harga/kategori jika SKU atau Nama sudah ada.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="create_only"
                          checked={importMode === "create_only"}
                          onChange={() => setImportMode("create_only")}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <strong className="text-gray-900 dark:text-white">Hanya Tambah Baru</strong>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Hanya masukkan menu yang belum terdaftar di sistem. Menu lama tidak akan diubah.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="update_existing"
                          checked={importMode === "update_existing"}
                          onChange={() => setImportMode("update_existing")}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <strong className="text-gray-900 dark:text-white">Hanya Update Menu Lama</strong>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Perbarui harga & stok menu yang cocok, abaikan menu baru di file.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Auto-backup Checkbox */}
                  <label className="flex items-center gap-2 pt-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={importAutoBackup}
                      onChange={(e) => setImportAutoBackup(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>🛡️ Buat file backup database otomatis sebelum proses import dimulai</span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setIsImportOpen(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!importResult || importResult.validRows.length === 0 || isImporting}
                  onClick={handleExecuteImport}
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200 p-0 sm:p-4"
          onClick={handleCloseSheet}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for touch */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {editingMenu ? "✏️ Edit Produk Menu" : "➕ Tambah Menu Baru"}
              </h3>
              <button
                type="button"
                onClick={handleCloseSheet}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  SKU / Kode Menu (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: AYM-001"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Menu:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Nasi Goreng Spesial"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Harga Jual (Rp):
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 15000"
                  value={formHarga}
                  onChange={(e) => setFormHarga(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-lg font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori Menu:
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
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                >
                  <option value="Nasi">Nasi & Makanan Pokok</option>
                  <option value="Lauk">Lauk Pauk & Sambal</option>
                  <option value="Minuman">Minuman Dingin / Panas</option>
                  <option value="Camilan">Camilan & Gorengan</option>
                  <option value="Sate">Aneka Sate Angkringan</option>
                  <option value="Wedang">Wedangan Tradisional</option>
                  <option value="Lainnya">+ Buat Kategori Baru...</option>
                </select>

                {isCustomKategori && (
                  <input
                    type="text"
                    placeholder="Ketik kategori baru (contoh: Coffee / Dessert)"
                    value={customKategori}
                    onChange={(e) => setCustomKategori(e.target.value)}
                    className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-emerald-500 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleCloseSheet}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {editingMenu ? "Simpan Perubahan" : "+ Tambah Menu"}
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
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🗑️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              Hapus Menu Ini?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Menu <strong>"{menuToDelete.nama}"</strong> akan dihapus permanen dari daftar kasir.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setMenuToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
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
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              Batalkan Perubahan Menu?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Data rincian menu yang sedang Anda ketik belum disimpan. Yakin ingin membuang perubahan?
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setUnsavedConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
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
    </div>
  );
}
