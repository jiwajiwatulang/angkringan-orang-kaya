"use client";
import LineIcon from "@/components/LineIcon";
import TableShapeIcon from "@/components/TableShapeIcon";
import React, { useState, useEffect, useMemo } from "react";
import { useAdmin } from "../AdminContext";
import {
  getTables,
  addTable,
  updateTable,
  renameTable,
  deleteTable,
  bulkCreateTables,
  bulkRenameTables,
  bulkDeleteEmptyTables,
} from "@/lib/api";
import type { TableShape } from "@/lib/dexie";
import { App } from "@capacitor/app";

interface TableItem {
  id: number;
  nomor: string;
  status: string;
  zone?: string;
  shape?: TableShape;
  capacity?: number;
  posX?: number;
  posY?: number;
}

const TABLE_SHAPES: Array<{ id: TableShape; label: string; desc: string }> = [
  { id: "square", label: "Kotak", desc: "Meja standar 2-4 kursi" },
  { id: "round", label: "Bundar", desc: "Meja bulat / keluarga" },
  { id: "rect", label: "Panjang / Sofa", desc: "Meja komunal & rombongan" },
  { id: "bar", label: "Bar Stool", desc: "Kursi tinggi barista / bar" },
  { id: "lesehan", label: "Lesehan", desc: "Saung bambu & alas tatami" },
];

const DEFAULT_ZONES = [
  "Ruang Utama",
  "Outdoor / Teras",
  "Saung & Lesehan",
  "Bar Counter",
  "Ruang VIP",
];

export default function AdminMejaPage() {
  const { showToast } = useAdmin();
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'cards' or 'floorplan'
  const [viewMode, setViewMode] = useState<"cards" | "floorplan">("cards");
  const [activeZone, setActiveZone] = useState<string>("Semua");

  // Multi-select state
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);

  // Single Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableZone, setNewTableZone] = useState("Ruang Utama");
  const [newTableShape, setNewTableShape] = useState<TableShape>("square");
  const [newTableCapacity, setNewTableCapacity] = useState("4");

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

  // Single Edit Modal
  const [tableToEdit, setTableToEdit] = useState<TableItem | null>(null);
  const [tableEditName, setTableEditName] = useState("");
  const [tableEditZone, setTableEditZone] = useState("Ruang Utama");
  const [tableEditShape, setTableEditShape] = useState<TableShape>("square");
  const [tableEditCapacity, setTableEditCapacity] = useState("4");

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
      setTables(data as TableItem[]);
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

  // Unique Zones list from tables
  const existingZones = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.zone && t.zone.trim()) set.add(t.zone.trim());
    });
    return Array.from(set);
  }, [tables]);

  const allAvailableZones = useMemo(() => {
    const merged = Array.from(new Set([...existingZones, ...DEFAULT_ZONES]));
    return merged;
  }, [existingZones]);

  // Filtered tables based on zone tab
  const filteredTables = useMemo(() => {
    if (activeZone === "Semua") return tables;
    return tables.filter((t) => (t.zone || "Ruang Utama") === activeZone);
  }, [tables, activeZone]);

  // Tables grouped by zone for the Floor Plan view
  const tablesByZone = useMemo(() => {
    const groups: Record<string, TableItem[]> = {};
    tables.forEach((t) => {
      const z = t.zone?.trim() || "Ruang Utama";
      if (!groups[z]) groups[z] = [];
      groups[z].push(t);
    });
    return groups;
  }, [tables]);

  // Multi-select helpers
  const handleToggleSelectTable = (id: number) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTableIds.length === filteredTables.length) {
      setSelectedTableIds([]);
    } else {
      setSelectedTableIds(filteredTables.map((t) => t.id));
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
    if (
      tableToEdit &&
      (tableEditName.trim() !== tableToEdit.nomor ||
        tableEditZone !== (tableToEdit.zone || "Ruang Utama") ||
        tableEditShape !== (tableToEdit.shape || "square") ||
        tableEditCapacity !== String(tableToEdit.capacity || 4))
    ) {
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
      await addTable({
        nomor: newTableName.trim(),
        zone: newTableZone.trim() || "Ruang Utama",
        shape: newTableShape,
        capacity: parseInt(newTableCapacity) || 4,
      });
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
      await updateTable(tableToEdit.id, {
        nomor: tableEditName.trim(),
        zone: tableEditZone.trim() || "Ruang Utama",
        shape: tableEditShape,
        capacity: parseInt(tableEditCapacity) || 4,
      });
      showToast(`Meja diperbarui jadi "${tableEditName}"`, "success");
      setTableToEdit(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah meja.");
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

  const openEditModal = (table: TableItem) => {
    setTableToEdit(table);
    setTableEditName(table.nomor);
    setTableEditZone(table.zone || "Ruang Utama");
    setTableEditShape(table.shape || "square");
    setTableEditCapacity(String(table.capacity || 4));
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
            Pengaturan denah ruang, bentuk meja visual, dan nama meja untuk kasir Dine-in & Waiter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl p-1 bg-surface border border-line">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "cards"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              <LineIcon name="chart" />
              <span>Daftar Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("floorplan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "floorplan"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              <LineIcon name="receipt" />
              <span>Denah Visual 2D</span>
            </button>
          </div>

          {/* Bulk Create Button */}
          <button
            type="button"
            onClick={() => {
              setBulkPrefix("Meja ");
              setBulkStartNum(String(tables.length + 1));
              setBulkCount("10");
              setIsBulkCreateOpen(true);
            }}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-accent-text font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-blue-200"
            title="Tambah banyak meja sekaligus"
          >
            <LineIcon name="lightning" />
            <span className="hidden sm:inline">Tambah Massal</span>
          </button>

          {/* Add Single Table */}
          <button
            type="button"
            onClick={() => {
              setNewTableName(`Meja ${tables.length + 1}`);
              setNewTableZone(activeZone !== "Semua" ? activeZone : "Ruang Utama");
              setNewTableShape("square");
              setNewTableCapacity("4");
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="text-base leading-none">+</span>
            <span>Tambah Meja</span>
          </button>
        </div>
      </div>

      {/* Zone Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 mr-1">
          Zona:
        </span>
        <button
          type="button"
          onClick={() => setActiveZone("Semua")}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border ${
            activeZone === "Semua"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 border-slate-900"
              : "bg-surface border-line text-muted hover:text-fg"
          }`}
        >
          Semua Zona ({tables.length})
        </button>
        {allAvailableZones.map((z) => {
          const count = tables.filter((t) => (t.zone || "Ruang Utama") === z).length;
          if (count === 0 && !existingZones.includes(z)) return null;
          return (
            <button
              key={z}
              type="button"
              onClick={() => setActiveZone(z)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border ${
                activeZone === z
                  ? "bg-accent border-accent text-white shadow-sm"
                  : "bg-surface border-line text-muted hover:text-fg"
              }`}
            >
              {z} ({count})
            </button>
          );
        })}
      </div>

      {/* Select All Toggle Bar (In card mode) */}
      {viewMode === "cards" && filteredTables.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted">
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input
              type="checkbox"
              checked={
                filteredTables.length > 0 &&
                selectedTableIds.length === filteredTables.length
              }
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-accent-text focus:ring-accent border-line"
            />
            <span>Pilih Semua ({filteredTables.length})</span>
          </label>
          {selectedTableIds.length > 0 && (
            <span className="text-accent-text font-black">
              {selectedTableIds.length} meja dipilih
            </span>
          )}
        </div>
      )}

      {/* --- CONTENT AREA --- */}
      {isLoading ? (
        <div className="py-12 text-center text-muted text-xs">Memuat daftar meja...</div>
      ) : tables.length === 0 ? (
        <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
          <div className="w-12 h-12 mx-auto mb-3 text-muted flex items-center justify-center">
            <LineIcon name="info" />
          </div>
          <h3 className="text-sm font-bold text-fg">Belum ada meja</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Klik tombol Tambah Meja di atas atau gunakan preset demo usaha untuk membuat denah meja secara instan.
          </p>
        </div>
      ) : viewMode === "floorplan" ? (
        /* --- MODE DENAH VISUAL 2D (FLOOR PLAN CANVAS) --- */
        <div className="space-y-6">
          {Object.entries(tablesByZone).map(([zoneName, zoneTables]) => {
            if (activeZone !== "Semua" && zoneName !== activeZone) return null;
            return (
              <div
                key={zoneName}
                className="bg-surface rounded-3xl border border-line p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent" />
                    <h3 className="font-black text-base text-fg tracking-tight">
                      {zoneName}
                    </h3>
                    <span className="text-xs text-muted font-semibold">
                      ({zoneTables.length} Meja • {zoneTables.reduce((acc, t) => acc + (t.capacity || 4), 0)} Kursi)
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-bold">
                    Denah Spasial Ruangan
                  </span>
                </div>

                {/* Spatial Grid representation */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 p-3 rounded-2xl bg-card/60 border border-line/60 min-h-[140px]">
                  {zoneTables.map((table) => {
                    const isOpenBill = table.status === "open" || table.status === "occupied";
                    const isPaid = table.status === "lunas";
                    const shape = table.shape || "square";

                    const shapeClasses =
                      shape === "round"
                        ? "rounded-full aspect-square"
                        : shape === "bar"
                        ? "rounded-2xl aspect-square border-dashed"
                        : shape === "lesehan"
                        ? "rounded-xl border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
                        : shape === "rect"
                        ? "rounded-2xl col-span-1 sm:col-span-2"
                        : "rounded-2xl aspect-square";

                    return (
                      <div
                        key={table.id}
                        onClick={() => openEditModal(table)}
                        className={`relative p-3.5 flex flex-col justify-between items-center text-center cursor-pointer transition-all border-2 hover:scale-[1.02] shadow-sm active:scale-95 ${shapeClasses} ${
                          isOpenBill
                            ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                            : isPaid
                            ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                            : "border-line bg-card hover:border-accent text-fg"
                        }`}
                        title={`Klik untuk ubah data: ${table.nomor}`}
                      >
                        {/* Table Shape Icon & Capacity */}
                        <div className="flex items-center justify-between w-full text-muted">
                          <TableShapeIcon shape={shape} size={16} />
                          <span className="text-[10px] font-bold">
                            {table.capacity || 4}p
                          </span>
                        </div>

                        {/* Name */}
                        <div className="my-1 w-full">
                          <h4 className="font-black text-xs sm:text-sm truncate max-w-full">
                            {table.nomor}
                          </h4>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isOpenBill
                              ? "bg-rose-600 text-white"
                              : isPaid
                              ? "bg-amber-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {isOpenBill ? "TERISI" : isPaid ? "TAGIHAN" : "KOSONG"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- MODE DAFTAR / KARTU MEJA --- */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredTables.map((table) => {
            const isOpenBill = table.status === "open" || table.status === "occupied";
            const isPaid = table.status === "lunas";
            const isSelected = selectedTableIds.includes(table.id);
            const shape = table.shape || "square";

            return (
              <div
                key={table.id}
                onClick={() => handleToggleSelectTable(table.id)}
                className={`p-4 rounded-2xl sm:rounded-3xl bg-surface border shadow-sm flex flex-col justify-between cursor-pointer select-none transition-all ${
                  isSelected
                    ? "border-accent bg-accent/20 ring-2 ring-accent/30"
                    : "border-line hover:border-accent/50"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-accent-text rounded border-line focus:ring-accent pointer-events-none"
                      />
                      <span className="text-muted" title={table.shape || "square"}>
                        <TableShapeIcon shape={shape} size={18} />
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        isOpenBill
                          ? "bg-rose-100 text-rose-900 border border-rose-200"
                          : isPaid
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}
                    >
                      {isOpenBill ? "TERISI" : isPaid ? "TAGIHAN" : "KOSONG"}
                    </span>
                  </div>

                  <h4 className="font-black text-sm sm:text-base text-fg truncate">
                    {table.nomor}
                  </h4>

                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted">
                    <span className="font-semibold truncate max-w-[100px]">
                      {table.zone || "Ruang Utama"}
                    </span>
                    <span>•</span>
                    <span className="font-bold">{table.capacity || 4} Kursi</span>
                  </div>
                </div>

                <div
                  className="mt-4 pt-3 border-t border-line flex gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(table)}
                    className="flex-1 py-1.5 bg-card border border-line hover:bg-line text-fg rounded-xl text-[11px] font-bold transition-colors"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableToDelete(table)}
                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold transition-colors shrink-0"
                    title="Hapus Meja"
                  >
                    <LineIcon name="delete" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- FLOATING BULK TOOLBAR (WHEN TABLES SELECTED) --- */}
      {selectedTableIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-[460px] z-40 bg-card/95 backdrop-blur-md text-fg p-3.5 rounded-2xl sm:rounded-3xl shadow-2xl border border-line animate-in slide-in-from-bottom-5 duration-200 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-black text-accent-text flex items-center gap-1.5">
              <span className="text-accent-text">
                <LineIcon name="success" />
              </span>
              <span>{selectedTableIds.length} Meja Dipilih</span>
            </span>
            <button
              onClick={() => setSelectedTableIds([])}
              className="text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg font-bold transition-colors"
            >
              Batal Pilih ×
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setRenamePattern("Meja {N}");
                setIsBulkRenameOpen(true);
              }}
              className="flex-1 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-line rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <LineIcon name="edit" />
              <span>Rename Massal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <LineIcon name="delete" />
              <span>Hapus Terpilih</span>
            </button>
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
            className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-250 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1">Tambah Meja Baru</h3>
            <p className="text-xs text-muted mb-4">
              Konfigurasi tata letak fisik, bentuk, zona ruang, dan kapasitas kursi.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Table Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-fg">
                    Nama / Nomor Meja:
                  </label>
                  <span className="text-[10px] text-muted font-mono">{newTableName.length}/25 karakter</span>
                </div>
                <input
                  type="text"
                  maxLength={25}
                  placeholder="Contoh: Sofa Jendela, Lesehan Kolam, Meja 12"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-sm font-semibold text-fg outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>

              {/* Table Shape Selector */}
              <div>
                <label className="block text-xs font-bold text-fg mb-1.5">
                  Bentuk Meja Visual:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TABLE_SHAPES.map((shp) => (
                    <button
                      key={shp.id}
                      type="button"
                      onClick={() => setNewTableShape(shp.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        newTableShape === shp.id
                          ? "bg-accent/15 border-accent text-accent-text ring-2 ring-accent/30 font-bold"
                          : "bg-card border-line text-muted hover:text-fg"
                      }`}
                    >
                      <TableShapeIcon shape={shp.id} size={20} />
                      <div className="truncate">
                        <span className="text-xs font-bold block">{shp.label}</span>
                        <span className="text-[10px] text-muted truncate block">
                          {shp.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone and Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg mb-1">
                    Zona Ruangan:
                  </label>
                  <input
                    type="text"
                    list="available-zones-list"
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    placeholder="misal: Ruang Utama"
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-semibold text-fg outline-none focus:border-accent"
                  />
                  <datalist id="available-zones-list">
                    {allAvailableZones.map((z) => (
                      <option key={z} value={z} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-fg mb-1">
                    Kapasitas Kursi:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-semibold text-fg outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAdd}
                  className="flex-1 py-3 bg-card text-fg border border-line rounded-xl text-xs font-bold hover:bg-line transition-colors"
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

      {/* --- MODAL UBAH MEJA SATUAN --- */}
      {tableToEdit && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={handleCloseEdit}
        >
          <div
            className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-250 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1">Ubah Meja</h3>
            <p className="text-xs text-muted mb-4">
              Perbarui nama, bentuk visual, zona ruang, dan kapasitas meja ID #{tableToEdit.id}.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-fg">
                    Nama / Nomor Meja:
                  </label>
                  <span className="text-[10px] text-muted font-mono">{tableEditName.length}/25 karakter</span>
                </div>
                <input
                  type="text"
                  maxLength={25}
                  value={tableEditName}
                  onChange={(e) => setTableEditName(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-3 text-sm font-semibold text-fg outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>

              {/* Table Shape Selector */}
              <div>
                <label className="block text-xs font-bold text-fg mb-1.5">
                  Bentuk Meja Visual:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TABLE_SHAPES.map((shp) => (
                    <button
                      key={shp.id}
                      type="button"
                      onClick={() => setTableEditShape(shp.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        tableEditShape === shp.id
                          ? "bg-accent/15 border-accent text-accent-text ring-2 ring-accent/30 font-bold"
                          : "bg-card border-line text-muted hover:text-fg"
                      }`}
                    >
                      <TableShapeIcon shape={shp.id} size={20} />
                      <div className="truncate">
                        <span className="text-xs font-bold block">{shp.label}</span>
                        <span className="text-[10px] text-muted truncate block">
                          {shp.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone and Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg mb-1">
                    Zona Ruangan:
                  </label>
                  <input
                    type="text"
                    list="edit-zones-list"
                    value={tableEditZone}
                    onChange={(e) => setTableEditZone(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-semibold text-fg outline-none focus:border-accent"
                  />
                  <datalist id="edit-zones-list">
                    {allAvailableZones.map((z) => (
                      <option key={z} value={z} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-fg mb-1">
                    Kapasitas Kursi:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={tableEditCapacity}
                    onChange={(e) => setTableEditCapacity(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-semibold text-fg outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 py-3 bg-card text-fg border border-line rounded-xl text-xs font-bold hover:bg-line transition-colors"
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

      {/* --- MODAL TAMBAH MEJA MASSAL (RANGE) --- */}
      {isBulkCreateOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkCreateOpen(false)}
        >
          <div
            className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1">Tambah Meja Massal</h3>
            <p className="text-xs text-muted mb-4">
              Buat serangkaian meja secara otomatis sekaligus.
            </p>

            <form onSubmit={handleBulkCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-fg mb-1">
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
                  <label className="block text-xs font-bold text-fg mb-1">
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
                  <label className="block text-xs font-bold text-fg mb-1">
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
                  className="flex-1 py-3 bg-card text-fg border border-line rounded-xl text-xs font-bold hover:bg-line transition-colors"
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
            className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-line animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-lg font-black text-fg mb-1">Rename Massal Meja</h3>
            <p className="text-xs text-muted mb-4">
              Ubah format nama <strong>{selectedTableIds.length}</strong> meja terpilih secara berurutan.
            </p>

            <form onSubmit={handleBulkRenameSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-fg mb-1">
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

              <div className="p-3 bg-card rounded-xl border border-line text-xs text-fg space-y-1">
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
                  className="flex-1 py-3 bg-card text-fg border border-line rounded-xl text-xs font-bold hover:bg-line transition-colors"
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
            className="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              <LineIcon name="info" />
            </div>
            <h3 className="text-base font-black text-fg mb-1">
              Hapus {selectedTableIds.length} Meja Terpilih?
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4 text-left bg-card/60 p-3 rounded-xl border border-line/60">
              <LineIcon name="info" />
              <strong>Fitur Pengaman Tagihan:</strong> Meja yang sedang memiliki pesanan/tagihan aktif (Status Open Bill atau Terisi) tidak akan dapat dihapus untuk mencegah kehilangan data keuangan kasir.
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

      {/* --- CONFIRMATION DIALOG: DELETE SINGLE TABLE --- */}
      {tableToDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTableToDelete(null)}
        >
          <div
            className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              <LineIcon name="info" />
            </div>
            <h3 className="text-base font-black text-fg mb-1">Hapus Meja Ini?</h3>
            <p className="text-xs text-muted leading-relaxed mb-5">
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
            className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              <LineIcon name="info" />
            </div>
            <h3 className="text-base font-black text-fg mb-1">Batalkan Perubahan?</h3>
            <p className="text-xs text-muted leading-relaxed mb-5">
              Input data meja yang Anda ketik belum disimpan. Yakin ingin menutup?
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
