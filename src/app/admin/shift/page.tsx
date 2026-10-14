"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import { getAllShifts, getActiveShift, getShiftLiveStats } from "@/lib/api";
import { db } from "@/lib/dexie";
import { generateZReportReceipt } from "@/lib/receipt";
import { Printer } from "@capgo/capacitor-printer";
import { BluetoothSerial } from "@ascentio-it/capacitor-bluetooth-serial";

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
    const isAndroid = /android/i.test(navigator.userAgent);
    const mac = localStorage.getItem("bt_printer_mac");

    try {
      const zReportText = generateZReportReceipt(shift, storeSettings);
      if (isAndroid && mac) {
        try {
          await BluetoothSerial.connect({ address: mac });
        } catch (_) {}
        await BluetoothSerial.write({ address: mac, value: zReportText });
        showToast("Z-Report berhasil dikirim ke printer Bluetooth!", "success");
      } else {
        await Printer.printWebView({ name: `Z_Report_Shift_${shift.id}` });
      }
    } catch (e: any) {
      try {
        await Printer.printWebView({ name: `Z_Report_Shift_${shift.id}` });
      } catch (_) {
        alert("Gagal memanggil printer: " + e.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>💼</span>
            <span>Shift Kasir & Z-Report</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Audit penutupan kasir, selisih uang fisik, dan pergerakan kas laci.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-200/80 dark:bg-gray-800 rounded-2xl self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'shifts'
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Riwayat Shift ({shifts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'movements'
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Arus Kas Laci ({cashMovements.length})
          </button>
        </div>
      </div>

      {/* Active Shift Card (If currently running) */}
      {activeShift && activeShiftStats && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border-2 border-emerald-500/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-black text-sm text-emerald-950 dark:text-emerald-300">
                Shift Sedang Aktif di Kasir
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white">
              Shift #{activeShift.id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-emerald-200/40">
              <span className="text-[10px] text-gray-400 font-bold block">Operator:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                {activeShift.operatorName}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-emerald-200/40">
              <span className="text-[10px] text-gray-400 font-bold block">Modal Awal:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                Rp {(activeShift.startingCash || 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-emerald-200/40">
              <span className="text-[10px] text-gray-400 font-bold block">Penjualan Tunai:</span>
              <span className="font-bold text-emerald-600 text-sm">
                Rp {(activeShiftStats.cashSales || 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-emerald-200/40">
              <span className="text-[10px] text-gray-400 font-bold block">Estimasi Fisik Laci:</span>
              <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                Rp {(activeShiftStats.expectedCash || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            ℹ️ Penutupan shift kasir dilakukan dari menu POS dengan prosedur <strong>True Blind Close</strong> (penghitungan uang fisik objektif).
          </p>
        </div>
      )}

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-xs">Memuat data shift...</div>
      ) : activeTab === 'shifts' ? (
        shifts.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="text-4xl mb-2">💼</div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Belum ada riwayat shift</h3>
            <p className="text-xs text-gray-400 mt-1">Shift kasir akan tercatat secara otomatis setelah kasir ditutup.</p>
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
                  className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4 hover:border-emerald-500/40 transition-all"
                >
                  {/* Shift Top Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-900 dark:text-white">
                          Shift #{shift.id}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                          • Kasir: <strong className="text-gray-800 dark:text-gray-200">{shift.operatorName}</strong>
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {isOpen ? "AKTIF" : "DITUTUP"}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {startDate} → {endDate}
                      </span>
                    </div>

                    {!isOpen && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl ${
                            isMatch
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : isOver
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {isMatch ? "✓ PAS / COCOK" : isOver ? `+Rp ${diff.toLocaleString("id-ID")} (LEBIH)` : `-Rp ${Math.abs(diff).toLocaleString("id-ID")} (KURANG)`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePrintZReport(shift)}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>🖨️</span>
                          <span>Cetak Z-Report</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block font-semibold">Modal Awal</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        Rp {(shift.startingCash || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block font-semibold">Penjualan Tunai</span>
                      <span className="font-bold text-emerald-600">
                        Rp {(shift.cashSales || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block font-semibold">Non-Tunai (QRIS)</span>
                      <span className="font-bold text-blue-600">
                        Rp {(shift.nonCashSales || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block font-semibold">Kas Masuk / Keluar</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        +{(shift.cashIn || 0).toLocaleString("id-ID")} / -{(shift.cashOut || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block font-semibold">Estimasi Sistem</span>
                      <span className="font-black text-gray-900 dark:text-white">
                        Rp {(shift.expectedCash || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block font-semibold">Uang Fisik Kasir</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400">
                        {shift.actualCash !== undefined ? `Rp ${shift.actualCash.toLocaleString("id-ID")}` : "—"}
                      </span>
                    </div>
                  </div>

                  {shift.notes && (
                    <div className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl">
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
          <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="text-4xl mb-2">💵</div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Belum ada catatan kas laci</h3>
            <p className="text-xs text-gray-400 mt-1">Pencatatan kas masuk / kas keluar kasir akan muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cashMovements.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-black ${
                      m.type === 'in'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {m.type === 'in' ? '🟢' : '🔴'}
                  </div>
                  <div>
                    <span className="font-black text-gray-900 dark:text-white text-sm block">
                      {m.reason || (m.type === 'in' ? 'Kas Masuk' : 'Kas Keluar')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Oleh: {m.operatorName || 'Kasir'} • {new Date(m.timestamp).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-black ${
                      m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {m.type === 'in' ? '+' : '-'}Rp {(m.amount || 0).toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] text-gray-400 block">
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
