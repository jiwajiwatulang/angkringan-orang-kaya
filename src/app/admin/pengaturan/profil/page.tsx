"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { requireMerchantAdmin } from "@/lib/merchantAccess";
import { saveStoreSettingsAsync, BUSINESS_TYPES } from "@/lib/settings";
import { App } from "@capacitor/app";

export default function PengaturanProfilPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [storeName, setStoreName] = useState(storeSettings.storeName || "");
  const [storeAddress, setStoreAddress] = useState(storeSettings.storeAddress || "");
  const [storePhone, setStorePhone] = useState(storeSettings.storePhone || "");
  const [receiptFooter, setReceiptFooter] = useState(storeSettings.receiptFooter || "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali");
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(storeSettings.paperWidth || "58mm");
  const [storeLogo, setStoreLogo] = useState(storeSettings.storeLogo || "");
  const [businessType, setBusinessType] = useState(storeSettings.businessType || "warung");

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
    setStoreLogo(storeSettings.storeLogo || "");
    setBusinessType(storeSettings.businessType || "warung");
  }, [storeSettings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar (JPG, PNG, atau WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png");
          setStoreLogo(compressed);
          showToast("Logo berhasil dimuat! Klik Simpan Profil untuk menerapkan.", "info");
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isDirty = () => {
    return (
      storeName !== (storeSettings.storeName || "") ||
      storeAddress !== (storeSettings.storeAddress || "") ||
      storePhone !== (storeSettings.storePhone || "") ||
      receiptFooter !== (storeSettings.receiptFooter || "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali") ||
      paperWidth !== (storeSettings.paperWidth || "58mm") ||
      storeLogo !== (storeSettings.storeLogo || "") ||
      businessType !== (storeSettings.businessType || "warung")
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
  }, [storeName, storeAddress, storePhone, receiptFooter, paperWidth, storeLogo, businessType, unsavedConfirm, storeSettings, router]);

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
        storeLogo: storeLogo,
        businessType: businessType,
        serviceMode: (businessType === "restoran" || businessType === "kafe") ? ("resto" as const) : ("quick" as const),
      };
      await requireMerchantAdmin();
      await saveStoreSettingsAsync(updated);
      await refreshSettings();
      showToast("Profil usaha & alur kasir berhasil disimpan!", "success");
    } catch (err: any) {
      alert("Gagal menyimpan profil: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div>
          <button
            type="button"
            onClick={() => handleNavigateBack()}
            className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 mb-1"
          >
            <span>← Kembali ke Pengaturan</span>
          </button>
          <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
            
            <span>Profil Usaha & Pengaturan Struk</span>
          </h2>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all"
        >
          Simpan Profil
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs (2 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className=" bg-surface p-5 rounded-3xl border border-line shadow-sm space-y-4">
            {/* Logo Usaha */}
            <div>
              <label className="block text-xs font-bold text-fg mb-2">
                Logo Usaha / Struk:
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-card border-2 border-dashed border-line flex items-center justify-center overflow-hidden shrink-0">
                  {storeLogo ? (
                    <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl"><LineIcon name="info" /></span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <label className="relative cursor-pointer px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5 overflow-hidden active:scale-95 shadow-sm">
                      <span> Pilih Gambar Logo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {storeLogo && (
                      <button
                        type="button"
                        onClick={() => setStoreLogo("")}
                        className="px-3.5 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shadow-sm active:scale-95"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted">Format JPG, PNG, WebP. Maks 256x256 px.</p>
                </div>
              </div>
            </div>

            {/* Jenis Usaha & Alur Kasir */}
            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Jenis Usaha & Alur Kasir:
              </label>
              <p className="text-[11px] text-muted mb-2.5">
                Pilih jenis usaha Anda. Toko & Warung langsung mencatat transaksi cepat tanpa mewajibkan pengaturan meja.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BUSINESS_TYPES.map((bt) => {
                  const isSelected = businessType === bt.id;
                  return (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => setBusinessType(bt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-accent/15 border-accent text-fg shadow-sm"
                          : "bg-card border-line text-muted hover:border-slate-500 hover:text-fg"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs text-fg">{bt.title}</span>
                        {isSelected && <span className="text-xs text-accent-text font-black">Dipilih</span>}
                      </div>
                      <span className="text-[11px] text-muted leading-tight">{bt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-fg">
                  Nama Usaha / Toko:
                </label>
                <span className="text-[10px] text-muted font-mono">{storeName.length}/25</span>
              </div>
              <input
                type="text"
                maxLength={25}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Angkringan Orang Kaya"
                className="w-full bg-card border border-line rounded-xl p-3 text-sm font-bold text-fg outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Alamat Cabang:
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Contoh: Jl. Kaliurang KM 5.5, Yogyakarta"
                className="w-full bg-card border border-line rounded-xl p-3 text-xs text-fg outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Nomor Telepon / WhatsApp:
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full bg-card border border-line rounded-xl p-3 text-xs text-fg outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Lebar Kertas Printer Kasir:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    paperWidth === "58mm"
                      ? "bg-accent text-white border-accent shadow-sm"
                      : " bg-card text-muted hover:text-fg border-line"
                  }`}
                >
                  58mm (Printer Mini Standar)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    paperWidth === "80mm"
                      ? "bg-accent text-white border-accent shadow-sm"
                      : " bg-card text-muted hover:text-fg border-line"
                  }`}
                >
                  80mm (Printer Lebar)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Catatan Kaki Struk (Footer):
              </label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                className="w-full bg-card border border-line rounded-xl p-3 text-xs text-fg outline-none focus:border-accent"
              />
            </div>
          </div>
        </form>

        {/* Live Thermal Receipt Simulation (1 Col) */}
        <div>
          <div className=" bg-surface p-5 rounded-3xl border border-line shadow-sm sticky top-20">
            <h4 className="text-xs font-black text-fg mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              
              <span>Pratinjau Struk Kasir</span>
            </h4>

            <div className={` bg-card/60 p-4 rounded-2xl border border-dashed border-line font-mono text-[11px] leading-tight text-fg space-y-2 ${paperWidth === '80mm' ? 'max-w-xs' : 'max-w-[240px]'} mx-auto`}>
              <div className="text-center font-bold text-sm">
                {storeName || "Nama Usaha"}
              </div>
              {storeAddress && <div className="text-center text-[10px] text-muted">{storeAddress}</div>}
              {storePhone && <div className="text-center text-[10px] text-muted">Telp: {storePhone}</div>}
              <div className="border-b border-dashed border-line pt-1" />

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

              <div className="border-b border-dashed border-line pt-1" />
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL:</span>
                <span>Rp 17.000</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted">
                <span>Tunai (Cash):</span>
                <span>Rp 20.000</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted">
                <span>Kembalian:</span>
                <span>Rp 3.000</span>
              </div>

              <div className="border-b border-dashed border-line pt-1" />
              <div className="text-center text-[10px] text-muted pt-1 whitespace-pre-line">
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
            className=" bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-950/60 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black"><LineIcon name="info" /></div>
            <h3 className="text-base font-black text-fg mb-1">
              Profil Belum Disimpan
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-5">
              Perubahan nama atau alamat toko yang Anda ketik belum disimpan secara permanen. Yakin ingin kembali?
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
