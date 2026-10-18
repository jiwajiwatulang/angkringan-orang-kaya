"use client";
import LineIcon from "@/components/LineIcon";

import React, { useRef } from "react";

interface MenuItem {
  id: number;
  nama: string;
  harga: number;
  kategori: string;
  isGroup?: boolean;
  variants?: MenuItem[];
  isSoldOut?: boolean;
  modifiers?: any[];
}

interface CartItem extends MenuItem {
  qty: number;
  selectedModifiers?: { groupName: string; optionName: string; harga: number }[];
  itemKey?: string;
}

interface MobileCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (item: CartItem, delta: number) => void;
  onRemoveItem: (item: CartItem) => void;
  onClearCart: () => void;
  orderType: string;
  onSetOrderType: (type: string) => void;
  selectedTable: string;
  onSetSelectedTable: (table: string) => void;
  customerName: string;
  onSetCustomerName: (name: string) => void;
  notes: string;
  onSetNotes: (notes: string) => void;
  tableData: any[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalPrice: number;
  onOpenDiscountModal: () => void;
  onOpenPaymentModal: () => void;
  onSaveToTable: () => void;
}

export default function MobileCartSheet({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  orderType,
  onSetOrderType,
  selectedTable,
  onSetSelectedTable,
  customerName,
  onSetCustomerName,
  notes,
  onSetNotes,
  tableData,
  subtotal,
  taxAmount,
  discountAmount,
  totalPrice,
  onOpenDiscountModal,
  onOpenPaymentModal,
  onSaveToTable,
}: MobileCartSheetProps) {
  const [dragY, setDragY] = React.useState(0);
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.touches[0].clientY - touchStartRef.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (dragY > 70) {
      onClose();
    }
    setDragY(0);
    touchStartRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 p-0 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[92vh] border-t border-line transition-transform ease-out"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          touchAction: "pan-y",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div
          className="flex flex-col items-center justify-center pt-2 pb-1 cursor-pointer select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
        >
          <div className="w-12 h-1.5 bg-slate-600 rounded-full mb-1"></div>
          <span className="text-[10px] text-muted font-bold">Tarik ke bawah untuk tutup</span>
        </div>

        {/* Header */}
        <div
          className="px-5 py-2.5 border-b border-line/40 flex items-center justify-between"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-fg">Keranjang Pesanan</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface text-accent-text border border-line">
              {cart.reduce((s, i) => s + i.qty, 0)} Item
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-[11px] font-bold text-rose-400 hover:underline px-2 py-1"
              >
                Hapus Semua
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-line text-muted hover:text-fg flex items-center justify-center text-xs font-bold active:scale-90"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Order Details & Meta */}
        <div className="px-5 py-3 border-b border-line/40 bg-surface/40 space-y-2.5">
          {/* Order Type Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {["Dine-in", "Takeaway"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onSetOrderType(type)}
                className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                  orderType === type
                    ? "bg-accent text-white shadow-sm"
                    : "bg-card border border-line text-muted"
                }`}
              >
                {type === "Dine-in" ? " Dine-in (Di Tempat)" : " Takeaway (Bungkus)"}
              </button>
            ))}
          </div>

          {/* Table Selector (if Dine-in) & Customer Name */}
          <div className="grid grid-cols-2 gap-2">
            {orderType === "Dine-in" ? (
              <select
                value={selectedTable}
                onChange={(e) => onSetSelectedTable(e.target.value)}
                className="bg-card border border-line rounded-xl px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:border-accent"
              >
                <option value="">-- Pilih Meja --</option>
                {tableData.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.nomorMeja || t.namaMeja || `Meja ${t.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-card/50 border border-line/40 rounded-xl px-2.5 py-1.5 text-xs text-muted flex items-center"> Pesanan Dibungkus
              </div>
            )}

            <input
              type="text"
              value={customerName}
              onChange={(e) => onSetCustomerName(e.target.value)}
              placeholder="Nama Pelanggan (opsional)"
              className="bg-card border border-line rounded-xl px-2.5 py-1.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
              <span className="text-4xl mb-2"><LineIcon name="info" /></span>
              <p className="text-sm font-bold text-fg">Keranjang Kosong</p>
              <p className="text-xs text-muted mt-1">Pilih menu dari katalog untuk menambahkan ke keranjang.</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const modifierTotal =
                item.selectedModifiers?.reduce((acc, m) => acc + (m.harga || 0), 0) || 0;
              const unitTotal = item.harga + modifierTotal;
              const itemTotal = unitTotal * item.qty;

              return (
                <div
                  key={item.itemKey || `${item.id}-${idx}`}
                  className="bg-surface/80 border border-line rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-fg truncate">
                      {item.nama}
                    </h4>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="text-[10px] text-muted space-x-1 mt-0.5">
                        {item.selectedModifiers.map((m, mIdx) => (
                          <span key={mIdx} className="inline-block bg-line/60 px-1.5 py-0.2 rounded text-slate-300">
                            +{m.optionName} {m.harga > 0 ? `(Rp ${m.harga.toLocaleString("id-ID")})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs font-black text-accent-text mt-1 block">
                      Rp {itemTotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item, -1)}
                      className="w-7 h-7 rounded-lg bg-card border border-line text-fg font-black text-xs flex items-center justify-center active:scale-90"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-fg w-5 text-center">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item, 1)}
                      className="w-7 h-7 rounded-lg bg-accent text-white font-black text-xs flex items-center justify-center active:scale-90 shadow-sm"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item)}
                      className="w-7 h-7 rounded-lg bg-card border border-line text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center active:scale-90 ml-1"
                      title="Hapus Menu"
                    ><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout Button */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-line bg-surface/90 space-y-3 shrink-0">
            {/* Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal:</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-accent-text font-bold">
                  <span>Diskon:</span>
                  <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Pajak:</span>
                  <span>+Rp {taxAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-line/40 text-sm font-black text-fg">
                <span>Total Tagihan:</span>
                <span className="text-base text-accent-text">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenDiscountModal}
                className="py-2.5 rounded-xl bg-card border border-line text-xs font-bold text-fg hover:border-slate-500 active:scale-95 transition-all text-center flex items-center justify-center gap-1"
              >
                <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14v14H5zM9 9h6M9 13h6M9 17h3" /></svg></span>
                <span>{discountAmount > 0 ? "Ubah Diskon" : "Tambah Diskon"}</span>
              </button>

              {orderType === "Dine-in" && selectedTable ? (
                <button
                  type="button"
                  onClick={onSaveToTable}
                  className="py-2.5 rounded-xl bg-surface border border-line text-xs font-bold text-accent-text hover:bg-line active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                >
                  <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h16v-6M12 3v12M7 10l5 5 5-5" /></svg></span>
                  <span>Simpan ke Meja</span>
                </button>
              ) : (
                <div className="text-[11px] text-muted flex items-center justify-center">
                  {orderType === "Dine-in" ? "Pilih meja untuk simpan" : "Siap dibayar"}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenPaymentModal}
              className="w-full py-3.5 bg-accent hover:bg-accent-hover active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl shadow-accent/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Bayar Sekarang</span>
              <span>•</span>
              <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
