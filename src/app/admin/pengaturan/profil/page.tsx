"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { saveStoreSettingsAsync } from "@/lib/settings";
import { App } from "@capacitor/app";

export default function PengaturanProfilPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [storeName, setStoreName] = useState(storeSettings.storeName || "");
  const [storeAddress, setStoreAddress] = useState(storeSettings.storeAddress || "");
  const [storePhone, setStorePhone] = useState(storeSettings.storePhone || "");
  const [receiptFooter, setReceiptFooter] = useState(storeSettings.receiptFooter || "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali");
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(storeSettings.paperWidth || "58mm");

  const [unsavedConfirm, setUnsavedConfirm] = useState<{
    isOpen: boolean;
    onDiscard: () => void;
  } | null>(null);

  useEffect(() => {
    setStoreName(storeSettings.storeName || "");
    setStoreAddress(storeSettings.storeAddress || "");
    setStorePhone(storeSettings.storePhone || "");
    setReceiptFooter(storeSettings.receiptFooter || "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali");
    setPaperWidth(storeSettings.paperWidth || "58mm");
  }, [storeSettings]);

  const isDirty = () => {
    return (
      storeName !== (storeSettings.storeName || "") ||
      storeAddress !== (storeSettings.storeAddress || "") ||
      storePhone !== (storeSettings.storePhone || "") ||
      receiptFooter !== (storeSettings.receiptFooter || "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali") ||
      paperWidth !== (storeSettings.paperWidth || "58mm")
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

  // Back button listener
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
  }, [storeName, storeAddress, storePhone, receiptFooter, paperWidth, unsavedConfirm, storeSettings, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = {
        ...storeSettings,
        storeName: storeName.trim(),
        storeAddress: storeAddress.trim(),
        storePhone: storePhone.trim(),
        receiptFooter: receiptFooter.trim(),
        paperWidth: paperWidth,
      };
      await saveStoreSettingsAsync(updated);
      await refreshSettings();
      showToast("Profil usaha & struk berhasil disimpan!", "success");
    } catch (err: any) {
      alert("Gagal menyimpan profil: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Breadcrumb Header */}
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
            <span>🏪</span>
            <span>Profil Usaha & Pengaturan Struk</span>
          </h2>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
        >
          Simpan Profil
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs (2 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nama Usaha / Toko:
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Angkringan Orang Kaya"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Alamat Cabang:
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Contoh: Jl. Kaliurang KM 5.5, Yogyakarta"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nomor Telepon / WhatsApp:
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Lebar Kertas Printer Kasir:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    paperWidth === "58mm"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  58mm (Printer Mini Standar)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    paperWidth === "80mm"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  80mm (Printer Lebar)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Catatan Kaki Struk (Footer):
              </label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* Live Thermal Receipt Simulation (1 Col) */}
        <div>
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm sticky top-20">
            <h4 className="text-xs font-black text-gray-900 dark:text-white mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <span>🧾</span>
              <span>Pratinjau Struk Kasir</span>
            </h4>

            <div className={`bg-amber-50/40 dark:bg-gray-800/60 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 font-mono text-[11px] leading-tight text-gray-800 dark:text-gray-200 space-y-2 ${paperWidth === '80mm' ? 'max-w-xs' : 'max-w-[240px]'} mx-auto`}>
              <div className="text-center font-bold text-sm">
                {storeName || "Nama Usaha"}
              </div>
              {storeAddress && <div className="text-center text-[10px] text-gray-500">{storeAddress}</div>}
              {storePhone && <div className="text-center text-[10px] text-gray-500">Telp: {storePhone}</div>}
              <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pt-1" />

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>1x Nasi Kucing Teri</span>
                  <span>Rp 4.000</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Sate Usus Bakar</span>
                  <span>Rp 6.000</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Wedang Jahe Susu</span>
                  <span>Rp 7.000</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pt-1" />
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL:</span>
                <span>Rp 17.000</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Tunai (Cash):</span>
                <span>Rp 20.000</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Kembalian:</span>
                <span>Rp 3.000</span>
              </div>

              <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pt-1" />
              <div className="text-center text-[10px] text-gray-500 pt-1 whitespace-pre-line">
                {receiptFooter || "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali"}
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
              Profil Belum Disimpan
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Perubahan nama atau alamat toko yang Anda ketik belum disimpan secara permanen. Yakin ingin kembali?
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
