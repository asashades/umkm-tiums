import { OrderStage } from './titan';

// ==========================================
// M1: KUBIKASI KAYU & DAFTAR POTONG
// ==========================================
export interface WoodCutPiece {
  id: string;
  label?: string;        // "Kaki belakang"
  thicknessCm: number;   // Tebal (cm)
  widthCm: number;       // Lebar (cm)
  lengthCm: number;      // Panjang (cm)
  qty: number;           // Jumlah batang
}

// ==========================================
// M2: TERMIN PEMBAYARAN 3 TAHAP
// ==========================================
export type PaymentMethod = 'Tunai' | 'Transfer' | 'QRIS';

export interface PaymentRecord {
  id: string;
  date: string;          // ISO date (YYYY-MM-DD)
  amount: number;        // > 0
  method: PaymentMethod;
  note?: string;
}

export interface PaymentPlanTemplate {
  label: string;         // "DP Awal", "Termin Barang Mentah", dll
  percent: number;       // 1..100, total seluruh termin = 100
  triggerStage: Exclude<OrderStage, 'Selesai' | 'Dibatalkan'>;
}

export type MilestoneStatus = 'Lunas' | 'Kurang Bayar' | 'Perlu Ditagih' | 'Belum Waktunya';

export interface MilestoneView extends PaymentPlanTemplate {
  index: number;
  amount: number;           // nominal termin (termin terakhir sudah + customFee)
  includesCustomFee: boolean;
  paidAmount: number;       // hasil alokasi FIFO
  outstanding: number;      // amount - paidAmount
  isDue: boolean;
  status: MilestoneStatus;
}

// ==========================================
// M3: SURAT PENAWARAN HARGA (QUOTATION)
// ==========================================
export interface QuotationItemSpec {
  woodType?: string;        // "Jati Perhutani Grade A"
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  finishing?: string;       // "Melamin doff natural"
  notes?: string;
}

export interface QuotationItem {
  id: string;
  productId: string;        // WAJIB merujuk katalog HPP
  productNameSnapshot: string;
  qty: number;
  unitPrice: number;
  baseHppAtQuote: number;   // dikunci saat item disimpan
  safeHppAtQuote: number;   // dikunci saat item disimpan
  spec: QuotationItemSpec;
}

export type QuotationStatus = 'Draft' | 'Terkirim' | 'Disetujui' | 'Ditolak' | 'Kedaluwarsa';

export interface Quotation {
  id: string;
  quoteNumber: string;      // "QUO-202611-001"
  customerName: string;
  customerPhone: string;    // "62812..."
  items: QuotationItem[];
  customFee: number;
  customFeeNote?: string;
  leadTimeWeeks: number;    // 1..52
  validUntil: string;       // YYYY-MM-DD
  paymentPlan: PaymentPlanTemplate[];
  notes?: string;
  createdAt: string;
  sentAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  convertedOrderId?: string;
}

// ==========================================
// M4: BORONGAN & KASBON TUKANG
// ==========================================
export type CraftsmanSpecialty = 'Rakit/Konstruksi' | 'Ukir' | 'Amplas/Finishing' | 'Lainnya';

export interface Craftsman {
  id: string;
  name: string;
  phone?: string;
  specialty: CraftsmanSpecialty;
  isActive: boolean;
  createdAt: string;
}

export interface LaborContract {
  id: string;
  orderId: string;
  orderNumberSnapshot: string;
  craftsmanId: string;
  craftsmanNameSnapshot: string;
  scope: string;            // "Rakit 6 kursi makan"
  agreedAmount: number;     // nilai borongan
  deductionAmount: number;  // potongan, default 0
  deductionNote?: string;
  createdAt: string;
  qcPassedAt?: string;
  cancelledAt?: string;
  closeNote?: string;       // wajib saat "Tutup Borongan Sebagian"
}

export type LaborPaymentType = 'kasbon' | 'pelunasan';

export interface LaborPayment {
  id: string;
  contractId: string;
  craftsmanId?: string;
  date: string;             // YYYY-MM-DD
  amount: number;           // > 0
  type: LaborPaymentType;
  note?: string;
}

export type LaborContractStatus = 'Berjalan' | 'Siap Dilunasi' | 'Lunas' | 'Dibatalkan';
