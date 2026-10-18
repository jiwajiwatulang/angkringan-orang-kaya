"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import {
  getTables,
  addTable,
  renameTable,
  deleteTable,
  bulkCreateTables,
  bulkRenameTables,
  bulkDeleteEmptyTables,
} from "@/lib/api";
import { App } from "@capacitor/app";

interface TableItem {
  id: number;
  nomor: string;
  status: string;
}

export default function AdminMejaPage() {
  const { showToast } = useAdmin();
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-select state
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);

  // Single Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  // Bulk Create Modal
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("Meja ");
  const [bulkStartNum, setBulkStartNum] = useState("1");
  const [bulkCount, setBulkCount] = useState("10");

  // Bulk Rename Modal
  const [isBulkRenameOpen, setIsBulkRenameOpen] = useState(false);
  const [renamePattern, setRenamePattern] = useState("Meja {N}");

  // Bulk Delete Confirm Modal
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Single Edit / Rename Modal
  const [tableToEdit, setTableToEdit] = useState<TableItem | null>(null);
  const [tableEditName, setTableEditName] = useState("");

  // Single Delete Modal
  const [tableToDelete, setTableToDelete] = useState<TableItem | null>(null);

  // Unsaved Guard
  const [unsavedConfirm, setUnsavedConfirm] = useState<{
    isOpen: boolean;
    onDiscard: () => void;
  } | null>(null);

  const loadData = async () => {
    try {
      const data = await getTables();
      setTables(data);
    } catch (e) {
      console.error("Error loading tables:", e);
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
        } else if (tableToDelete) {
          setTableToDelete(null);
        } else if (isBulkDeleteOpen) {
          setIsBulkDeleteOpen(false);
        } else if (isBulkRenameOpen) {
          setIsBulkRenameOpen(false);
        } else if (isBulkCreateOpen) {
          setIsBulkCreateOpen(false);
        } else if (tableToEdit) {
          handleCloseEdit();
        } else if (isAddOpen) {
          handleCloseAdd();
        } else if (selectedTableIds.length > 0) {
          setSelectedTableIds([]);
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
    unsavedConfirm,
    tableToDelete,
    isBulkDeleteOpen,
    isBulkRenameOpen,
    isBulkCreateOpen,
    tableToEdit,
    isAddOpen,
    selectedTableIds,
    newTableName,
    tableEditName,
  ]);

  // Multi-select helpers
  const handleToggleSelectTable = (id: number) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTableIds.length === tables.length) {
      setSelectedTableIds([]);
    } else {
      setSelectedTableIds(tables.map((t) => t.id));
    }
  };

  // --- SINGLE ACTIONS ---
  const handleCloseAdd = () => {
    if (newTableName.trim() !== "") {
      setUnsavedConfirm({
        isOpen: true,
        onDiscard: () => {
          setNewTableName("");
          setIsAddOpen(false);
        },
      });
    } else {
      setIsAddOpen(false);
    }
  };

  const handleCloseEdit = () => {
    if (tableToEdit && tableEditName.trim() !== tableToEdit.nomor) {
      setUnsavedConfirm({
        isOpen: true,
        onDiscard: () => {
          setTableToEdit(null);
        },
      });
    } else {
      setTableToEdit(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    try {
      await addTable(newTableName);
      showToast(`Meja "${newTableName}" berhasil dibuat`, "success");
      setNewTableName("");
      setIsAddOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menambah meja.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableToEdit || !tableEditName.trim()) return;
    try {
      await renameTable(tableToEdit.id, tableEditName);
      showToast(`Meja diperbarui jadi "${tableEditName}"`, "success");
      setTableToEdit(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah nama meja.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) return;
    try {
      await deleteTable(tableToDelete.id);
      showToast(`Meja "${tableToDelete.nomor}" berhasil dihapus`, "info");
      setTableToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus meja.");
    }
  };

  // --- BULK ACTIONS ---
  const handleBulkCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startNum = parseInt(bulkStartNum) || 1;
    const count = parseInt(bulkCount) || 1;

    if (count <= 0 || count > 100) {
      alert("Jumlah meja baru harus antara 1 sampai 100.");
      return;
    }

    try {
      const res = await bulkCreateTables({
        prefix: bulkPrefix,
        startNum,
        count,
      });
      showToast(`${res.createdCount} meja baru berhasil ditambahkan!`, "success");
      setIsBulkCreateOpen(false);
      await loadData();
    } catch (err: any) {
      alert("Gagal menambah meja massal: " + err.message);
    }
  };

  const handleBulkRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamePattern.trim()) {
      alert("Pola nama meja tidak boleh kosong.");
      return;
    }

    try {
      const res = await bulkRenameTables(selectedTableIds, renamePattern.trim());
      showToast(`${res.renamedCount} meja berhasil diubah namanya!`, "success");
      setIsBulkRenameOpen(false);
      setSelectedTableIds([]);
      await loadData();
    } catch (err: any) {
      alert("Gagal rename meja massal: " + err.message);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    try {
      const res = await bulkDeleteEmptyTables(selectedTableIds);
      let msg = "";
      if (res.deletedCount > 0) msg += `${res.deletedCount} meja berhasil dihapus. `;
      if (res.blockedCount > 0) {
        msg += `${res.blockedCount} meja dilindungi karena masih memiliki tagihan aktif / open bill!`;
      }
      showToast(msg || "Meja diproses.", res.blockedCount > 0 ? "error" : "info");
      setIsBulkDeleteOpen(false);
      setSelectedTableIds([]);
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus meja massal: " + err.message);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
            
            <span>Kelola Meja ({tables.length})</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Pengaturan tata letak dan nama meja pelanggan untuk Dine-in POS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Create Button */}
          <button
            type="button"
            onClick={() => {
              setBulkPrefix("Meja ");
              setBulkStartNum(String(tables.length + 1));
              setBulkCount("10");
              setIsBulkCreateOpen(true);
            }}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-accent-text font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-blue-200"
            title="Tambah banyak meja sekaligus (contoh: Meja 1 sampai 20)"
          >
            <span><LineIcon name="lightning" /></span>
            <span>Tambah Massal</span>
          </button>

          {/* Add Single Table */}
          <button
            type="button"
            onClick={() => {
              setNewTableName(`Meja ${tables.length + 1}`);
              setIsAddOpen(true);
            }}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="text-base leading-none">+</span>
            <span>Tambah Meja</span>
          </button>
        </div>
      </div>

      {/* Select All Toggle Bar */}
      {tables.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted">
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input
              type="checkbox"
              checked={tables.length > 0 && selectedTableIds.length === tables.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-accent-text focus:ring-accent border-line"
            />
            <span>Pilih Semua Meja ({tables.length})</span>
          </label>
          {selectedTableIds.length > 0 && (
            <span className=" text-accent-text font-black">
              {selectedTableIds.length} meja dipilih
            </span>
          )}
        </div>
      )}

      {/* Grid of Tables */}
      {isLoading ? (
        <div className="py-12 text-center text-muted text-xs">Memuat daftar meja...</div>
      ) : tables.length === 0 ? (
        <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
          <div className="text-4xl mb-2"><LineIcon name="info" /></div>
          <h3 className="text-sm font-bold text-slate-300">Belum ada meja</h3>
          <p className="text-xs text-muted mt-1">
            Klik tombol di atas untuk menambahkan meja atau gunakan fitur Tambah Massal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((table) => {
            const isOpenBill = table.status === "open" || table.status === "occupied";
            const isPaid = table.status === "lunas";
            const isSelected = selectedTableIds.includes(table.id);

            return (
              <div
                key={table.id}
                onClick={() => handleToggleSelectTable(table.id)}
                className={`p-4 rounded-2xl sm:rounded-3xl bg-surface border shadow-sm flex flex-col justify-between cursor-pointer select-none transition-all ${
                  isSelected
                    ? "border-accent bg-accent/20 ring-2 ring-accent/30"
                    : " border-line hover:border-accent/50"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent onClick
                        className="w-4 h-4 text-accent-text rounded border-line focus:ring-accent pointer-events-none"
                      />
                      <span className="text-lg"><LineIcon name="info" /></span>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        isOpenBill
                          ? " bg-rose-950/60 text-rose-300"
                          : isPaid
                          ? " bg-accent/60 text-accent-text"
                          : " bg-accent/60 text-accent-text"
                      }`}
                    >
                      {isOpenBill ? "TERISI" : isPaid ? "LUNAS" : "KOSONG"}
                    </span>
                  </div>

                  <h4 className="font-black text-base text-fg truncate">
                    {table.nomor}
                  </h4>
                  <span className="text-[10px] text-muted block mt-0.5">
                    ID #{table.id}
                  </span>
                </div>

                <div
                  className="mt-4 pt-3 border-t border-line flex gap-1.5"
                  onClick={(e) => e.stopPropagation()} // don't toggle select
                >
                  <button
                    type="button"
                    onClick={() => {
                      setTableToEdit(table);
                      setTableEditName(table.nomor);
                    }}
                    className="flex-1 py-1.5 bg-card hover:bg-line text-slate-300 rounded-xl text-[11px] font-bold transition-colors"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableToDelete(table)}
                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold transition-colors shrink-0"
                    title="Hapus Meja"
                  ><LineIcon name="delete" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- FLOATING BULK TOOLBAR (WHEN TABLES SELECTED) --- */}
      {selectedTableIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-[460px] z-40 bg-card/95 backdrop-blur-md text-white p-3.5 rounded-2xl sm:rounded-3xl shadow-2xl border border-line/80 animate-in slide-in-from-bottom-5 duration-200 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="text-xs font-black text-accent-text flex items-center gap-1.5">
              <span><LineIcon name="success" /></span>
              <span>{selectedTableIds.length} Meja Dipilih</span>
            </span>
            <button
              onClick={() => setSelectedTableIds([])}
              className="text-[11px] text-muted hover:text-white font-bold transition-colors"
            >
              Batal Pilih ×
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Rename Massal */}
            <button
              type="button"
              onClick={() => {
                setRenamePattern("Meja {N}");
                setIsBulkRenameOpen(true);
              }}
              className="flex-1 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span><LineIcon name="edit" /></span>
              <span>Rename Massal</span>
            </button>

            {/* Hapus Meja Kosong */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span><LineIcon name="delete" /></span>
              <span>Hapus Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH MEJA MASSAL (RANGE) --- */}
      {isBulkCreateOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkCreateOpen(false)}
        >
          <div
            className=" bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1"> Tambah Meja Massal
            </h3>
            <p className="text-xs text-muted mb-4">
              Buat serangkaian meja secara otomatis sekaligus.
            </p>

            <form onSubmit={handleBulkCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Awalan / Prefix Meja:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Meja , VIP , Lesehan "
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-bold text-fg outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nomor Mulai:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkStartNum}
                    onChange={(e) => setBulkStartNum(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-bold text-fg outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Jumlah Meja:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-bold text-fg outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-accent/40 rounded-xl border border-accent/40 text-xs">
                <span className="text-[10px] uppercase font-bold text-accent-text block">
                  Pratinjau Meja yang Akan Dibuat:
                </span>
                <span className="font-black text-accent-text">
                  {bulkPrefix}
                  {bulkStartNum || "1"} s/d {bulkPrefix}
                  {(parseInt(bulkStartNum) || 1) + (parseInt(bulkCount) || 1) - 1} (
                  {bulkCount || 0} Meja)
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkCreateOpen(false)}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  Buat {bulkCount} Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RENAME MASSAL --- */}
      {isBulkRenameOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkRenameOpen(false)}
        >
          <div
            className=" bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1"> Rename Massal Meja
            </h3>
            <p className="text-xs text-muted mb-4">
              Ubah format nama <strong>{selectedTableIds.length}</strong> meja terpilih secara berurutan.
            </p>

            <form onSubmit={handleBulkRenameSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pola Penamaan (Gunakan `{"{N}"}` untuk nomor urut):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Meja {N} atau Lesehan {N}"
                  value={renamePattern}
                  onChange={(e) => setRenamePattern(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-sm font-bold text-fg outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>

              {/* Preview */}
              <div className="p-3 bg-card rounded-xl border border-line text-xs text-slate-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Contoh Hasil Penamaan:
                </span>
                <div>1. {renamePattern.replace("{N}", "1")}</div>
                <div>2. {renamePattern.replace("{N}", "2")}</div>
                <div>... s/d {renamePattern.replace("{N}", String(selectedTableIds.length))}</div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkRenameOpen(false)}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  Terapkan Nama Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL BULK DELETE CONFIRM --- */}
      {isBulkDeleteOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkDeleteOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black"><LineIcon name="info" /></div>
            <h3 className="text-base font-black text-fg mb-1">
              Hapus {selectedTableIds.length} Meja Terpilih?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4 text-left bg-card/60 p-3 rounded-xl border border-line/60"><LineIcon name="info" /><strong>Fitur Pengaman Tagihan:</strong> Meja yang sedang memiliki pesanan/tagihan aktif (Status Open Bill atau Terisi) tidak akan dapat dihapus untuk mencegah kehilangan data keuangan kasir.
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
                Hapus Meja Kosong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH MEJA SATUAN --- */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={handleCloseAdd}
        >
          <div
            className=" bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1"> Tambah Meja Baru
            </h3>
            <p className="text-xs text-muted mb-4">
              Masukkan nomor atau nama meja makan pelanggan.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama / Nomor Meja:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Meja 16 / VIP 1"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-sm font-semibold text-fg outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAdd}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL UBAH NAMA MEJA SATUAN --- */}
      {tableToEdit && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={handleCloseEdit}
        >
          <div
            className=" bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1"> Ubah Nama Meja
            </h3>
            <p className="text-xs text-muted mb-4">
              Ganti nama meja ID #{tableToEdit.id}.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Meja:
                </label>
                <input
                  type="text"
                  value={tableEditName}
                  onChange={(e) => setTableEditName(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-sm font-semibold text-fg outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 py-3 bg-card text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOG: DELETE SINGLE TABLE --- */}
      {tableToDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTableToDelete(null)}
        >
          <div
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black"><LineIcon name="info" /></div>
            <h3 className="text-base font-black text-fg mb-1">
              Hapus Meja Ini?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus <strong>"{tableToDelete.nomor}"</strong>? Pastikan meja tidak sedang memiliki tagihan aktif.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-2.5 bg-line text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- UNSAVED CONFIRM DIALOG --- */}
      {unsavedConfirm?.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setUnsavedConfirm(null)}
        >
          <div
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-950/60 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black"><LineIcon name="info" /></div>
            <h3 className="text-base font-black text-fg mb-1">
              Batalkan Perubahan?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Input nama meja yang Anda ketik belum disimpan. Yakin ingin menutup?
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
    </div>
  );
}
