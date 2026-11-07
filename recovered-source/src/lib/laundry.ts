export const laundryStages = ['received', 'processing', 'ready', 'collected'] as const;
export type LaundryStage = typeof laundryStages[number];
export const laundryLabels: Record<LaundryStage, string> = {received:'Diterima',processing:'Diproses',ready:'Siap Diambil',collected:'Sudah Diambil'};
export function isLaundry(settings: {businessType?:string;serviceCategory?:string}) {
  return settings.businessType === 'service' && settings.serviceCategory === 'laundry';
}
export function validateLaundry(order: {serviceCategory?:string;pickupDate?:string;customerName?:string|null;customerPhone?:string|null;tableId?:unknown}) {
  if (order.serviceCategory !== 'laundry') return;
  if (!order.customerName?.trim()) throw new Error('Isi nama pelanggan');
  if (!order.pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(order.pickupDate) || !Number.isFinite(Date.parse(order.pickupDate)) || new Date(order.pickupDate).toISOString().slice(0,10)!==order.pickupDate) throw new Error('Pilih tanggal selesai');
  if (order.tableId) throw new Error('Pesanan Laundry tidak menggunakan meja');
  if (order.customerPhone && !/^[+\d ()-]{6,20}$/.test(order.customerPhone)) throw new Error('Nomor WhatsApp tidak valid');
}
export function validateLaundryTransition(order: {serviceCategory?:string;status:string;remainingBalance?:number;isRefunded?:boolean}, previous: LaundryStage, next: LaundryStage) {
  if(order.serviceCategory!=='laundry'||order.status==='void'||order.isRefunded) throw new Error('Pesanan sudah tidak tersedia');
  if(laundryStages.indexOf(next)!==laundryStages.indexOf(previous)+1) throw new Error('Status pesanan berubah. Perbarui lalu coba lagi');
  if(next==='collected'&&(order.status!=='paid'||Number(order.remainingBalance||0)>0)) throw new Error('Lunasi pesanan sebelum diambil');
}
