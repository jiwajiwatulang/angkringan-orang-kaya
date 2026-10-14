"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { BluetoothSerial } from "@ascentio-it/capacitor-bluetooth-serial";
import { Printer } from "@capgo/capacitor-printer";
import { generateEscPosReceipt } from "@/lib/receipt";
import { App } from "@capacitor/app";

export default function PengaturanPrinterPage() {
  const router = useRouter();
  const { storeSettings, showToast } = useAdmin();

  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);

  useEffect(() => {
    const savedMac = localStorage.getItem("bt_printer_mac");
    if (savedMac) setSelectedMac(savedMac);
  }, []);

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        router.push("/admin/pengaturan");
      }).then((handle) => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [router]);

  const scanBluetooth = async () => {
    setIsScanning(true);
    try {
      const isEnabled = await BluetoothSerial.isEnabled();
      if (!isEnabled.enabled) {
        alert("Bluetooth belum aktif. Silakan aktifkan Bluetooth di perangkat Anda.");
        await BluetoothSerial.enable();
      }
      const paired = await BluetoothSerial.getPairedDevices();
      let list: any[] = paired.devices || [];
      if (list.length === 0) {
        const scanned = await BluetoothSerial.scan();
        list = (scanned.devices || []).map((d: any) => ({ name: d.name, address: d.address }));
      }
      setBtDevices(list);
      showToast(`Ditemukan ${list.length} perangkat Bluetooth`, "info");
    } catch (e: any) {
      alert("Gagal memindai Bluetooth: " + JSON.stringify(e));
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPrinter = (mac: string) => {
    setSelectedMac(mac);
    localStorage.setItem("bt_printer_mac", mac);
    showToast("Printer Bluetooth berhasil dipilih & disimpan!", "success");
  };

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    const isAndroid = /android/i.test(navigator.userAgent);
    const demoReceiptData = {
      id: 999,
      createdAt: new Date().toISOString(),
      customerName: "Tes Printer Kasir",
      orderType: "Uji Coba",
      tableName: "Meja Tes",
      paymentMethod: "Tunai",
      subtotal: 20000,
      total: 20000,
      items: [
        { nama: "Tes Print Struk Thermal", qty: 1, harga: 20000 },
      ],
    };

    try {
      if (isAndroid && selectedMac) {
        const rawText = generateEscPosReceipt(demoReceiptData, "all", storeSettings);
        try {
          await BluetoothSerial.connect({ address: selectedMac });
        } catch (_) {}
        await BluetoothSerial.write({ address: selectedMac, value: rawText });
        showToast("Struk tes berhasil dicetak via Bluetooth!", "success");
      } else {
        await Printer.printWebView({ name: "Tes_Print_SakuNota" });
        showToast("Tes cetak web printer selesai!", "info");
      }
    } catch (err: any) {
      try {
        await Printer.printWebView({ name: "Tes_Print_SakuNota" });
      } catch (_) {
        alert("Gagal melakukan tes print: " + err.message);
      }
    } finally {
      setIsPrintingTest(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <Link
            href="/admin/pengaturan"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mb-1"
          >
            <span>← Kembali ke Pengaturan</span>
          </Link>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>🖨️</span>
            <span>Koneksi Printer Bluetooth Thermal</span>
          </h2>
        </div>

        <button
          onClick={handleTestPrint}
          disabled={isPrintingTest}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>🖨️</span>
          <span>{isPrintingTest ? "Mencetak..." : "Tes Cetak Struk"}</span>
        </button>
      </div>

      {/* Printer Status Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Status Printer Kasir
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                selectedMac ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              {selectedMac ? `Terkoneksi: ${selectedMac}` : "Belum Ada Printer Dipilih"}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Mendukung printer thermal mini Bluetooth standar ESC/POS (lebar kertas 58mm atau 80mm).
          </p>
        </div>

        <button
          type="button"
          onClick={scanBluetooth}
          disabled={isScanning}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <span>🔍</span>
          <span>{isScanning ? "Memindai Perangkat..." : "Pindai Perangkat Bluetooth"}</span>
        </button>
      </div>

      {/* Scanned / Paired Devices List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
        <h4 className="text-sm font-black text-gray-900 dark:text-white">
          Daftar Perangkat Bluetooth Ditemukan
        </h4>

        {btDevices.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            Belum ada printer yang dipindai. Nyalakan Bluetooth HP dan printer kasir Anda, lalu tekan tombol <strong>"Pindai Perangkat Bluetooth"</strong> di atas.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {btDevices.map((dev, idx) => {
              const isSelected = selectedMac === dev.address;
              return (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🖨️</span>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm block">
                        {dev.name || "Perangkat Thermal Tanpa Nama"}
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">
                        MAC: {dev.address}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPrinter(dev.address)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/20"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {isSelected ? "✓ Terpilih" : "Gunakan Printer Ini"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Input Fallback */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
        <h4 className="text-sm font-black text-gray-900 dark:text-white">
          Input Manual MAC Address (Alternatif)
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Jika printer sudah dipasangkan (paired) di pengaturan Bluetooth Android tetapi tidak terdeteksi, masukkan MAC Address printer secara manual:
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Contoh: 66:22:BB:77:88:99"
            value={selectedMac}
            onChange={(e) => setSelectedMac(e.target.value.trim())}
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => handleSelectPrinter(selectedMac)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
