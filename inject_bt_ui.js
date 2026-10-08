const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

const importBluetooth = `import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';\n`;
if (!c.includes('@ascentio-it/capacitor-bluetooth-serial')) {
    c = c.replace(/import Link from "next\/link";/, `import Link from "next/link";\n${importBluetooth}`);
}

const stateVars = `  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  
  useEffect(() => {
    const savedMac = localStorage.getItem('bt_printer_mac');
    if(savedMac) setSelectedMac(savedMac);
  }, []);
  
  const scanBluetooth = async () => {
    setIsScanning(true);
    try {
      const isEnabled = await BluetoothSerial.isEnabled();
      if (!isEnabled.enabled) {
        alert("Bluetooth belum aktif. Nyalakan bluetooth HP Anda.");
        await BluetoothSerial.enable();
      }
      const devices = await BluetoothSerial.list();
      setBtDevices(devices.devices || []);
    } catch(e) {
      alert("Gagal mencari bluetooth: " + JSON.stringify(e));
    }
    setIsScanning(false);
  };
  
  const savePrinter = (mac: string) => {
    localStorage.setItem('bt_printer_mac', mac);
    setSelectedMac(mac);
    alert("Printer berhasil disimpan!");
  };
`;

c = c.replace(/const \[tables, setTables\] = useState<any\[\]>\(\[\]\);/, `${stateVars}\n  const [tables, setTables] = useState<any[]>([]);`);

const uiBlock = `
          {/* Bluetooth Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 mt-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Pengaturan Printer Bluetooth</h2>
            <div className="mb-4">
               <p className="text-sm text-gray-600 mb-2">MAC Address Printer Aktif: <strong>{selectedMac || 'Belum diatur'}</strong></p>
               <button onClick={scanBluetooth} disabled={isScanning} className="bg-blue-600 text-white px-4 py-2 rounded">
                 {isScanning ? 'Mencari...' : 'Cari Perangkat Bluetooth'}
               </button>
            </div>
            
            {btDevices.length > 0 && (
               <div className="border rounded p-4">
                  <h3 className="font-bold mb-2">Pilih Printer:</h3>
                  <ul className="space-y-2">
                     {btDevices.map((d: any) => (
                        <li key={d.address} className="flex justify-between items-center border-b pb-2">
                           <span>{d.name || 'Unknown'} <small className="text-gray-500">({d.address})</small></span>
                           <button onClick={() => savePrinter(d.address)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                             Pilih
                           </button>
                        </li>
                     ))}
                  </ul>
               </div>
            )}
          </div>
`;

c = c.replace(/<\/main>/, `${uiBlock}\n      </main>`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
