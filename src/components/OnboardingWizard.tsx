"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState } from "react";
import { StoreSettings, updateStoreSettings } from "@/lib/settings";
import { seedDemoMenus, clearAllMenus, resetStoreTables } from "@/lib/api";
import { requireMerchantAdmin } from '@/lib/merchantAccess';

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
  const [adminPin, setAdminPin] = useState('');

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await requireMerchantAdmin(adminPin);
      // 1. Simpan pengaturan toko
      await updateStoreSettings({
        storeName: storeName.trim() || "Toko SakuNota",
        storeAddress: storeAddress.trim(),
        storePhone: storePhone.trim(),
        businessType: businessType,
        serviceMode: tableCount > 0 ? "resto" : "quick",
        onboardingCompleted: true,
      });

      // 2. Setup menu berdasarkan pilihan pengguna
      if (menuSetupChoice === "demo") {
        await seedDemoMenus(businessType, adminPin);
      } else {
        await clearAllMenus(adminPin);
      }

      // 3. Setup meja berdasarkan jumlah yang dipilih (0 = tanpa meja / mode quick)
      await resetStoreTables(tableCount, 'Meja ', adminPin);

      onComplete();
    } catch (err) {
      console.error("Gagal menyelesaikan onboarding:", err);
      alert(err instanceof Error ? err.message : 'Pengaturan awal belum dapat disimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className=" bg-surface rounded-3xl max-w-lg w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Onboarding */}
        <div className="px-6 py-4 bg-gradient-to-r from-accent to-accent text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/logo-sakunota.png"
                alt="SakuNota"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight">Mulai Menggunakan SakuNota</h2>
              <p className="text-[11px] text-blue-100 font-medium">Panduan Pengaturan Awal Toko</p>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-card/20">
            Langkah {step} dari 4
          </span>
        </div>

        <label className="px-6 pt-3 text-xs font-semibold">PIN Admin untuk menyimpan pengaturan awal
          <input type="password" inputMode="numeric" autoComplete="off" value={adminPin} onChange={event => setAdminPin(event.target.value)} className="block w-full mt-1 rounded-lg border border-line bg-surface text-fg p-2" placeholder="Masukkan PIN Admin toko" />
        </label>
        {/* Progress Bar Indicator */}
        <div className="w-full bg-card h-1.5">
          <div
            className="bg-accent h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content Body per Step */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Identitas Toko */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-black text-fg">
                  1. Masukkan Identitas Usaha Anda
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Informasi ini akan dicetak di bagian atas struk belanja kasir.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Toko / Usaha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Contoh: Kopi Senja, Warung Berkah, dll."
                  className="w-full bg-card border border-line rounded-2xl p-3 text-sm font-bold text-fg focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Alamat Usaha / Cabang
                </label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Contoh: Jl. Malioboro No. 45, Yogyakarta"
                  className="w-full bg-card border border-line rounded-2xl p-3 text-sm font-bold text-fg focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full bg-card border border-line rounded-2xl p-3 text-sm font-bold text-fg focus:border-accent outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Jenis Usaha */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-black text-fg">
                  2. Pilih Jenis Usaha
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  SakuNota menyesuaikan tata letak kasir sesuai bidang operasional Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: "angkringan",
                    icon: "skewers",
                    title: "Angkringan & Street Food",
                    desc: "Cocok untuk gerobak, nasi kucing, sate-satean, dan wedangan santai.",
                  },
                  {
                    id: "kafe",
                    icon: "drink",
                    title: "Kafe & Kedai Kopi",
                    desc: "Mendukung modifier level gula, es batu, topping, dan nomor meja.",
                  },
                  {
                    id: "warung",
                    icon: "food",
                    title: "Warung Makan & Restoran",
                    desc: "Dine-in meja lengkap, split bill antar pelanggan, dan takeaway cepat.",
                  },
                  {
                    id: "retail",
                    icon: "store",
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
                        ? " bg-accent/40 border-accent ring-2 ring-accent/20 text-blue-100"
                        : " bg-card/60 border-line text-slate-300"
                    }`}
                  >
                    <span className="text-2xl"><LineIcon name={type.icon} className="w-6 h-6" /></span>
                    <div className="flex-1">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{type.title}</span>
                        {businessType === type.id && (
                          <span className=" text-accent-text">Terpilih</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
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
                <h3 className="text-sm font-black text-fg">
                  3. Pilihan Data Katalog Menu
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Anda bisa mulai dengan data contoh atau langsung mulai dari nol.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setMenuSetupChoice("demo")}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-start gap-3.5 ${
                    menuSetupChoice === "demo"
                      ? " bg-accent/40 border-accent ring-2 ring-accent/20"
                      : " bg-card/60 border-line"
                  }`}
                >
                  <span className="text-2xl"><LineIcon name="lightning" /></span>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-fg flex items-center justify-between">
                      <span>Gunakan Contoh Menu SakuNota</span>
                      {menuSetupChoice === "demo" && (
                        <span className=" text-accent-text"><LineIcon name="success" /></span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      Otomatis memuat daftar menu contoh dengan kategori, harga, dan modifier add-on siap pakai. Anda bebas mengedit atau menghapusnya kapan saja.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMenuSetupChoice("clean")}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-start gap-3.5 ${
                    menuSetupChoice === "clean"
                      ? " bg-accent/40 border-accent ring-2 ring-accent/20"
                      : " bg-card/60 border-line"
                  }`}
                >
                  <span className="text-2xl"><LineIcon name="receipt" /></span>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-fg flex items-center justify-between">
                      <span>Mulai dari Bersih (Kosong / Import Excel)</span>
                      {menuSetupChoice === "clean" && (
                        <span className=" text-accent-text"><LineIcon name="success" /></span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
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
                <h3 className="text-sm font-black text-fg">
                  4. Konfigurasi Meja & Siap Melayani
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Berapa jumlah meja yang ingin otomatis dibuat sekarang?
                </p>
              </div>

              <div className="p-4 bg-card/60 rounded-2xl border border-line">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Jumlah Meja Awal: <span className="text-accent-text font-black">{tableCount} Meja</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 5, 10, 15, 20, 30].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTableCount(num)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        tableCount === num
                          ? "bg-accent text-white border-accent shadow"
                          : " bg-line border-line text-slate-300"
                      }`}
                    >
                      {num === 0 ? "Tanpa Meja" : `${num} Meja`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted mt-2">
                  Anda selalu dapat menambah, menamai ulang, atau menghapus meja massal di menu Kelola Meja.
                </p>
              </div>

              <div className="p-3 bg-accent/40 rounded-2xl border border-accent/40 text-accent-text text-xs">
                 Toko Anda siap dioperasikan secara offline! Printer Bluetooth dapat dihubungkan kapan saja melalui Pusat Pengaturan.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-line flex justify-between items-center bg-surface/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-slate-300 hover:bg-card transition-colors"
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
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover active:scale-95 text-white text-xs font-bold shadow-lg shadow-accent/20 transition-all"
            >
              Lanjutkan →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover active:scale-95 text-white text-xs font-bold shadow-lg shadow-accent/20 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? "Menyiapkan Toko..." : "Mulai Kasir SakuNota "}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
