"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import { getTables, addTable, renameTable, deleteTable } from "@/lib/api";
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

  // Add Table Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  // Edit / Rename Modal
  const [tableToEdit, setTableToEdit] = useState<TableItem | null>(null);
  const [tableEditName, setTableEditName] = useState("");

  // Delete Modal
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
        } else if (tableToEdit) {
          handleCloseEdit();
        } else if (isAddOpen) {
          handleCloseAdd();
        }
      }).then((handle) => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [unsavedConfirm, tableToDelete, tableToEdit, isAddOpen, newTableName, tableEditName]);

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

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>🪑</span>
            <span>Kelola Meja ({tables.length})</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pengaturan tata letak dan nama meja pelanggan untuk Dine-in POS.
          </p>
        </div>

        <button
          onClick={() => {
            setNewTableName(`Meja ${tables.length + 1}`);
            setIsAddOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <span className="text-base leading-none">+</span>
          <span>Tambah Meja Baru</span>
        </button>
      </div>

      {/* Grid of Tables */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-xs">Memuat daftar meja...</div>
      ) : tables.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-4xl mb-2">🪑</div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Belum ada meja</h3>
          <p className="text-xs text-gray-400 mt-1">Klik tombol di atas untuk menambahkan meja pertama Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((table) => {
            const isAvailable = table.status === "kosong" || table.status === "available";
            const isOpenBill = table.status === "open" || table.status === "occupied";
            const isPaid = table.status === "lunas";

            return (
              <div
                key={table.id}
                className="p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/50 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg">🪑</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        isOpenBill
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          : isPaid
                          ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isOpenBill ? "TERISI" : isPaid ? "LUNAS" : "KOSONG"}
                    </span>
                  </div>

                  <h4 className="font-black text-base text-gray-900 dark:text-white truncate">
                    {table.nomor}
                  </h4>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    ID #{table.id}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTableToEdit(table);
                      setTableEditName(table.nomor);
                    }}
                    className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-bold transition-colors"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableToDelete(table)}
                    className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold transition-colors shrink-0"
                    title="Hapus Meja"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL TAMBAH MEJA --- */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={handleCloseAdd}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              ➕ Tambah Meja Baru
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Masukkan nomor atau nama meja makan pelanggan.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama / Nomor Meja:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Meja 16 / VIP 1"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAdd}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL UBAH NAMA MEJA --- */}
      {tableToEdit && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={handleCloseEdit}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              ✏️ Ubah Nama Meja
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Ganti nama meja ID #{tableToEdit.id}.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Meja:
                </label>
                <input
                  type="text"
                  value={tableEditName}
                  onChange={(e) => setTableEditName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOG: DELETE TABLE --- */}
      {tableToDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTableToDelete(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🗑️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              Hapus Meja Ini?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus <strong>"{tableToDelete.nomor}"</strong>? Pastikan meja tidak sedang memiliki tagihan aktif.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
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
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              Batalkan Perubahan?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Input nama meja yang Anda ketik belum disimpan. Yakin ingin menutup?
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
