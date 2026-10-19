"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState } from "react";

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
  const [activeSheetTable, setActiveSheetTable] = useState<any | null>(null);

  const getTableActiveOrder = (tableId: number | string) => {
    const numId = Number(tableId);
    const strId = String(tableId);
    return (activeOrders || []).find(
      (o) => o && (Number(o.tableId) === numId || String(o.tableId) === strId) && (o.status === "unpaid" || o.status === "paid")
    );
  };

  const filteredTables = (tableData || []).filter((table) => {
    if (!table || table.id == null) return false;
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Bar & Status Chips */}
      <div className="p-4 pb-2 shrink-0 border-b border-line/40 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-fg flex items-center gap-2">
            <span>Denah & Status Meja</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card text-muted border border-line">
              {tableData.length} Meja
            </span>
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {(["semua", "kosong", "terisi", "lunas"] as const).map((status) => {
            const labelMap = {
              semua: "Semua Meja",
              kosong: "Kosong",
              terisi: "Terisi",
              lunas: "Lunas / Lepas",
            };
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "bg-card border border-line text-muted hover:text-fg"
                }`}
              >
                {labelMap[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tables Grid (2-column on mobile, 3-column on tablet) */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <span className="text-4xl mb-2"><LineIcon name="info" /></span>
            <p className="text-sm font-bold text-fg">Tidak Ada Meja</p>
            <p className="text-xs text-muted mt-1">Tidak ada meja dengan status filter ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredTables.map((table) => {
              const activeOrder = getTableActiveOrder(table.id);
              const isPaid = activeOrder && activeOrder.status === "paid";
              const isOccupied = activeOrder && activeOrder.status === "unpaid";
              const isSelected = selectedTable === table.id.toString();

              let statusLabel = "Kosong";
              let badgeColor = "bg-line text-muted";
              let cardBorder = "border-line bg-card";

              if (isPaid) {
                statusLabel = "Lunas";
                badgeColor = "bg-emerald-50 text-emerald-800 border border-emerald-200";
                cardBorder = "border-emerald-300 bg-card";
              } else if (isOccupied) {
                statusLabel = "Terisi";
                badgeColor = "bg-amber-50 text-amber-950 border border-amber-300";
                cardBorder = "border-amber-400 bg-card";
              }

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleCardClick(table)}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between text-left transition-all active:scale-95 relative shadow-sm ${cardBorder} ${
                    isSelected ? "ring-2 ring-accent" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-black text-fg">{table.nomorMeja || table.namaMeja || `Meja ${table.id}`}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {activeOrder ? (
                    <div className="mt-1 pt-1.5 border-t border-line/40">
                      <p className="text-[11px] font-bold text-fg truncate">
                        {activeOrder.customerName || "Tamu"}
                      </p>
                      <p className="text-xs font-black text-accent-text mt-0.5">
                        Rp {(activeOrder.total || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1 pt-1.5 border-t border-line/20">
                      <span className="text-[11px] text-muted flex items-center gap-1">
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
              <div>
                <h3 className="text-base font-black text-fg">
                  {activeSheetTable.nomorMeja || activeSheetTable.namaMeja || `Meja ${activeSheetTable.id}`}
                </h3>
                <span className="text-xs text-muted">Aksi Pesanan Meja</span>
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
                      <span className="font-black text-accent-text">Rp {(order.total || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Status:</span>
                      <span className={`font-bold ${isPaid ? "text-emerald-700" : "text-amber-950"}`}>
                        {isPaid ? "Lunas" : "Belum Bayar"}
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
                      <span><LineIcon name="food" /></span>
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
                        <span><LineIcon name="success" /></span>
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
