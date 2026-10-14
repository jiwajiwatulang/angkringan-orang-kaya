"use client";

import React, { useState } from "react";
import { StoreSettings, updateStoreSettings } from "@/lib/settings";
import { seedDemoMenus, bulkCreateTables } from "@/lib/api";

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  currentSettings: StoreSettings;
}

export default function OnboardingWizard({
  isOpen,
  onComplete,
  currentSettings,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [storeName, setStoreName] = useState(currentSettings.storeName || "Toko SakuNota");
  const [storeAddress, setStoreAddress] = useState(currentSettings.storeAddress || "");
  const [storePhone, setStorePhone] = useState(currentSettings.storePhone || "");
  const [businessType, setBusinessType] = useState<string>("angkringan");
  const [menuSetupChoice, setMenuSetupChoice] = useState<"demo" | "clean">("demo");
  const [tableCount, setTableCount] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Simpan pengaturan toko
      await updateStoreSettings({
        storeName: storeName.trim() || "Toko SakuNota",
        storeAddress: storeAddress.trim(),
        storePhone: storePhone.trim(),
        businessType: businessType,
        onboardingCompleted: true,
      });

      // 2. Setup menu berdasarkan pilihan pengguna
      if (menuSetupChoice === "demo") {
        await seedDemoMenus(businessType);
      }

      // 3. Setup meja jika tableCount > 0
      if (tableCount > 0) {
        await bulkCreateTables({ prefix: "Meja ", startNum: 1, count: tableCount });
      }

      onComplete();
    } catch (err) {
      console.error("Gagal menyelesaikan onboarding:", err);
      alert("Terjadi kesalahan saat menyimpan pengaturan awal toko.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Onboarding */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-sm">
              SN
            </div>
            <div>
              <h2 className="text-base font-black leading-tight">Mulai Menggunakan SakuNota</h2>
              <p className="text-[11px] text-emerald-100 font-medium">Panduan Pengaturan Awal Toko</p>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white/20">
            Langkah {step} dari 4
          </span>
        </div>

        {/* Progress Bar Indicator */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content Body per Step */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Identitas Toko */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  1. Masukkan Identitas Usaha Anda
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Informasi ini akan dicetak di bagian atas struk belanja kasir.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Toko / Usaha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Contoh: Kopi Senja, Warung Berkah, dll."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Alamat Usaha / Cabang
                </label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Contoh: Jl. Malioboro No. 45, Yogyakarta"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Jenis Usaha */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  2. Pilih Jenis Usaha
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  SakuNota menyesuaikan tata letak kasir sesuai bidang operasional Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: "angkringan",
                    icon: "🍢",
                    title: "Angkringan & Street Food",
                    desc: "Cocok untuk gerobak, nasi kucing, sate-satean, dan wedangan santai.",
                  },
                  {
                    id: "kafe",
                    icon: "☕",
                    title: "Kafe & Kedai Kopi",
                    desc: "Mendukung modifier level gula, es batu, topping, dan nomor meja.",
                  },
                  {
                    id: "warung",
                    icon: "🍛",
                    title: "Warung Makan & Restoran",
                    desc: "Dine-in meja lengkap, split bill antar pelanggan, dan takeaway cepat.",
                  },
                  {
                    id: "retail",
                    icon: "🛍️",
                    title: "Retail UMKM / Toko Kelontong",
                    desc: "Transaksi cepat tanpa meja, kasir gesit dengan scan barcode/pencarian.",
                  },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setBusinessType(type.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                      businessType === type.id
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100"
                        : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{type.title}</span>
                        {businessType === type.id && (
                          <span className="text-emerald-600 dark:text-emerald-400">✓ Terpilih</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {type.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Pilihan Data Menu Awal */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  3. Pilihan Data Katalog Menu
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Anda bisa mulai dengan data contoh atau langsung mulai dari nol.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setMenuSetupChoice("demo")}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-start gap-3.5 ${
                    menuSetupChoice === "demo"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span className="text-2xl">🌟</span>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                      <span>Gunakan Contoh Menu SakuNota</span>
                      {menuSetupChoice === "demo" && (
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Otomatis memuat daftar menu contoh dengan kategori, harga, dan modifier add-on siap pakai. Anda bebas mengedit atau menghapusnya kapan saja.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMenuSetupChoice("clean")}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-start gap-3.5 ${
                    menuSetupChoice === "clean"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span className="text-2xl">📄</span>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                      <span>Mulai dari Bersih (Kosong / Import Excel)</span>
                      {menuSetupChoice === "clean" && (
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Katalog menu dimulai tanpa isi (0 produk). Sangat cocok jika Anda ingin mengimpor ratusan produk dari file Excel/CSV atau menginput sendiri.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Konfigurasi Meja & Siap Transaksi */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  4. Konfigurasi Meja & Siap Melayani
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Berapa jumlah meja yang ingin otomatis dibuat sekarang?
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Jumlah Meja Awal: <span className="text-emerald-600 font-black">{tableCount} Meja</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 5, 10, 15, 20, 30].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTableCount(num)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        tableCount === num
                          ? "bg-emerald-600 text-white border-emerald-600 shadow"
                          : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {num === 0 ? "Tanpa Meja" : `${num} Meja`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  Anda selalu dapat menambah, menamai ulang, atau menghapus meja massal di menu Kelola Meja.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                🎉 Toko Anda siap dioperasikan secara offline! Printer Bluetooth dapat dihubungkan kapan saja melalui Pusat Pengaturan.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ← Kembali
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
            >
              Lanjutkan →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? "Menyiapkan Toko..." : "Mulai Kasir SakuNota 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
