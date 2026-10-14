"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import { getMenus, createMenu, updateMenu, toggleMenuSoldOut, deleteMenus } from "@/lib/api";
import { App } from "@capacitor/app";

type MenuItem = {
  id: number;
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

  // Bottom Sheet Form State (Tambah & Edit)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formHarga, setFormHarga] = useState("");
  const [formKategori, setFormKategori] = useState("Nasi");
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [customKategori, setCustomKategori] = useState("");

  // Confirmation Modals
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

  // Back button handling for Bottom Sheet
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (unsavedConfirm?.isOpen) {
          setUnsavedConfirm(null);
        } else if (menuToDelete) {
          setMenuToDelete(null);
        } else if (isSheetOpen) {
          handleCloseSheet();
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
  }, [isSheetOpen, unsavedConfirm, menuToDelete, formNama, formHarga, formKategori, customKategori]);

  const categories = ["Semua", ...Array.from(new Set(menus.map((m) => m.kategori).filter(Boolean)))];

  const filteredMenus = menus.filter((m) => {
    const matchesSearch =
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || m.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingMenu(null);
    setFormNama("");
    setFormHarga("");
    setFormKategori("Nasi");
    setIsCustomKategori(false);
    setCustomKategori("");
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
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
        finalKat.trim() !== editingMenu.kategori
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
          nama: formNama,
          harga: finalHarga,
          kategori: finalKat,
        });
        showToast(`Menu "${formNama}" berhasil diperbarui`, "success");
      } else {
        await createMenu({
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

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>🍽️</span>
            <span>Kelola Menu & Stok</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Total {menus.length} menu terdaftar di sistem SakuNota.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <span className="text-base leading-none">+</span>
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* Search & Categories Filter */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama menu atau kategori..."
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
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
      </div>

      {/* Menu Cards / Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-xs">Memuat daftar menu...</div>
      ) : filteredMenus.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-4xl mb-2">🍽️</div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Tidak ada menu yang cocok</h3>
          <p className="text-xs text-gray-400 mt-1">Coba ganti kata kunci pencarian atau kategori filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMenus.map((menu) => (
            <div
              key={menu.id}
              className={`p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border transition-all flex flex-col justify-between ${
                menu.isSoldOut
                  ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/20"
                  : "border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <h4 className="font-black text-sm text-gray-900 dark:text-white leading-snug">
                    {menu.nama}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                    {menu.kategori}
                  </span>
                </div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  Rp {menu.harga.toLocaleString("id-ID")}
                </div>
              </div>

              {/* Actions & Stock Toggle */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
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
          ))}
        </div>
      )}

      {/* --- BOTTOM SHEET FORM (TAMBAH / EDIT MENU) --- */}
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

      {/* --- CONFIRMATION DIALOG: DELETE MENU --- */}
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
