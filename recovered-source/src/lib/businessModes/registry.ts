export type Availability = 'available' | 'planned';

export const MODULES = {
  checkout: { availability: 'available', requires: [] },
  catalog: { availability: 'available', requires: [] },
  orders: { availability: 'available', requires: ['checkout'] },
  tables: { availability: 'available', requires: ['orders'] },
  kitchen: { availability: 'available', requires: ['orders'] },
  barcode: { availability: 'available', requires: ['catalog'] },
  inventory: { availability: 'available', requires: ['catalog'] },
  payments: { availability: 'available', requires: ['orders'] },
  splitPayment: { availability: 'available', requires: ['payments'] },
  refunds: { availability: 'available', requires: ['payments'] },
  receipts: { availability: 'available', requires: ['orders'] },
  reports: { availability: 'available', requires: ['orders'] },
  shifts: { availability: 'available', requires: ['payments'] },
  attendance: { availability: 'available', requires: [] },
  attendancePhoto: { availability: 'available', requires: ['attendance'] },
  offline: { availability: 'available', requires: [] },
  multiDevice: { availability: 'available', requires: ['offline'] },
  laundryProcessing: { availability: 'available', requires: ['orders'] },
  workOrders: { availability: 'planned', requires: ['orders'] },
  appointments: { availability: 'planned', requires: ['workOrders'] },
  rentalTimer: { availability: 'planned', requires: ['orders'] },
  booking: { availability: 'planned', requires: ['orders'] },
  voiceCashier: { availability: 'planned', requires: ['checkout'] },
} as const;

export type ModuleId = keyof typeof MODULES;

// Availability describes shipped code, not device authorization or connectivity.
// These capabilities never grant an employee permissions or activate a license.
export const SHARED_MODULES = [
  'checkout', 'catalog', 'orders', 'payments', 'splitPayment', 'refunds',
  'receipts', 'reports', 'shifts', 'attendance', 'attendancePhoto', 'offline', 'multiDevice',
] as const satisfies readonly ModuleId[];

export const WORKFLOWS = {
  quickSale: { availability: 'available', modules: ['checkout', 'catalog', 'orders'] },
  foodOrders: { availability: 'available', modules: ['checkout', 'catalog', 'orders', 'kitchen'] },
  retailSale: { availability: 'available', modules: ['checkout', 'catalog', 'orders', 'barcode', 'inventory'] },
  serviceCheckout: { availability: 'available', modules: ['checkout', 'catalog', 'orders'] },
  rentalOrder: { availability: 'planned', modules: ['checkout', 'orders', 'rentalTimer', 'booking'] },
} as const satisfies Record<string, { availability: Availability; modules: readonly ModuleId[] }>;

export const MODES = {
  quick: { label: 'Kasir Cepat', availability: 'available', workflow: 'quickSale' },
  food: { label: 'Kuliner (F&B)', availability: 'available', workflow: 'foodOrders' },
  retail: { label: 'Toko & Retail', availability: 'available', workflow: 'retailSale' },
  service: { label: 'Jasa & Servis', availability: 'available', workflow: 'serviceCheckout' },
  rental: { label: 'Rental', availability: 'planned', workflow: 'rentalOrder' },
} as const satisfies Record<string, { label: string; availability: Availability; workflow: keyof typeof WORKFLOWS }>;

export type ModeId = keyof typeof MODES;

export const PRESETS = {
  warung: { mode: 'food', availability: 'available', modules: [] },
  kafe: { mode: 'food', availability: 'available', modules: ['tables'] },
  restoran: { mode: 'food', availability: 'available', modules: ['tables'] },
  retail: { mode: 'retail', availability: 'available', modules: [] },
  gerobak: { mode: 'quick', availability: 'available', modules: [] },
  jasaUmum: { mode: 'service', availability: 'available', modules: [] },
  laundry: { mode: 'service', availability: 'available', modules: ['laundryProcessing'] },
  bengkel: { mode: 'service', availability: 'planned', modules: ['inventory'] },
  salon: { mode: 'service', availability: 'planned', modules: ['appointments'] },
  carWash: { mode: 'service', availability: 'planned', modules: [] },
  servisAcElektronik: { mode: 'service', availability: 'planned', modules: [] },
  reparasiHp: { mode: 'service', availability: 'planned', modules: [] },
  bimbel: { mode: 'service', availability: 'planned', modules: ['appointments'] },
  rentalPs: { mode: 'rental', availability: 'planned', modules: [] },
  biliar: { mode: 'rental', availability: 'planned', modules: [] },
  lapangan: { mode: 'rental', availability: 'planned', modules: ['booking'] },
  rentalBarang: { mode: 'rental', availability: 'planned', modules: [] },
} as const satisfies Record<string, { mode: ModeId; availability: Availability; modules: readonly ModuleId[] }>;

export type PresetId = keyof typeof PRESETS;

// Category names may be selected independently of specialized workflows.
export const SERVICE_CATEGORIES = {
  laundry: 'Laundry',
  bengkel: 'Bengkel',
  salon: 'Barbershop / Salon',
  carWash: 'Cuci Kendaraan',
  servisAcElektronik: 'Servis AC / Elektronik',
  reparasiHp: 'Reparasi HP',
  bimbel: 'Bimbel / Les',
  jasaUmum: 'Jasa Lainnya',
} as const;

export type ServiceCategory = keyof typeof SERVICE_CATEGORIES;

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && Object.hasOwn(SERVICE_CATEGORIES, value);
}
