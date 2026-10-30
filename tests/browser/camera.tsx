// Local-only camera simulation. Never included in production routes.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import BarcodeCameraModal from '../../src/components/BarcodeCameraModal';

let mode: 'qr' | 'ean' | 'retry' | 'resume' | 'timeout' = 'qr', calls = 0, stopped = 0;
Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: undefined });
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
  calls++;
  if(mode === 'timeout' && calls === 1) await new Promise(resolve=>setTimeout(resolve,22000));
  if (mode === 'retry' && calls === 1) throw new DOMException('Test permission denied', 'NotAllowedError');
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
  const context=canvas.getContext('2d')!;
  context.fillStyle='white';context.fillRect(0,0,640,480);context.fillStyle='black';
  if (mode === 'ean') {
    const left=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],right=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
    const code='0089686010947';
    const bars='101'+code.slice(1,7).split('').map(n=>left[+n]).join('')+'01010'+code.slice(7).split('').map(n=>right[+n]).join('')+'101';
    [...bars].forEach((bar,i)=>{if(bar==='1')context.fillRect(130+i*4,120,4,240);});
  } else if (mode !== 'resume' || calls > 1) {
    const qr=QRCode.create('SAKUNOTA-LOCAL-QR-TEST'),size=qr.modules.size;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(qr.modules.get(y,x))context.fillRect(160+x*8,80+y*8,8,8);
  }
  const source=canvas.captureStream(5),track=source.getVideoTracks()[0],stop=track.stop.bind(track);
  track.stop=()=>{stopped++;stop();};
  return source;
} });
let hidden=false;
document.addEventListener('keydown',event=>{if(event.key==='F8'){hidden=!hidden;Object.defineProperty(document,'hidden',{configurable:true,value:hidden});document.dispatchEvent(new Event('visibilitychange'));}});
function App(){
  const [open,setOpen]=useState(false),[result,setResult]=useState(''),[stats,setStats]=useState('');
  const launch=(selected:typeof mode)=>{mode=selected;calls=0;setResult('');setOpen(true);};
  return <main className="space-y-4 p-5 text-fg"><h1 className="text-xl font-bold">Uji Kamera Lokal</h1>
    <button onClick={()=>launch('qr')}>Uji QR</button>{' · '}
    <button onClick={()=>launch('ean')}>Uji Barcode</button>{' · '}
    <button onClick={()=>launch('retry')}>Uji Izin Kamera</button>
    <button onClick={()=>launch('resume')}>Uji Kembali ke Aplikasi</button><button onClick={()=>launch('timeout')}>Uji Kamera Tidak Merespons</button><p>F8: sembunyikan atau buka kembali aplikasi uji</p><p role="status">{result}</p><p>{stats}</p>
    <BarcodeCameraModal isOpen={open} onScan={value=>setResult('Kode terbaca: '+value)} onClose={()=>{setOpen(false);setStats('Kamera dihentikan: '+stopped);}} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
