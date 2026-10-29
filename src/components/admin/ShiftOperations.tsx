"use client";
import LoadingState from "@/components/LoadingState";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect, useMemo } from "react";
import { useAdmin } from "@/app/admin/AdminContext";
import {
  getOrders,
  getAllShifts,
  getActiveShift,
  getShiftLiveStats,
  closeShiftByOwner,
  addCashMovement,
  deleteCashMovement,
} from "@/lib/api";
import { paymentEntries } from "@/lib/multidevice/posDashboard";
import { db, ExpenseCategory } from "@/lib/dexie";
import {
  generateZReportReceipt,
  generateZReportHtml,
  executePrintDocument,
} from "@/lib/receipt";

interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  badgeClass: string;
}

const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { id: "bahan_baku", label: "Bahan Baku & Dapur", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" },
  { id: "perlengkapan", label: "Perlengkapan & Kemasan", badgeClass: "bg-blue-100 text-blue-900 border-blue-300" },
  { id: "operasional", label: "Operasional & Utilitas", badgeClass: "bg-purple-100 text-purple-900 border-purple-300" },
  { id: "gaji_harian", label: "Gaji / Upah Harian", badgeClass: "bg-teal-100 text-teal-900 border-teal-300" },
  { id: "lainnya", label: "Lain-lain", badgeClass: "bg-slate-100 text-slate-800 border-slate-300" },
];

const QUICK_EXPENSE_SUGGESTIONS: { label: string; category: ExpenseCategory; text: string }[] = [
  { label: "Es Batu", category: "operasional", text: "Beli Es Batu" },
  { label: "Gas LPG", category: "perlengkapan", text: "Beli Gas LPG" },
  { label: "Plastik / Box", category: "perlengkapan", text: "Beli Kantong Plastik / Dus Box" },
  { label: "Air Galon", category: "operasional", text: "Beli Air Galon" },
  { label: "Parkir & Kebersihan", category: "operasional", text: "Iuran Parkir & Kebersihan" },
  { label: "Belanja Pasar", category: "bahan_baku", text: "Belanja Pasar / Bahan Baku Dapur" },
  { label: "Upah Harian", category: "gaji_harian", text: "Upah / Gaji Harian Karyawan" },
  { label: "Bensin & Kurir", category: "operasional", text: "Bensin Operasional / Kurir" },
];

export default function ShiftOperations({activeTab}:{activeTab:"shifts"|"movements"}) {
  const { storeSettings, showToast } = useAdmin();
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [activeShiftStats, setActiveShiftStats] = useState<any>(null);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [totalOmzet, setTotalOmzet] = useState<number>(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Tab: 'shifts' or 'movements'

  // Filter & Search states for Cash Movements
  const [filterType, setFilterType] = useState<"all" | "in" | "out">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal State for adding Cash Movement
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"out" | "in">("out");
  const [modalAmount, setModalAmount] = useState("");
  const [modalCategory, setModalCategory] = useState<ExpenseCategory>("operasional");
  const [modalSource, setModalSource] = useState<"laci" | "rekening">("laci");
  const [modalReason, setModalReason] = useState("");
  const [modalOperator, setModalOperator] = useState("Admin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Owner Close Shift Modal states
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingShiftTarget, setClosingShiftTarget] = useState<any | null>(null);
  const [closingShiftStats, setClosingShiftStats] = useState<any | null>(null);
  const [actualCashInput, setActualCashInput] = useState("");
  const [closureReason, setClosureReason] = useState("Tutup shift harian oleh pemilik");
  const [closedByOperator, setClosedByOperator] = useState("Pemilik");
  const [closureNotes, setClosureNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [unpaidOrdersCount, setUnpaidOrdersCount] = useState(0);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [closedSuccessResult, setClosedSuccessResult] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const [allShifts, currentShift, movements, paidOrders] = await Promise.all([
        getAllShifts(),
        getActiveShift(),
        db.table("cashMovements").reverse().toArray(),
        getOrders(),
      ]);

      setShifts(allShifts);
      setActiveShift(currentShift);
      setCashMovements(movements);

      // Hitung akumulasi omzet dari nota berbayar
      const entries = paymentEntries(paidOrders);
      const sumOmzet = entries.reduce((sum, e) => sum + e.amount - e.refund, 0);
      setTotalOmzet(sumOmzet);
      setPaidOrdersCount(new Set(entries.filter(e=>e.amount>0).map(e=>e.orderId)).size);

      if (currentShift && currentShift.id) {
        const stats = await getShiftLiveStats(currentShift.id);
        setActiveShiftStats(stats);
      }
    } catch (e) {
      console.error("Error loading shift data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrintZReport = async (shift: any) => {
    try {
      const escposText = generateZReportReceipt(shift, storeSettings);
      const htmlContent = generateZReportHtml(shift, storeSettings);
      const result = await executePrintDocument({
        title: `Z_Report_Shift_${shift.id}`,
        escposText,
        htmlContent,
        settings: storeSettings,
      });
      if (result.success) {
        showToast(result.message, "success");
      }
    } catch (e: any) {
      alert("Gagal mencetak Z-Report: " + (e.message || e));
    }
  };

  const openOwnerCloseModal = async (shift: any, knownStats?: any) => {
    try {
      const stats = knownStats || (await getShiftLiveStats(shift.id));
      const unpaid = await db.table("orders").where("status").equals("unpaid").count();
      let pending = 0;
      if (db.tables.some((t) => t.name === "posOutbox")) {
        pending = await db.table("posOutbox").count();
      }
      setClosingShiftTarget(shift);
      setClosingShiftStats(stats);
      setActualCashInput("");
      setClosureReason("Tutup shift harian oleh pemilik");
      setClosedByOperator("Pemilik");
      setClosureNotes("");
      setIsConfirmed(false);
      setUnpaidOrdersCount(unpaid);
      setPendingOutboxCount(pending);
      setClosedSuccessResult(null);
      setIsCloseModalOpen(true);
    } catch (err: any) {
      showToast("Gagal memuat data shift: " + (err.message || err), "error");
    }
  };

  const handleOwnerCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingShiftTarget) return;
    const physical = Number(actualCashInput);
    if (!Number.isFinite(physical) || physical < 0) {
      showToast("Jumlah uang fisik tidak valid.", "error");
      return;
    }
    if (!closureReason.trim()) {
      showToast("Alasan penutupan shift wajib diisi.", "error");
      return;
    }
    if (!isConfirmed) {
      showToast("Harap konfirmasi penutupan shift terlebih dahulu.", "error");
      return;
    }

    setIsSubmittingClose(true);
    try {
      const closed = await closeShiftByOwner(closingShiftTarget.id, {
        actualCash: physical,
        closureReason: closureReason.trim(),
        closedByOperator: closedByOperator.trim() || "Pemilik",
        notes: closureNotes.trim(),
      });
      setClosedSuccessResult(closed);
      showToast(`Shift #${closingShiftTarget.id} berhasil ditutup aman oleh pemilik.`, "success");
      await loadData();
    } catch (err: any) {
      showToast("Gagal menutup shift: " + (err.message || err), "error");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Financial aggregates
  const financialSummary = useMemo(() => {
    const totalCashIn = cashMovements
      .filter((m) => m.type === "in")
      .reduce((sum, m) => sum + (m.amount || 0), 0);

    const totalCashOut = cashMovements
      .filter((m) => m.type === "out")
      .reduce((sum, m) => sum + (m.amount || 0), 0);

    const categoryBreakdown: Record<string, number> = {
      bahan_baku: 0,
      perlengkapan: 0,
      operasional: 0,
      gaji_harian: 0,
      lainnya: 0,
    };

    cashMovements.forEach((m) => {
      if (m.type === "out" && m.category !== "kasbon_karyawan") {
        const cat = m.category || "operasional";
        if (categoryBreakdown[cat] !== undefined) {
          categoryBreakdown[cat] += m.amount || 0;
        } else {
          categoryBreakdown.lainnya += m.amount || 0;
        }
      }
    });

    const expenses = cashMovements.filter(m => m.type === 'out' && m.category !== 'kasbon_karyawan').reduce((n,m) => n + (m.amount || 0), 0);
    const netProfit = totalOmzet - expenses;

    return {
      totalCashIn,
      totalCashOut,
      expenses,
      netProfit,
      categoryBreakdown,
    };
  }, [cashMovements, totalOmzet]);

  // Filtered Cash Movements
  const filteredMovements = useMemo(() => {
    return cashMovements.filter((m) => {
      if (filterType !== "all" && m.type !== filterType) return false;
      if (filterCategory !== "all") {
        const cat = m.category || (m.type === "out" ? "operasional" : "lainnya");
        if (cat !== filterCategory) return false;
      }
      return true;
    });
  }, [cashMovements, filterType, filterCategory]);

  const handleOpenModal = (type: "out" | "in" = "out") => {
    setModalType(type);
    setModalAmount("");
    setModalCategory("operasional");
    setModalSource("laci");
    setModalReason("");
    setModalOperator(activeShift?.operatorName || "Admin");
    setIsModalOpen(true);
  };

  const handleApplyQuickSuggestion = (item: { label: string; category: ExpenseCategory; text: string }) => {
    setModalType("out");
    setModalCategory(item.category);
    setModalReason(item.text);
  };

  const handleAddAmount = (addVal: number) => {
    const current = Number(modalAmount) || 0;
    setModalAmount(String(current + addVal));
  };

  const handleSubmitCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(modalAmount);
    if (!amt || amt <= 0) {
      alert("Nominal uang harus lebih dari Rp 0!");
      return;
    }
    if (!modalReason.trim()) {
      alert("Keterangan / keperluan wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCashMovement({
        shiftId: activeShift?.id || undefined,
        type: modalType,
        amount: amt,
        category: modalType === "out" ? modalCategory : undefined,
        paymentSource: modalSource,
        reason: modalReason.trim(),
        operatorName: modalOperator.trim() || "Admin",
      });

      showToast(
        modalType === "out"
          ? "Biaya operasional berhasil dicatat!"
          : "Kas masuk berhasil ditambahkan!",
        "success"
      );
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert("Gagal mencatat arus kas: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCashMovement(deleteTarget.id);
      showToast("Catatan kas berhasil dihapus.", "success");
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus catatan kas: " + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Active Shift Card (If currently running) */}
      {activeShift && activeShiftStats && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-2 border-accent/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              <h3 className="font-black text-sm text-accent-text">
                Shift Sedang Aktif di Kasir
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent text-white">
              Shift #{activeShift.id}
            </span>
            <button
              type="button"
              onClick={() => openOwnerCloseModal(activeShift, activeShiftStats)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <LineIcon name="clock" className="w-4 h-4" />
              <span>Akhiri Shift</span>
            </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-surface/80 border border-accent/30">
              <span className="text-[10px] text-muted font-bold block">Operator:</span>
              <span className="font-bold text-fg text-sm">{activeShift.operatorName}</span>
            </div>
            <div className="p-3 rounded-2xl bg-surface/80 border border-accent/30">
              <span className="text-[10px] text-muted font-bold block">Modal Awal Laci:</span>
              <span className="font-bold text-fg text-sm">
                Rp {(activeShift.startingCash || 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-surface/80 border border-accent/30">
              <span className="text-[10px] text-muted font-bold block">Penjualan Tunai:</span>
              <span className="font-bold text-accent-text text-sm">
                Rp {(activeShiftStats.cashSales || 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-surface/80 border border-accent/30">
              <span className="text-[10px] text-muted font-bold block">Estimasi Fisik Laci:</span>
              <span className="font-black text-accent-text text-sm">
                Rp {(activeShiftStats.expectedCash || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Hitung uang fisik di laci kas, lalu gunakan tombol Akhiri Shift untuk menutup shift secara aman.
          </p>
        </div>
      )}

      {/* Main Tab Content */}
      {isLoading ? (
        <LoadingState label="Memuat shift dan kas"/>
      ) : activeTab === "shifts" ? (
        shifts.length === 0 ? (
          <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
            <div className="w-12 h-12 mx-auto mb-2 text-muted flex items-center justify-center">
              <LineIcon name="info" className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-fg">Belum ada riwayat shift</h3>
            <p className="text-xs text-muted mt-1">Shift kasir akan tercatat secara otomatis setelah kasir ditutup.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const isOpen = shift.status === "open";
              const diff = shift.cashDifference !== undefined ? shift.cashDifference : shift.difference || 0;
              const isMatch = diff === 0;
              const isOver = diff > 0;

              const startDate = new Date(shift.startTime).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              const endDate = shift.endTime
                ? new Date(shift.endTime).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Sedang Berlangsung";

              return (
                <div
                  key={shift.id}
                  className="p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-4 hover:border-accent/40 transition-all"
                >
                  {/* Shift Top Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-fg">Shift #{shift.id}</span>
                        <span className="text-xs font-bold text-muted">
                          • Kasir: <strong className="text-fg">{shift.operatorName}</strong>
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-card text-muted border border-line"
                          }`}
                        >
                          {isOpen ? "AKTIF" : "DITUTUP"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted block mt-0.5">
                        {startDate} → {endDate}
                      </span>
                    </div>

                    {!isOpen && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl ${
                            isMatch
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : isOver
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-rose-100 text-rose-900 border border-rose-200"
                          }`}
                        >
                          {isMatch
                            ? "PAS / COCOK"
                            : isOver
                            ? `+Rp ${diff.toLocaleString("id-ID")} (LEBIH)`
                            : `-Rp ${Math.abs(diff).toLocaleString("id-ID")} (KURANG)`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePrintZReport(shift)}
                          className="px-3 py-1.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <LineIcon name="printer" className="w-4 h-4" />
                          <span>Cetak Z-Report</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-card/40">
                      <span className="text-[10px] text-muted block font-semibold">Modal Awal</span>
                      <span className="font-bold text-fg">
                        Rp {(shift.startingCash || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-card/40">
                      <span className="text-[10px] text-muted block font-semibold">Penjualan Tunai</span>
                      <span className="font-bold text-accent-text">
                        Rp {(shift.cashSales || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-card/40">
                      <span className="text-[10px] text-muted block font-semibold">Non-Tunai (QRIS)</span>
                      <span className="font-bold text-accent-text">
                        Rp {(shift.nonCashSales || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-card/40">
                      <span className="text-[10px] text-muted block font-semibold">Kas Masuk / Keluar</span>
                      <span className="font-bold text-fg">
                        +{(shift.cashIn || 0).toLocaleString("id-ID")} / -{(shift.cashOut || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-card/40">
                      <span className="text-[10px] text-muted block font-semibold">Estimasi Sistem</span>
                      <span className="font-black text-fg">
                        Rp {(shift.expectedCash || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-card/40">
                      <span className="text-[10px] text-muted block font-semibold">Uang Fisik Kasir</span>
                      <span className="font-black text-accent-text">
                        {shift.actualCash !== undefined ? `Rp ${shift.actualCash.toLocaleString("id-ID")}` : "-"}
                      </span>
                    </div>
                  </div>

                  {shift.notes && (
                    <div className="text-[11px] text-muted bg-card/50 p-2.5 rounded-xl">
                      <span className="font-bold">Catatan Kasir:</span> {shift.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Cash Movements & Expenses Tab */
        <div className="space-y-6">
          {/* Financial Summary Card (Omzet, Biaya, Estimasi Laba Bersih) */}
          <div className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
              <div>
                <h3 className="text-lg font-black text-fg flex items-center gap-2">
                  <LineIcon name="chart" className="w-5 h-5 text-accent" />
                  <span>Ringkasan Kas Usaha</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Pembayaran setelah pengembalian, dikurangi biaya tercatat.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenModal("in")}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <LineIcon name="add" className="w-4 h-4" />
                  <span>+ Kas Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenModal("out")}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <LineIcon name="tax" className="w-4 h-4 text-white" />
                  <span>+ Catat Biaya Operasional</span>
                </button>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Omzet Penjualan */}
              <div className="p-4 rounded-2xl bg-card/60 border border-line">
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span className="font-bold">Pembayaran Bersih</span>
                  <span className="text-[10px] font-semibold bg-surface px-2 py-0.5 rounded-full border border-line">
                    {paidOrdersCount} Nota
                  </span>
                </div>
                <div className="text-2xl font-black text-fg tracking-tight">
                  Rp {totalOmzet.toLocaleString("id-ID")}
                </div>
                <p className="text-[10px] text-muted mt-1">Akumulasi seluruh transaksi berhasil</p>
              </div>

              {/* Total Pengeluaran Biaya */}
              <div className="p-4 rounded-2xl bg-card/60 border border-line">
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span className="font-bold text-rose-700">Biaya Tercatat</span>
                  <span className="text-[10px] font-semibold bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                    Pengeluaran
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-700 tracking-tight">
                  Rp {financialSummary.expenses.toLocaleString("id-ID")}
                </div>
                <p className="text-[10px] text-muted mt-1">Bahan baku, utilitas, kemasan & operasional</p>
              </div>

              {/* Estimasi Laba Bersih Operasional */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/40">
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span className="font-black text-emerald-800">Sisa Setelah Biaya</span>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                    Bersih
                  </span>
                </div>
                <div className={`text-2xl font-black tracking-tight ${financialSummary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  Rp {financialSummary.netProfit.toLocaleString("id-ID")}
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {financialSummary.netProfit >= 0 ? "Belum termasuk modal barang yang terjual" : "Pengeluaran melebihi pembayaran bersih"}
                </p>
              </div>
            </div>

            {/* Breakdown Biaya per Kategori */}
            <div className="pt-2 border-t border-line space-y-2">
              <span className="text-xs font-bold text-fg block">
                Rincian Alokasi Biaya Pengeluaran:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const spent = financialSummary.categoryBreakdown[cat.id] || 0;
                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl bg-card/40 border border-line space-y-1"
                    >
                      <span className="text-[10px] font-bold text-muted block truncate" title={cat.label}>
                        {cat.label}
                      </span>
                      <span className="font-black text-fg text-sm block">
                        Rp {spent.toLocaleString("id-ID")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-line">
            {/* Filter Type */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <span className="text-muted font-bold mr-1 shrink-0">Arus:</span>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === "all"
                    ? "bg-fg text-surface"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Semua ({cashMovements.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("out")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === "out"
                    ? "bg-rose-600 text-white"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Biaya Keluar (-)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("in")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterType === "in"
                    ? "bg-emerald-600 text-white"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Kas Masuk (+)
              </button>
            </div>

            {/* Filter Category */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted font-bold shrink-0">Kategori:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-card border border-line text-fg font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-accent"
              >
                <option value="all">Semua Kategori</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cash Movement List */}
          {filteredMovements.length === 0 ? (
            <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
              <div className="w-12 h-12 mx-auto mb-2 text-muted flex items-center justify-center">
                <LineIcon name="tax" className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-fg">Tidak ada catatan kas yang cocok</h3>
              <p className="text-xs text-muted mt-1">
                Catat kas masuk atau biaya operasional untuk mengontrol pembukuan toko Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMovements.map((m) => {
                const isOut = m.type === "out";
                const catInfo = EXPENSE_CATEGORIES.find((c) => c.id === m.category);

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-accent/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isOut
                            ? "bg-rose-100 text-rose-900 border border-rose-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {isOut ? "OUT" : "IN"}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-fg text-sm">
                            {m.reason || (isOut ? "Kas Keluar" : "Kas Masuk")}
                          </span>
                          {isOut && catInfo && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catInfo.badgeClass}`}>
                              {catInfo.label}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-card text-muted border border-line">
                            {m.paymentSource === "rekening" ? "Rekening Toko" : "Kas Laci"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block">
                          Dicatat oleh: <strong className="text-fg">{m.operatorName || "Kasir"}</strong> •{" "}
                          {new Date(m.timestamp).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                      <div className="text-right">
                        <span
                          className={`text-base font-black ${
                            isOut ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          {isOut ? "-" : "+"}Rp {(m.amount || 0).toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-muted block">
                          {isOut ? "Biaya Operasional" : "Kas Masuk"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                        title="Hapus catatan ini"
                      >
                        <LineIcon name="delete" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tambah Kas Masuk / Kas Keluar */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            className="bg-surface rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-line space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-lg font-black text-fg">
                  {modalType === "out" ? "Catat Biaya Operasional (Kas Keluar)" : "Catat Penambahan Kas Masuk"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {modalType === "out"
                    ? "Catat pengeluaran belanja harian, bahan baku, perlengkapan, atau utilitas toko."
                    : "Catat penambahan modal kerja atau penerimaan kas non-penjualan."}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-fg text-lg font-bold p-1"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSubmitCashMovement} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex p-1 rounded-2xl bg-card border border-line text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalType("out")}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    modalType === "out"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Kas Keluar (Biaya Toko)
                </button>
                <button
                  type="button"
                  onClick={() => setModalType("in")}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    modalType === "in"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Kas Masuk (Penambahan)
                </button>
              </div>

              {/* Quick suggestions for common expenses */}
              {modalType === "out" && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted block">
                    Pilihan Cepat Pengeluaran:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_EXPENSE_SUGGESTIONS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyQuickSuggestion(item)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          modalReason === item.text
                            ? "bg-accent text-white border-accent"
                            : "bg-card text-muted hover:text-fg border-line hover:border-accent"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nominal Amount */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Nominal Uang (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-muted text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl pl-11 pr-4 py-3 text-lg font-black text-fg outline-none focus:border-accent"
                    required
                    autoFocus
                  />
                </div>
                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10000, 20000, 50000, 100000, 250000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAddAmount(val)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-card hover:bg-line text-muted hover:text-fg border border-line transition-colors"
                    >
                      +{val >= 1000 ? `${val / 1000}rb` : val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModalAmount("")}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-card hover:bg-rose-50 text-rose-600 border border-line transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Kategori Pengeluaran (if Kas Keluar) */}
              {modalType === "out" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-fg">
                    Kategori Pengeluaran:
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-card border border-line rounded-xl p-2.5 text-xs font-bold text-fg outline-none focus:border-accent"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sumber Dana */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Sumber Dana / Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalSource("laci")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      modalSource === "laci"
                        ? "bg-accent/10 border-accent text-accent-text"
                        : "bg-card border-line text-muted hover:text-fg"
                    }`}
                  >
                    <span className="block font-black">Kas Fisik Laci</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Memotong uang fisik di laci kasir saat ini
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSource("rekening")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      modalSource === "rekening"
                        ? "bg-accent/10 border-accent text-accent-text"
                        : "bg-card border-line text-muted hover:text-fg"
                    }`}
                  >
                    <span className="block font-black">Rekening / Modal Toko</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Transfer bank / kas luar (tanpa potong laci kasir)
                    </span>
                  </button>
                </div>
              </div>

              {/* Alasan / Keperluan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Keterangan / Keperluan:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Beli es batu 2 sak, bayar uang sampah, beli minyak goreng"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-2.5 text-xs text-fg outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Operator */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Dicatat Oleh:
                </label>
                <input
                  type="text"
                  value={modalOperator}
                  onChange={(e) => setModalOperator(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl p-2.5 text-xs text-fg outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
                    modalType === "out"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pencatatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Catatan */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LineIcon name="delete" className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-fg">Hapus Catatan Kas?</h4>
              <p className="text-xs text-muted">
                Catatan <strong>&ldquo;{deleteTarget.reason}&rdquo;</strong> sebesar Rp{" "}
                {(deleteTarget.amount || 0).toLocaleString("id-ID")} akan dihapus dari buku kas.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Akhiri Shift oleh Pemilik */}
      {isCloseModalOpen && closingShiftTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => !isSubmittingClose && setIsCloseModalOpen(false)}
        >
          <div
            className="bg-surface rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-line space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {closedSuccessResult ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <LineIcon name="check" className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-fg">
                    Shift #{closedSuccessResult.id} Berhasil Ditutup
                  </h4>
                  <p className="text-xs text-muted mt-1">
                    Rekonsiliasi kas dan audit penutupan shift telah tersimpan aman di sistem.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card/60 border border-line text-xs space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted">Kasir Bertugas:</span>
                    <span className="font-bold text-fg">{closedSuccessResult.operatorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Ditutup Oleh:</span>
                    <span className="font-bold text-fg">{closedSuccessResult.closedByOperator} (Pemilik)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Alasan Penutupan:</span>
                    <span className="font-bold text-fg">{closedSuccessResult.closureReason}</span>
                  </div>
                  <div className="flex justify-between border-t border-line/60 pt-2">
                    <span className="text-muted">Uang Fisik Dihitung:</span>
                    <span className="font-bold text-fg">Rp {(closedSuccessResult.actualCash || 0).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Status Selisih:</span>
                    <span className="font-black text-fg">
                      {closedSuccessResult.cashDifference === 0
                        ? "PAS / COCOK (Rp 0)"
                        : closedSuccessResult.cashDifference > 0
                        ? `+Rp ${closedSuccessResult.cashDifference.toLocaleString("id-ID")} (LEBIH)`
                        : `-Rp ${Math.abs(closedSuccessResult.cashDifference).toLocaleString("id-ID")} (KURANG)`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePrintZReport(closedSuccessResult)}
                    className="flex-1 py-2.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LineIcon name="printer" className="w-4 h-4" />
                    <span>Cetak Z-Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOwnerCloseSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div>
                    <h4 className="text-base font-black text-fg">Akhiri Shift Kasir</h4>
                    <p className="text-xs text-muted">
                      Shift #{closingShiftTarget.id} • Kasir: <strong className="text-fg">{closingShiftTarget.operatorName}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    disabled={isSubmittingClose}
                    className="w-8 h-8 rounded-full bg-card hover:bg-line text-muted flex items-center justify-center text-xs"
                  >
                    X
                  </button>
                </div>

                {/* Ringkasan Estimasi Kas Sistem */}
                {closingShiftStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs p-3 rounded-2xl bg-card/50 border border-line">
                    <div>
                      <span className="text-[10px] text-muted block">Modal Awal:</span>
                      <span className="font-bold text-fg">Rp {(closingShiftStats.startingCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block">Penjualan Tunai:</span>
                      <span className="font-bold text-accent-text">+Rp {(closingShiftStats.cashSales || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block">Estimasi Kas Fisik:</span>
                      <span className="font-black text-fg">Rp {(closingShiftStats.expectedCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                )}

                {/* Notifikasi Transaksi Tertunda / Belum Lunas */}
                {unpaidOrdersCount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                    <LineIcon name="info" className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <span className="font-bold block">Ada {unpaidOrdersCount} transaksi belum lunas di kasir/meja.</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Transaksi belum lunas tidak akan hilang atau terhapus. Transaksi tetap tersimpan aman dan dapat diselesaikan pada shift berikutnya.
                      </p>
                    </div>
                  </div>
                )}

                {/* Notifikasi Antrean Offline Perangkat */}
                {pendingOutboxCount > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2">
                    <LineIcon name="refresh" className="w-5 h-5 flex-shrink-0 text-blue-700 mt-0.5" />
                    <div>
                      <span className="font-bold block">Ada {pendingOutboxCount} data antrean pengiriman lokal.</span>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Penutupan shift akan disimpan di laci lokal dan disinkronkan saat jaringan terhubung.
                      </p>
                    </div>
                  </div>
                )}

                {/* Input Uang Fisik & Selisih */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-fg">
                      Uang Fisik di Laci Kas (Rp) <span className="text-rose-500">*</span>
                    </label>
                    {closingShiftStats && (
                      <button
                        type="button"
                        onClick={() => setActualCashInput(String(closingShiftStats.expectedCash || 0))}
                        className="text-[11px] font-bold text-accent hover:underline"
                      >
                        Sesuai Estimasi
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    placeholder="Contoh: 350000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-card text-fg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {actualCashInput.trim() !== "" && closingShiftStats && (() => {
                    const diff = (Number(actualCashInput) || 0) - closingShiftStats.expectedCash;
                    return (
                      <div className="pt-1">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg inline-block ${
                            diff === 0
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : diff > 0
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {diff === 0
                            ? "PAS / COCOK (Rp 0)"
                            : diff > 0
                            ? `+Rp ${diff.toLocaleString("id-ID")} (LEBIH)`
                            : `-Rp ${Math.abs(diff).toLocaleString("id-ID")} (KURANG)`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Input Identitas Penutup & Alasan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-fg">Ditutup Oleh (Otorisator)</label>
                    <input
                      type="text"
                      value={closedByOperator}
                      onChange={(e) => setClosedByOperator(e.target.value)}
                      placeholder="Nama pemilik / penutup"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-card text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-fg">
                      Alasan Penutupan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={closureReason}
                      onChange={(e) => setClosureReason(e.target.value)}
                      placeholder="Alasan penutupan shift"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-card text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Catatan Tambahan */}
                <div className="space-y-1 text-xs">
                  <label className="font-bold text-fg">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    placeholder="Contoh: Titip uang kas ke kasir malam"
                    className="w-full px-3 py-2 rounded-xl border border-line bg-card text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Konfirmasi Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-card border border-line cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-line text-accent"
                  />
                  <span className="text-xs text-fg leading-relaxed">
                    Saya telah memeriksa uang fisik laci dan mengonfirmasi penutupan shift #{closingShiftTarget.id} atas wewenang pemilik.
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    disabled={isSubmittingClose}
                    onClick={() => setIsCloseModalOpen(false)}
                    className="flex-1 py-2.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingClose ||
                      !isConfirmed ||
                      actualCashInput.trim() === "" ||
                      !closureReason.trim()
                    }
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                  >
                    {isSubmittingClose ? "Menutup Shift..." : "Konfirmasi & Akhiri Shift"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
