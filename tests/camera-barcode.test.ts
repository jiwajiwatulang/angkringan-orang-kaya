import assert from 'node:assert/strict';
import test from 'node:test';
import QRCode from 'qrcode';
import { CAMERA_FORMATS, cameraErrorMessage, createCameraBarcodeReader, createSoftwareBarcodeReader } from '../src/lib/cameraBarcode';
import { sameBarcode } from '../src/lib/productReference';

function rgba(width: number, height: number, black: (x: number, y: number) => boolean) {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (black(x,y)) { const i=(y*width+x)*4; pixels[i]=pixels[i+1]=pixels[i+2]=0; }
  return pixels;
}

test('camera fallback decodes actual QR pixels without native BarcodeDetector or network calls', async () => {
  const qr = QRCode.create('SAKUNOTA-LOCAL-QR-TEST'); const size=qr.modules.size, scale=6, width=(size+8)*scale;
  const pixels=rgba(width,width,(x,y)=>{ const a=Math.floor(x/scale)-4,b=Math.floor(y/scale)-4;return a>=0&&b>=0&&a<size&&b<size&&Boolean(qr.modules.get(b,a)); });
  const read=await createSoftwareBarcodeReader();
  assert.equal(read(pixels,width,width),'SAKUNOTA-LOCAL-QR-TEST');
  assert.equal(read(new Uint8ClampedArray(width*width*4).fill(255),width,width),null);
  assert.equal(read(pixels,width,width),'SAKUNOTA-LOCAL-QR-TEST', 'empty frames do not break the next scan');
});

test('camera fallback decodes EAN-13 product barcode pixels', async () => {
  const left=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const right=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  const code='0089686010947'; // First digit 0 means all six left digits use L parity.
  const bars='101'+code.slice(1,7).split('').map(n=>left[Number(n)]).join('')+'01010'+code.slice(7).split('').map(n=>right[Number(n)]).join('')+'101';
  const scale=4,width=(bars.length+24)*scale,height=200;
  const pixels=rgba(width,height,(x,y)=>y>=20&&y<180&&bars[Math.floor(x/scale)-12]==='1');
  const read=await createSoftwareBarcodeReader(); assert.ok(sameBarcode(read(pixels,width,height) || '',code));
});

test('native detection is used only after all required formats have been checked', async () => {
  let configured: string[]=[];
  class Detector {
    static async getSupportedFormats(){ return CAMERA_FORMATS; }
    constructor(options:{formats:string[]}){configured=options.formats;}
    async detect(){return [{rawValue:'0089686010947'}];}
  }
  const read=await createCameraBarcodeReader(Detector);
  assert.deepEqual(configured,CAMERA_FORMATS);
  assert.equal(await read({} as HTMLVideoElement),'0089686010947');
  let constructed=false;
  class PartialDetector extends Detector {
    static async getSupportedFormats(){return ['qr_code'];}
    constructor(options:{formats:string[]}){super(options);constructed=true;}
  }
  const fallback=await createCameraBarcodeReader(PartialDetector);
  assert.equal(constructed,false); assert.equal(await fallback({videoWidth:0,videoHeight:0} as HTMLVideoElement),null);
});

test('native format query failure falls back; camera errors give actionable messages', async () => {
  class BrokenDetector {
    static async getSupportedFormats():Promise<string[]>{throw new Error('unsupported');}
    async detect(){return [];}
  }
  const read=await createCameraBarcodeReader(BrokenDetector);
  assert.equal(await read({videoWidth:0,videoHeight:0} as HTMLVideoElement),null);
  assert.match(cameraErrorMessage({name:'NotAllowedError'}),/Izinkan kamera/);
  assert.match(cameraErrorMessage({name:'NotReadableError'}),/sedang digunakan/);
  assert.match(cameraErrorMessage({name:'NotFoundError'}),/tidak ditemukan/);
});

test('native runtime failure recovers with software decoding on the same frame', async () => {
  const qr=QRCode.create('FALLBACK-AFTER-NATIVE-ERROR'),size=qr.modules.size,scale=6,width=(size+8)*scale;
  const pixels=rgba(width,width,(x,y)=>{const a=Math.floor(x/scale)-4,b=Math.floor(y/scale)-4;return a>=0&&b>=0&&a<size&&b<size&&Boolean(qr.modules.get(b,a));});
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:()=>{},getImageData:()=>({data:pixels})})})}});
  class Detector {
    static async getSupportedFormats(){return CAMERA_FORMATS;}
    async detect():Promise<{rawValue:string}[]>{throw new Error('Native decoder unavailable');}
  }
  try {
    const read=await createCameraBarcodeReader(Detector);
    assert.equal(await read({videoWidth:width,videoHeight:width} as HTMLVideoElement),'FALLBACK-AFTER-NATIVE-ERROR');
    assert.equal(await read({videoWidth:width,videoHeight:width} as HTMLVideoElement),'FALLBACK-AFTER-NATIVE-ERROR');
  } finally {if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});
