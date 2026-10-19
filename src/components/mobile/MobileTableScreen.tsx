"use client";
import LineIcon from "@/components/LineIcon";
import TableShapeIcon from "@/components/TableShapeIcon";
import React, { useState, useMemo } from "react";

interface MobileTableScreenProps {
  tableData: any[];
  activeOrders: any[];
  selectedTable: string;
  onSelectTable: (tableId: string) => void;
  onTableAction: (table: any) => void;
  onOpenNewOrderForTable: (tableId: string) => void;
  onClearTable: (tableId: number) => void;
}

export default function MobileTableScreen({
  tableData,
  activeOrders,
  selectedTable,
  onSelectTable,
  onTableAction,
  onOpenNewOrderForTable,
  onClearTable,
}: MobileTableScreenProps) {
  const [filterStatus, setFilterStatus] = useState<"semua" | "kosong" | "terisi" | "lunas">("semua");
  const [activeZone, setActiveZone] = useState<string>("Semua");
  const [activeSheetTable, setActiveSheetTable] = useState<any | null>(null);

  const getTableActiveOrder = (tableId: number | string) => {
    const numId = Number(tableId);
    const strId = String(tableId);
    return (activeOrders || []).find(
      (o) => o && (Number(o.tableId) === numId || String(o.tableId) === strId) && (o.status === "unpaid" || o.status === "paid")
    );
  };

  // Extract unique zones
  const zones = useMemo(() => {
    const set = new Set<string>();
    (tableData || []).forEach((t) => {
      if (t && t.zone && t.zone.trim()) set.add(t.zone.trim());
    });
    return Array.from(set);
  }, [tableData]);

  const filteredTables = (tableData || []).filter((table) => {
    if (!table || table.id == null) return false;

    // Filter zone
    if (activeZone !== "Semua" && (table.zone || "Ruang Utama") !== activeZone) {
      return false;
    }

    const activeOrder = getTableActiveOrder(table.id);
    const isPaid = activeOrder && activeOrder.status === "paid";
    const isOccupied = activeOrder && activeOrder.status === "unpaid";
    const isEmpty = !activeOrder;

    if (filterStatus === "kosong") return isEmpty;
    if (filterStatus === "terisi") return isOccupied;
    if (filterStatus === "lunas") return isPaid;
    return true;
  });

  const handleCardClick = (table: any) => {
    if (!table || table.id == null) return;
    const activeOrder = getTableActiveOrder(table.id);
    if (!activeOrder) {
      // Empty table -> Directly open for new order
      onOpenNewOrderForTable(table.id.toString());
    } else {
      // Occupied / Paid -> Open table action sheet
      setActiveSheetTable(table);
    }
  };

  const getDisplayName = (table: any) => {
    return table?.nomor || table?.nomorMeja || table?.namaMeja || `Meja ${table?.id || ''}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Bar & Status Chips */}
      <div className="p-3.5 pb-2 shrink-0 border-b border-line/40 bg-surface/50 backdrop-blur-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-fg flex items-center gap-2">
            <span>Denah Meja</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-card text-muted border border-line">
              {tableData.length} Meja
            </span>
          </h2>

          <div className="flex items-center gap-2 text-[11px] text-muted font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{tableData.filter(t => !getTableActiveOrder(t.id)).length} Kosong</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>{tableData.filter(t => getTableActiveOrder(t.id)?.status === 'unpaid').length} Terisi</span>
            </span>
          </div>
        </div>

        {/* Zone Filter (If more than 1 zone exists) */}
        {zones.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveZone("Semua")}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all text-[11px] border ${
                activeZone === "Semua"
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 border-slate-900"
                  : "bg-card border-line text-muted hover:text-fg"
              }`}
            >
              Semua Zona
            </button>
            {zones.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setActiveZone(z)}
                className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all text-[11px] border ${
                  activeZone === z
                    ? "bg-accent border-accent text-white shadow-sm"
                    : "bg-card border-line text-muted hover:text-fg"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        )}

        {/* Status Filter Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(["semua", "kosong", "terisi", "lunas"] as const).map((status) => {
            const labelMap = {
              semua: "Semua Status",
              kosong: "Kosong",
              terisi: "Terisi",
              lunas: "Lunas",
            };
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : "bg-card border border-line text-muted hover:text-fg"
                }`}
              >
                {labelMap[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tables Grid (2-column on mobile, 3-column on landscape / tablet) */}
      <div className="flex-1 overflow-y-auto p-3.5 pb-28">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <span className="text-3xl mb-2 text-muted">
              <LineIcon name="info" />
            </span>
            <p className="text-sm font-bold text-fg">Tidak Ada Meja</p>
            <p className="text-xs text-muted mt-1">Tidak ada meja dengan filter ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 landscape:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredTables.map((table) => {
              const activeOrder = getTableActiveOrder(table.id);
              const isPaid = activeOrder && activeOrder.status === "paid";
              const isOccupied = activeOrder && activeOrder.status === "unpaid";
              const isSelected = selectedTable === table.id.toString();

              let statusLabel = "Kosong";
              let badgeColor = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
              let cardBorder = "border-line bg-card";

              if (isPaid) {
                statusLabel = "Lunas";
                badgeColor = "bg-emerald-50 text-emerald-800 border border-emerald-200 font-black";
                cardBorder = "border-emerald-300 bg-card";
              } else if (isOccupied) {
                statusLabel = "Terisi";
                badgeColor = "bg-rose-50 text-rose-900 border border-rose-300 font-black";
                cardBorder = "border-rose-300 bg-card";
              }

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleCardClick(table)}
                  className={`p-3 rounded-2xl border flex flex-col justify-between text-left transition-all active:scale-95 relative shadow-sm min-h-[96px] ${cardBorder} ${
                    isSelected ? "ring-2 ring-accent" : ""
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-muted shrink-0">
                          <TableShapeIcon shape={table.shape || "square"} size={16} />
                        </span>
                        <span className="text-xs sm:text-sm font-black text-fg truncate">
                          {getDisplayName(table)}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-muted">
                      <span className="truncate max-w-[80px]">
                        {table.zone || "Ruang Utama"}
                      </span>
                      <span>•</span>
                      <span>{table.capacity || 4}p</span>
                    </div>
                  </div>

                  {activeOrder ? (
                    <div className="mt-1.5 pt-1.5 border-t border-line/40">
                      <p className="text-[11px] font-bold text-fg truncate">
                        {activeOrder.customerName || "Tamu"}
                      </p>
                      <p className="text-xs font-black text-accent-text mt-0.5">
                        Rp {(activeOrder.total || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1.5 pt-1.5 border-t border-line/20">
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1">
                        <span>+</span> Buka Pesanan
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Table Action Bottom Sheet (When clicking occupied or paid table) */}
      {activeSheetTable && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 p-0 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setActiveSheetTable(null)}
        >
          <div
            className="bg-card p-5 rounded-t-3xl w-full max-w-md shadow-2xl relative border-t border-line transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TableShapeIcon shape={activeSheetTable.shape || "square"} size={20} />
                <div>
                  <h3 className="text-base font-black text-fg">
                    {getDisplayName(activeSheetTable)}
                  </h3>
                  <span className="text-[11px] text-muted">
                    {activeSheetTable.zone || "Ruang Utama"} • {activeSheetTable.capacity || 4} Kursi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheetTable(null)}
                className="w-8 h-8 rounded-full bg-line text-muted hover:text-fg flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            {(() => {
              const order = getTableActiveOrder(activeSheetTable.id);
              if (!order) return null;
              const isPaid = order.status === "paid";

              return (
                <div className="space-y-3">
                  <div className="bg-surface rounded-2xl p-3 border border-line text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Pelanggan:</span>
                      <span className="font-bold text-fg">{order.customerName || "Tamu"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Total Tagihan:</span>
                      <span className="font-black text-accent-text">
                        Rp {(order.total || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Status:</span>
                      <span
                        className={`font-bold ${
                          isPaid ? "text-emerald-700" : "text-amber-800"
                        }`}
                      >
                        {isPaid ? "Lunas" : "Belum Bayar (Open Bill)"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onTableAction(activeSheetTable);
                        setActiveSheetTable(null);
                      }}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <LineIcon name="food" />
                      <span>{isPaid ? "Detail Pesanan" : "Bayar / Edit"}</span>
                    </button>

                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClearTable(activeSheetTable.id);
                          setActiveSheetTable(null);
                        }}
                        className="py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <LineIcon name="success" />
                        <span>Lepas Meja</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenNewOrderForTable(activeSheetTable.id.toString());
                          setActiveSheetTable(null);
                        }}
                        className="py-3 bg-surface hover:bg-line border border-line text-fg text-xs font-bold rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <span>+</span>
                        <span>Tambah Menu</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
