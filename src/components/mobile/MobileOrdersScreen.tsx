"use client";
import KitchenOrderStatus from '@/components/KitchenOrderStatus';
import LineIcon from "@/components/LineIcon";

import React, { useState } from "react";

interface MobileOrdersScreenProps {
  allOrders: any[];
  businessType?: string;
  onReprintReceipt: (order: any) => void;
  onOpenSplitBill: (order: any) => void;
  onResumeOrder?: (order: any) => void;
}

export default function MobileOrdersScreen({
  allOrders,
  businessType,
  onReprintReceipt,
  onOpenSplitBill,
  onResumeOrder,
}: MobileOrdersScreenProps) {
  const [search, setSearch] = useState("");

  const filteredOrders = (allOrders || []).filter((o) => {
    if (!o) return false;
    const q = (search || "").toLowerCase();
    const idMatch = o.id?.toString().includes(q);
    const nameMatch = (o.customerName || "").toLowerCase().includes(q);
    const tableMatch = o.tableId?.toString().includes(q);
    return idMatch || nameMatch || tableMatch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Bar & Search */}
      <div className="p-4 pb-2 shrink-0 border-b border-line/40 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-fg flex items-center gap-2">
            <span>Pesanan</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card text-muted border border-line">
              {filteredOrders.length}
            </span>
          </h2>
        </div>

        <div className="relative mb-2">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"><LineIcon name="info" /></span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor nota atau nama pelanggan..."
            className="w-full bg-card border border-line rounded-2xl pl-10 pr-4 py-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* 2. Orders List */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <span className="text-4xl mb-2"><LineIcon name="info" /></span>
            <p className="text-sm font-bold text-fg">Belum Ada Transaksi</p>
            <p className="text-xs text-muted mt-1">Pesanan belum lunas dan transaksi pada shift berjalan muncul di sini.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPaid = order.status === "paid";
            const dateStr = order.createdAt
              ? new Date(order.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";

            return (
              <div
                key={order.id}
                className="bg-card border border-line rounded-2xl p-3.5 shadow-sm space-y-2.5"
              >
                {/* Top Row: Order ID & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-fg">
                      #{order.id}
                    </span>
                    <span className="text-[11px] text-muted">
                      • {dateStr}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-950 border border-amber-300"
                    }`}
                  >
                    {isPaid ? "Lunas" : "Belum Bayar"}
                  </span>
                </div>

                {/* Middle Row: Customer & Items count */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-fg">
                      {order.customerName || (order.tableId ? `Meja ${order.tableId}` : "Tamu")}
                    </span>
                    <span className="text-muted block text-[11px]">
                      {order.items?.length || 0} item • {order.paymentMethod || "Tunai"}
                    </span>
                  </div>
                  <span className="text-sm font-black text-accent-text">
                    Rp {(order.total || 0).toLocaleString("id-ID")}
                  </span>
                </div>

                <KitchenOrderStatus orderId={order.id} businessType={businessType}/>
                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/40">
                  {!isPaid && (
                    <button
                      type="button"
                      onClick={() => onOpenSplitBill(order)}
                      className="px-2.5 py-1.5 rounded-xl bg-surface border border-line text-xs font-bold text-accent-text hover:bg-line active:scale-95 transition-all"
                    >
                      Bayar / Split Bill
                    </button>
                  )}
                  {!isPaid && onResumeOrder && <button type="button" onClick={() => onResumeOrder(order)} className="px-3 py-1.5 border border-line rounded-xl text-xs font-bold">Lanjutkan Pesanan</button>}
                  <button
                    type="button"
                    onClick={() => onReprintReceipt(order)}
                    className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span><LineIcon name="printer" /></span>
                    <span>Cetak Ulang</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
