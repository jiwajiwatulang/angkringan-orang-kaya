"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { BluetoothSerial } from "@ascentio-it/capacitor-bluetooth-serial";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { 
  generateEscPosReceipt, 
  generateReceiptHtml, 
  generateTestReceiptData, 
  executePrintDocument,
  formatCurrency
} from "@/lib/receipt";

export default function PengaturanPrinterPage() {
  const router = useRouter();
  const { storeSettings, showToast } = useAdmin();

  const [isNative, setIsNative] = useState(false);
  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [selectedDeviceName, setSelectedDeviceName] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [statusMessage, setStatusMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<'58mm' | '80mm'>(storeSettings.paperWidth || "58mm");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    const savedMac = localStorage.getItem("bt_printer_mac");
    const savedName = localStorage.getItem("bt_printer_name");
    if (savedMac) {
      setSelectedMac(savedMac);
      if (savedName) setSelectedDeviceName(savedName);
      setConnectionStatus('connected');
      setStatusMessage(`Tersimpan: ${savedName ? `${savedName} (${savedMac})` : savedMac}`);
    }
    if (storeSettings.paperWidth) {
      setPreviewWidth(storeSettings.paperWidth);
    }
  }, [storeSettings.paperWidth]);

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (isPreviewOpen) {
          setIsPreviewOpen(false);
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
  }, [isPreviewOpen, router]);

  const scanBluetooth = async () => {
    if (!Capacitor.isNativePlatform()) {
      showToast("Pemindaian Bluetooth Serial langsung memerlukan aplikasi Android (APK). Di browser, gunakan Cetak Dokumen / Sistem.", "info");
      return;
    }

    setIsScanning(true);
    setStatusMessage("Memeriksa status Bluetooth perangkat...");
    try {
      const isEnabled = await BluetoothSerial.isEnabled();
      if (!isEnabled.enabled) {
        try {
          await BluetoothSerial.enable();
        } catch (_) {
          alert("Bluetooth belum aktif. Silakan aktifkan Bluetooth melalui Pengaturan HP Android Anda.");
          setIsScanning(false);
          return;
        }
      }

      setStatusMessage("Memindai perangkat Bluetooth yang terpasang (paired)...");
      const paired = await BluetoothSerial.getPairedDevices();
      let list: any[] = paired.devices || [];

      if (list.length === 0) {
        setStatusMessage("Mencari perangkat baru di sekitar...");
        const scanned = await BluetoothSerial.scan();
        list = (scanned.devices || []).map((d: any) => ({ name: d.name, address: d.address }));
      }

      setBtDevices(list);
      showToast(`Ditemukan ${list.length} perangkat Bluetooth`, "info");
      setStatusMessage(`Ditemukan ${list.length} perangkat. Pilih printer kasir Anda dari daftar di bawah.`);
    } catch (_) {
      alert("Printer belum tersambung. Pastikan Bluetooth di HP menyala dan izin Bluetooth telah diizinkan, lalu coba lagi.");
      setStatusMessage("Printer belum tersambung. Periksa Bluetooth dan coba lagi.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPrinter = (mac: string, name?: string) => {
    if (!mac) return;
    setSelectedMac(mac);
    const devName = name || "Printer Thermal";
    setSelectedDeviceName(devName);
    localStorage.setItem("bt_printer_mac", mac);
    localStorage.setItem("bt_printer_name", devName);
    setConnectionStatus('connected');
    setStatusMessage(`Printer terhubung: ${devName}`);
    showToast(`Printer "${devName}" berhasil dipilih & disimpan!`, "success");
  };

  const handleDisconnectPrinter = () => {
    setSelectedMac("");
    setSelectedDeviceName("");
    localStorage.removeItem("bt_printer_mac");
    localStorage.removeItem("bt_printer_name");
    setConnectionStatus('disconnected');
    setStatusMessage("Printer telah dilepas.");
    showToast("Printer berhasil dilepas", "info");
  };

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    setStatusMessage("Menyiapkan dokumen uji cetak...");

    // Siapkan data struk uji coba lengkap & terisolasi
    const testSettings = { ...storeSettings, paperWidth: previewWidth };
    const testData = generateTestReceiptData(testSettings);
    const escposText = generateEscPosReceipt(testData, "all", testSettings);
    const htmlContent = generateReceiptHtml(testData, "all", testSettings);

    try {
      const result = await executePrintDocument({
        title: "Tes_Print_SakuNota_Thermal",
        escposText,
        htmlContent,
        settings: testSettings
      });

      if (result.success) {
        showToast("Struk uji cetak berhasil dikirim ke printer!", "success");
        setStatusMessage("Struk uji cetak berhasil dikirim ke printer.");
      }
    } catch (_) {
      alert("Printer belum tersambung. Periksa Bluetooth dan coba lagi.\n\nTips:\n1. Pastikan printer thermal menyala dan kertas terpasang.\n2. Pastikan printer sudah terhubung (paired) di Bluetooth HP Anda.");
      setStatusMessage("Printer belum tersambung. Periksa Bluetooth dan coba lagi.");
    } finally {
      setIsPrintingTest(false);
    }
  };

  const testReceiptData = generateTestReceiptData({ ...storeSettings, paperWidth: previewWidth });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <Link
            href="/admin/pengaturan"
            className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 mb-1"
          >
            <span>← Kembali ke Pengaturan</span>
          </Link>
          <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
            
            <span>Koneksi Printer Bluetooth Thermal</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Konfigurasi printer thermal ESC/POS 58mm atau 80mm untuk cetak struk kasir, dapur, dan Z-Report.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2.5 bg-card hover:bg-line text-fg font-bold text-xs rounded-xl border border-line transition-all flex items-center gap-1.5"
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c5-10 15-10 20 0-5 10-15 10-20 0M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0" /></svg></span>
            <span>Pratinjau Struk</span>
          </button>

          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isPrintingTest}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zM17 11h1" /></svg></span>
            <span>{isPrintingTest ? "Mencetak Dokumen..." : "Tes Cetak Struk"}</span>
          </button>
        </div>
      </div>

      {/* Platform & Connection Status Banner */}
      <div className="p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Status Printer Kasir
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isNative ? 'bg-blue-900/60 text-blue-200 border border-blue-700/50' : 'bg-slate-800 text-slate-300 border border-line'
              }`}>
                {isNative ? 'Android APK Native' : 'PWA / Web Browser'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  selectedMac ? "bg-emerald-500 shadow-md shadow-emerald-500/30 animate-pulse" : "bg-amber-500"
                }`}
              />
              <h3 className="text-base font-black text-fg">
                {selectedMac 
                  ? `${selectedDeviceName ? `${selectedDeviceName} ` : ''}(${selectedMac})`
                  : "Belum Ada Printer Bluetooth Dipilih"}
              </h3>
            </div>

            {statusMessage && (
              <p className="text-xs text-muted mt-1">
                {statusMessage}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedMac && (
              <button
                type="button"
                onClick={handleDisconnectPrinter}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-800/50 rounded-xl text-xs font-bold transition-all"
              >
                Putuskan Printer
              </button>
            )}

            <button
              type="button"
              onClick={scanBluetooth}
              disabled={isScanning}
              className="px-4 py-2.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 border border-line"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 15l6 6M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0" /></svg></span>
              <span>{isScanning ? "Memindai..." : "Pindai Bluetooth"}</span>
            </button>
          </div>
        </div>

        {/* Paper Width Selector for Current Testing */}
        <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted font-bold">Ukuran Kertas Default:</span>
            <div className="flex items-center bg-card p-1 rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setPreviewWidth('58mm')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewWidth === '58mm'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-fg'
                }`}
              >
                58mm (Kecil / 32 Kolom)
              </button>
              <button
                type="button"
                onClick={() => setPreviewWidth('80mm')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewWidth === '80mm'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-fg'
                }`}
              >
                80mm (Besar / 48 Kolom)
              </button>
            </div>
          </div>

          <span className="text-muted text-[11px]">
            Dokumen cetak terisolasi: tidak akan mencetak dashboard atau menu aplikasi.
          </span>
        </div>
      </div>

      {/* Scanned / Paired Devices List */}
      <div className="bg-surface rounded-3xl p-5 border border-line shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-fg flex items-center gap-2">
            
            <span>Daftar Perangkat Bluetooth Ditemukan</span>
          </h4>
          <span className="text-[11px] text-muted">
            {btDevices.length > 0 ? `${btDevices.length} perangkat terdeteksi` : "0 perangkat"}
          </span>
        </div>

        {btDevices.length === 0 ? (
          <div className="py-8 text-center text-muted text-xs space-y-2 border border-dashed border-line/60 rounded-2xl p-4">
            <div className="text-3xl"><LineIcon name="printer" /></div>
            <p className="font-bold text-fg">Belum ada printer yang dipindai.</p>
            <p className="max-w-md mx-auto text-[11px] leading-relaxed">
              Nyalakan Bluetooth HP dan printer thermal Anda. Pastikan printer sudah di-pairing (dipasangkan) di menu Pengaturan Bluetooth HP Android, lalu tekan tombol <strong>"Pindai Bluetooth"</strong> di atas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {btDevices.map((dev, idx) => {
              const isSelected = selectedMac === dev.address;
              return (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl"><LineIcon name="printer" /></span>
                    <div>
                      <span className="font-bold text-fg text-sm block">
                        {dev.name || "Perangkat Thermal Tanpa Nama"}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        MAC: {dev.address}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPrinter(dev.address, dev.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-accent text-white font-black shadow-md shadow-accent/20"
                        : "bg-card text-slate-300 hover:bg-accent-hover/40 hover:text-accent-text border border-line"
                    }`}
                  >
                    {isSelected ? "✓ Sedang Digunakan" : "Gunakan Printer Ini"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Input Fallback */}
      <div className="bg-surface rounded-3xl p-5 border border-line shadow-sm space-y-3">
        <h4 className="text-sm font-black text-fg flex items-center gap-2">
          
          <span>Input Manual MAC Address (Alternatif Tambahan)</span>
        </h4>
        <p className="text-xs text-muted leading-relaxed">
          Jika printer Bluetooth kasir Anda sudah terpasang (paired) di pengaturan sistem Android namun tidak muncul di hasil pemindaian di atas, masukkan alamat MAC printer secara manual (contoh: <code>66:22:BB:77:88:99</code>):
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="66:22:BB:77:88:99"
            value={selectedMac}
            onChange={(e) => setSelectedMac(e.target.value.trim())}
            className="flex-1 bg-card border border-line rounded-xl p-2.5 text-xs font-mono font-bold text-fg outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => handleSelectPrinter(selectedMac, "Printer Manual")}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Simpan MAC
          </button>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {isPreviewOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div 
            className="bg-card text-fg p-5 sm:p-6 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh] border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl"><LineIcon name="info" /></span>
                <div>
                  <h3 className="font-black text-sm text-fg">Pratinjau Format Struk</h3>
                  <p className="text-[10px] text-muted">Format cetak presisi black-on-white ({previewWidth})</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-surface p-0.5 rounded-lg border border-line text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreviewWidth('58mm')}
                    className={`px-2 py-0.5 rounded font-bold ${previewWidth === '58mm' ? 'bg-accent text-white' : 'text-muted'}`}
                  >
                    58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewWidth('80mm')}
                    className={`px-2 py-0.5 rounded font-bold ${previewWidth === '80mm' ? 'bg-accent text-white' : 'text-muted'}`}
                  >
                    80mm
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-7 h-7 rounded-lg bg-surface hover:bg-line text-muted flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Body (Black on White Isolation) */}
            <div className="flex-1 overflow-y-auto pr-1 bg-neutral-900 p-3 rounded-2xl">
              <div 
                className="bg-white text-black p-4 rounded-lg font-mono text-xs shadow-inner mx-auto"
                style={{ width: previewWidth === '80mm' ? '100%' : '260px' }}
              >
                {/* Store Branding */}
                <div className="text-center mb-3">
                  {storeSettings.storeLogo && (
                    <div className="flex justify-center mb-2">
                      <img src={storeSettings.storeLogo} alt="Logo" className="max-h-12 max-w-[100px] object-contain" />
                    </div>
                  )}
                  <h4 className="font-black text-sm uppercase">{storeSettings.storeName || "SAKUNOTA"}</h4>
                  {storeSettings.storeAddress && (
                    <p className="text-[10px] leading-tight text-neutral-700 mt-0.5">{storeSettings.storeAddress}</p>
                  )}
                  {storeSettings.storePhone && (
                    <p className="text-[10px] text-neutral-700">Telp: {storeSettings.storePhone}</p>
                  )}
                </div>

                <div className="border-t-2 border-dashed border-black my-2" />

                {/* Info Bar */}
                <div className="text-[11px] space-y-0.5 mb-2">
                  <div className="flex justify-between">
                    <span>No: A-999</span>
                    <span className="font-bold">[Meja Tes #01]</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan: Budi Santoso</span>
                    <span>Dine-in</span>
                  </div>
                  <div className="text-[10px] text-neutral-600">
                    Tgl: {testReceiptData.date}
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                {/* Items */}
                <div className="space-y-2 mb-2">
                  {testReceiptData.items.map((it, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between font-bold">
                        <span className="pr-2">{it.qty}x {it.nama}</span>
                        <span className="shrink-0">{formatCurrency(it.qty * it.harga)}</span>
                      </div>
                      {it.selectedModifiers && it.selectedModifiers.map((m, mIdx) => (
                        <div key={mIdx} className="text-[10px] text-neutral-700 pl-3">
                          &gt; {m.optionName} {m.harga > 0 ? `(+${formatCurrency(m.harga)})` : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-black my-2" />

                {/* Totals */}
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(testReceiptData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-800">
                    <span>Diskon:</span>
                    <span>-{formatCurrency(testReceiptData.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Layanan:</span>
                    <span>{formatCurrency(testReceiptData.serviceCharge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pajak PBJT:</span>
                    <span>{formatCurrency(testReceiptData.tax)}</span>
                  </div>

                  <div className="border-t border-dashed border-black my-1.5" />

                  <div className="flex justify-between font-black text-sm">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(testReceiptData.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bayar Tunai:</span>
                    <span>{formatCurrency(testReceiptData.cashTendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kembalian:</span>
                    <span>{formatCurrency(testReceiptData.change)}</span>
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-black my-2" />

                <div className="text-center font-black text-xs py-1 border border-black my-1"> LUNAS
                </div>

                {storeSettings.receiptFooter && (
                  <p className="text-[10px] text-center mt-2 whitespace-pre-line text-neutral-700">
                    {storeSettings.receiptFooter}
                  </p>
                )}
                {storeSettings.enableWatermark && (
                  <p className="text-[9px] text-center mt-1 text-neutral-500">
                    [ SakuNota - Solusi Kasir UMKM ]
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-line mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-surface hover:bg-line text-fg text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isPrintingTest}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl transition-all shadow-md shadow-accent/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zM17 11h1" /></svg></span>
                <span>{isPrintingTest ? "Mencetak..." : "Cetak Dokumen Ini Sekarang"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
