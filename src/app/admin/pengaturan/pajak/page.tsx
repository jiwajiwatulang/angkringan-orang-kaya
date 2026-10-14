"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { saveStoreSettingsAsync } from "@/lib/settings";
import { App } from "@capacitor/app";

export default function PengaturanPajakPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [enableTax, setEnableTax] = useState(storeSettings.enableTax ?? false);
  const [taxPercent, setTaxPercent] = useState(storeSettings.taxPercent ?? 10);
  const [enableService, setEnableService] = useState(storeSettings.enableService ?? false);
  const [servicePercent, setServicePercent] = useState(storeSettings.servicePercent ?? 5);
  const [taxAppliesToService, setTaxAppliesToService] = useState(storeSettings.taxAppliesToService ?? false);

  const [unsavedConfirm, setUnsavedConfirm] = useState<{
    isOpen: boolean;
    onDiscard: () => void;
  } | null>(null);

  useEffect(() => {
    setEnableTax(storeSettings.enableTax ?? false);
    setTaxPercent(storeSettings.taxPercent ?? 10);
    setEnableService(storeSettings.enableService ?? false);
    setServicePercent(storeSettings.servicePercent ?? 5);
    setTaxAppliesToService(storeSettings.taxAppliesToService ?? false);
  }, [storeSettings]);

  const isDirty = () => {
    return (
      enableTax !== (storeSettings.enableTax ?? false) ||
      Number(taxPercent) !== (storeSettings.taxPercent ?? 10) ||
      enableService !== (storeSettings.enableService ?? false) ||
      Number(servicePercent) !== (storeSettings.servicePercent ?? 5) ||
      taxAppliesToService !== (storeSettings.taxAppliesToService ?? false)
    );
  };

  const handleNavigateBack = (e?: React.MouseEvent) => {
    if (isDirty()) {
      if (e) e.preventDefault();
      setUnsavedConfirm({
        isOpen: true,
        onDiscard: () => router.push("/admin/pengaturan"),
      });
    } else {
      router.push("/admin/pengaturan");
    }
  };

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (unsavedConfirm?.isOpen) {
          setUnsavedConfirm(null);
        } else if (isDirty()) {
          setUnsavedConfirm({
            isOpen: true,
            onDiscard: () => router.push("/admin/pengaturan"),
          });
        } else {
          router.push("/admin/pengaturan");
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
  }, [enableTax, taxPercent, enableService, servicePercent, taxAppliesToService, unsavedConfirm, storeSettings, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = {
        ...storeSettings,
        enableTax,
        taxPercent: Number(taxPercent) || 0,
        enableService,
        servicePercent: Number(servicePercent) || 0,
        taxAppliesToService,
      };
      await saveStoreSettingsAsync(updated);
      await refreshSettings();
      showToast("Pengaturan pajak & biaya layanan berhasil disimpan!", "success");
    } catch (err: any) {
      alert("Gagal menyimpan pengaturan: " + err.message);
    }
  };

  // Live Simulation Calculation
  const simSubtotal = 100000;
  const simService = enableService ? Math.round(simSubtotal * (Number(servicePercent) / 100)) : 0;
  const simTaxBase = simSubtotal + (taxAppliesToService ? simService : 0);
  const simTax = enableTax ? Math.round(simTaxBase * (Number(taxPercent) / 100)) : 0;
  const simTotal = simSubtotal + simService + simTax;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <button
            type="button"
            onClick={() => handleNavigateBack()}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mb-1"
          >
            <span>← Kembali ke Pengaturan</span>
          </button>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>💵</span>
            <span>Pajak (PBJT) & Biaya Layanan</span>
          </h2>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
        >
          Simpan Pengaturan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Controls (2 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          {/* PBJT / Pajak Restoran */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  Pajak Barang & Jasa Tertentu (PBJT Restoran)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Pajak daerah 10% untuk restoran, kafe, atau rumah makan.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableTax}
                onChange={(e) => setEnableTax(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            {enableTax && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Persentase Pajak (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-center text-sm font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>
            )}
          </div>

          {/* Service Charge */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  Biaya Layanan (Service Charge)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Biaya tambahan untuk pelayanan kafe/resto (biasanya 5% atau sesuai kebijakan).
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableService}
                onChange={(e) => setEnableService(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            {enableService && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Persentase Layanan (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={servicePercent}
                    onChange={(e) => setServicePercent(Number(e.target.value))}
                    className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-center text-sm font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Pajak juga dikenakan pada Service Charge?
                  </span>
                  <input
                    type="checkbox"
                    checked={taxAppliesToService}
                    onChange={(e) => setTaxAppliesToService(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Live Simulator (1 Col) */}
        <div>
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm sticky top-20 space-y-3">
            <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
              <span>🧮</span>
              <span>Simulasi Hitungan Kasir</span>
            </h4>
            <p className="text-[11px] text-gray-400">
              Contoh pesanan dengan subtotal Rp 100.000:
            </p>

            <div className="space-y-2 text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal Pesanan:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">Rp 100.000</span>
              </div>

              {enableService && (
                <div className="flex justify-between text-gray-500">
                  <span>Service ({servicePercent}%):</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">+Rp {simService.toLocaleString("id-ID")}</span>
                </div>
              )}

              {enableTax && (
                <div className="flex justify-between text-gray-500">
                  <span>PBJT Restoran ({taxPercent}%):</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">+Rp {simTax.toLocaleString("id-ID")}</span>
                </div>
              )}

              <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-900 dark:text-white">Total Struk:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-base">
                  Rp {simTotal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Guard Dialog */}
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
              Perubahan Pajak Belum Disimpan
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Nilai persentase pajak atau biaya layanan yang baru saja Anda ubah belum disimpan. Yakin ingin keluar?
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
