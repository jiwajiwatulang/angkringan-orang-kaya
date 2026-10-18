"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import { getAllShifts, getActiveShift, getShiftLiveStats } from "@/lib/api";
import { db } from "@/lib/dexie";
import { generateZReportReceipt, generateZReportHtml, executePrintDocument } from "@/lib/receipt";

export default function AdminShiftPage() {
  const { storeSettings, showToast } = useAdmin();
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [activeShiftStats, setActiveShiftStats] = useState<any>(null);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab: 'shifts' or 'movements'
  const [activeTab, setActiveTab] = useState<'shifts' | 'movements'>('shifts');

  const loadData = async () => {
    try {
      const [allShifts, currentShift, movements] = await Promise.all([
        getAllShifts(),
        getActiveShift(),
        db.table('cashMovements').reverse().toArray(),
      ]);
      setShifts(allShifts);
      setActiveShift(currentShift);
      setCashMovements(movements);

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
        settings: storeSettings
      });
      if (result.success) {
        showToast(result.message, "success");
      }
    } catch (e: any) {
      alert("Gagal mencetak Z-Report: " + (e.message || e));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
            
            <span>Shift Kasir & Z-Report</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Audit penutupan kasir, selisih uang fisik, dan pergerakan kas laci.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-card rounded-2xl self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'shifts'
                ? " bg-surface text-fg shadow-sm"
                : " text-muted hover:text-fg"
            }`}
          >
            Riwayat Shift ({shifts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'movements'
                ? " bg-surface text-fg shadow-sm"
                : " text-muted hover:text-fg"
            }`}
          >
            Arus Kas Laci ({cashMovements.length})
          </button>
        </div>
      </div>

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
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent text-white">
              Shift #{activeShift.id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-surface/80 border border-accent/30">
              <span className="text-[10px] text-muted font-bold block">Operator:</span>
              <span className="font-bold text-fg text-sm">
                {activeShift.operatorName}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-surface/80 border border-accent/30">
              <span className="text-[10px] text-muted font-bold block">Modal Awal:</span>
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
          <p className="text-[11px] text-muted leading-relaxed"> Penutupan shift kasir dilakukan dari menu POS dengan prosedur <strong>True Blind Close</strong> (penghitungan uang fisik objektif).
          </p>
        </div>
      )}

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="py-12 text-center text-muted text-xs">Memuat data shift...</div>
      ) : activeTab === 'shifts' ? (
        shifts.length === 0 ? (
          <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
            <div className="text-4xl mb-2"><LineIcon name="info" /></div>
            <h3 className="text-sm font-bold text-slate-300">Belum ada riwayat shift</h3>
            <p className="text-xs text-muted mt-1">Shift kasir akan tercatat secara otomatis setelah kasir ditutup.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const isOpen = shift.status === 'open';
              const diff = shift.cashDifference !== undefined ? shift.cashDifference : (shift.difference || 0);
              const isMatch = diff === 0;
              const isOver = diff > 0;
              const isUnder = diff < 0;

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
                        <span className="font-black text-sm text-fg">
                          Shift #{shift.id}
                        </span>
                        <span className="text-xs font-bold text-muted">
                          • Kasir: <strong className=" text-fg">{shift.operatorName}</strong>
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isOpen
                              ? " bg-accent/60 text-accent-text"
                              : " bg-card text-muted"
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
                              ? " bg-accent/60 text-accent-text"
                              : isOver
                              ? " bg-amber-950/60 text-amber-300"
                              : " bg-rose-950/60 text-rose-300"
                          }`}
                        >
                          {isMatch ? "PAS / COCOK" : isOver ? `+Rp ${diff.toLocaleString("id-ID")} (LEBIH)` : `-Rp ${Math.abs(diff).toLocaleString("id-ID")} (KURANG)`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePrintZReport(shift)}
                          className="px-3 py-1.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span><LineIcon name="printer" /></span>
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
                      <span className="font-bold text-slate-300">
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
        /* Cash Movements Tab */
        cashMovements.length === 0 ? (
          <div className="py-12 text-center bg-surface rounded-3xl border border-line p-8">
            <div className="text-4xl mb-2"><LineIcon name="tax" /></div>
            <h3 className="text-sm font-bold text-slate-300">Belum ada catatan kas laci</h3>
            <p className="text-xs text-muted mt-1">Pencatatan kas masuk / kas keluar kasir akan muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cashMovements.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-surface border border-line flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-black ${
                      m.type === 'in'
                        ? ' bg-accent/60 text-accent-text'
                        : ' bg-rose-950/60 text-rose-300'
                    }`}
                  >
                    {m.type === 'in' ? 'Masuk' : 'Keluar'}
                  </div>
                  <div>
                    <span className="font-black text-fg text-sm block">
                      {m.reason || (m.type === 'in' ? 'Kas Masuk' : 'Kas Keluar')}
                    </span>
                    <span className="text-[10px] text-muted">
                      Oleh: {m.operatorName || 'Kasir'} • {new Date(m.timestamp).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-black ${
                      m.type === 'in' ? 'text-accent-text' : 'text-rose-400'
                    }`}
                  >
                    {m.type === 'in' ? '+' : '-'}Rp {(m.amount || 0).toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] text-muted block">
                    {m.type === 'in' ? 'Kas Masuk' : 'Kas Keluar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
