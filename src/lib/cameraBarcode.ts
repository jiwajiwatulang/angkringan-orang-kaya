// All decoding stays on this device. The fallback is bundled and precached by Next's offline manifest.
export const CAMERA_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'];
type NativeDetector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type NativeConstructor = {
  new(options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};

export async function createSoftwareBarcodeReader() {
  const zxing = await import('@zxing/library');
  const hints = new Map();
  hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [zxing.BarcodeFormat.EAN_13, zxing.BarcodeFormat.EAN_8, zxing.BarcodeFormat.UPC_A, zxing.BarcodeFormat.UPC_E, zxing.BarcodeFormat.CODE_128, zxing.BarcodeFormat.CODE_39, zxing.BarcodeFormat.QR_CODE, zxing.BarcodeFormat.DATA_MATRIX]);
  hints.set(zxing.DecodeHintType.TRY_HARDER, true);
  const readers = [new zxing.MultiFormatOneDReader(hints), new zxing.QRCodeReader(), new zxing.DataMatrixReader()];
  return (pixels: Uint8ClampedArray, width: number, height: number): string | null => {
    const luminance = new Uint8ClampedArray(width * height);
    for (let i = 0; i < luminance.length; i++) {
      const offset = i * 4;
      luminance[i] = (pixels[offset] + 2 * pixels[offset + 1] + pixels[offset + 2]) / 4;
    }
    const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(new zxing.RGBLuminanceSource(luminance, width, height)));
    for (const reader of readers) {
      try { return reader.decode(bitmap, hints).getText(); }
      catch (error) {
        if (!(error instanceof zxing.NotFoundException || error instanceof zxing.ChecksumException || error instanceof zxing.FormatException)) throw error;
      } finally { reader.reset(); }
    }
    return null;
  };
}

export async function createCameraBarcodeReader(Detector = (globalThis as typeof globalThis & { BarcodeDetector?: NativeConstructor }).BarcodeDetector) {
  let native: NativeDetector | null = null;
  try {
    const supported = await Detector?.getSupportedFormats();
    if (Detector && CAMERA_FORMATS.every(format => supported?.includes(format))) native = new Detector({ formats: CAMERA_FORMATS });
  } catch { /* Unsupported native formats use the bundled reader instead. */ }
  let software = native ? null : await createSoftwareBarcodeReader();
  let canvas: HTMLCanvasElement | null = null;
  return async (video: HTMLVideoElement): Promise<string | null> => {
    if (native) {
      try { return (await native.detect(video)).find(result => result.rawValue)?.rawValue || null; }
      catch { native = null; software = await createSoftwareBarcodeReader(); }
    }
    if (!video.videoWidth || !video.videoHeight) return null;
    canvas ||= document.createElement('canvas');
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !software) throw new Error('Camera frame unavailable');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return software(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  };
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error || (error && typeof error === 'object' && 'name' in error) ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Izinkan kamera untuk SakuNota melalui pengaturan izin aplikasi atau browser, lalu coba lagi.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Kamera tidak ditemukan. Gunakan perangkat yang memiliki kamera.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Kamera sedang digunakan. Tutup aplikasi kamera lain, lalu coba lagi.';
  return 'Kamera belum dapat dibuka. Coba lagi atau masukkan kode barang.';
}
