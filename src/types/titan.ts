import { WoodCutPiece, PaymentRecord, PaymentPlanTemplate } from './furniture';

// ==========================================
// 1. TIPE KONFIGURASI & SEKTOR PRESET
// ==========================================
export type SectorId = 'mebel' | 'fnb' | 'fashion' | 'custom';
export type CalcMode = 'unit_based' | 'batch_based';
export type OrderStage = 'Persiapan' | 'Pengerjaan' | 'Finishing' | 'Siap Kirim' | 'Selesai' | 'Dibatalkan';
export type PaymentStatus = 'Belum DP' | 'DP Sebagian' | 'Lunas';
export type FishboneCategory = 'Bahan Baku' | 'Alat/Mesin' | 'Metode Kerja' | 'Tenaga Kerja' | 'Lingkungan';

export interface BusinessProfile {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  sector: SectorId;
  trainingModeEnabled: boolean; // Default: false untuk aplikasi harian, true saat pelatihan
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. MENU 1: KATALOG PRODUK & HPP-COPQ
// ==========================================
export interface MaterialItem {
  id: string;
  name: string;               // Contoh: "Kayu Jati Grade A" atau "Tepung Tengiri"
  normalizedKey: string;      // Auto-generated: "kayu_jati_grade_a__m3" (untuk sinkronisasi harga)
  category: 'main' | 'auxiliary';
  qty: number;
  unit: string;               // Contoh: "m3", "lembar", "kg", "pcs"
  unitPrice: number;
  wastagePercent: number;     // 0-99%. Aktif hanya pada mode 'unit_based' & category 'main'
  cuttingList?: WoodCutPiece[]; // M1: Daftar potong kayu
}

export interface Product {
  id: string;
  name: string;
  calcMode: CalcMode;
  outputQty: number;          // Wajib 1 jika 'unit_based', >= 1 jika 'batch_based' (porsi layak jual)
  materials: MaterialItem[];
  laborCost: number;          // Upah per unit (unit_based) atau per batch (batch_based)
  overheadCost: number;       // Listrik, gas, penyusutan alat per unit/batch
  defectRiskPercent: number;  // Cadangan risiko cacat (COPQ Buffer), misal: 5 (%)
  sellingPrice: number;       // Harga jual aktual per unit/porsi yang ditetapkan pemilik
  
  // Computed Values (Disimpan untuk mempercepat pembacaan di Portal Monitoring)
  baseHpp: number;            // HPP Dasar per unit (sebelum buffer)
  copqBufferAmount: number;   // Nominal rupiah cadangan cacat per unit
  safeHpp: number;            // HPP Riil Aman (baseHpp + copqBufferAmount)
  netProfitPerUnit: number;   // sellingPrice - safeHpp
  netMarginPercent: number;   // (netProfitPerUnit / sellingPrice) * 100
  updatedAt: string;
}

// ==========================================
// 3. MENU 2: PESANAN MULTI-ITEM (DENGAN SNAPSHOT)
// ==========================================
export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string; // Dikunci saat order dibuat
  qty: number;
  unitPriceSnapshot: number;   // Harga jual satuan saat transaksi (bisa dinego/diubah per order)
  baseHppSnapshot: number;     // WAJIB DIKUNCI: Mencegah mutasi laba masa lalu saat harga bahan naik
  laborCostSnapshot?: number;  // M4: upah standar per unit saat order dibuat
  specNote?: string;           // M3: catatan spesifikasi kustom dari penawaran
}

export interface Order {
  id: string;
  orderNumber: string;         // Contoh: "ORD-202611-001"
  customerName: string;
  customerPhone: string;       // Format: "62812..." untuk integrasi wa.me
  items: OrderItem[];
  customFee: number;           // Ongkir / Paking Ekspor (Pass-through cost, bukan laba produk)
  customFeeNote?: string;      // Contoh: "Ongkir Truk Ekspedisi Jakarta"
  dpAmount: number;            // Total uang yang sudah dibayarkan pelanggan (DP + Cicilan/Pelunasan)
  stage: OrderStage;
  paymentStatus: PaymentStatus;
  createdAt: string;           // ISO Date saat pesanan masuk
  completedAt?: string;        // ISO Date saat status diubah menjadi 'Selesai' (Acuan Laba Rugi)
  dueDate: string;             // Target selesai/kirim
  payments?: PaymentRecord[];  // M2: Riwayat pembayaran termin/cicilan
  paymentPlan?: PaymentPlanTemplate[]; // M2: Rencana termin pembayaran (default 50-30-20 mebel)
  sourceQuotationId?: string;  // M3: ID penawaran asal jika pesanan dikonversi dari penawaran
  laborFullyTracked?: boolean; // M4: True jika seluruh upah borongan pesanan ini telah dicatat
}

// ==========================================
// 4. MENU 3: KENDALI MUTU (COPQ) & CHECKLIST HALAL/QC
// ==========================================
export interface DefectLog {
  id: string;
  productId: string;
  productNameSnapshot: string;
  orderId?: string;            // Opsional: terhubung jika dicatat dari pintasan Kartu Pesanan
  orderNumberSnapshot?: string;
  date: string;                // ISO Date kejadian cacat
  defectType: string;          // Contoh: "Kayu retak / melengkung" atau "Adonan gagal / gosong"
  fishboneFactor: FishboneCategory;
  actionPlan: string;          // 1 baris tindakan korektif
  
  // Komponen Perhitungan Actual COPQ
  scrappedUnits: number;       // Jumlah unit rusak total (tidak bisa dijual)
  baseHppSnapshot: number;     // HPP dasar produk saat cacat terjadi
  reworkCost: number;          // Biaya tambahan bahan + tukang untuk perbaikan
  complaintDiscount: number;   // Potongan harga/ganti rugi ke pelanggan akibat komplain
  totalCopqLoss: number;       // (scrappedUnits * baseHppSnapshot) + reworkCost + complaintDiscount
}

export interface ChecklistItem {
  id: string;
  level: 'halal_facility' | 'daily_qc'; // Level A (Audit Berkala Halal/5R) vs Level B (SOP QC Harian)
  sector: SectorId;
  title: string;
  isChecked: boolean;
  updatedAt: string;
}

// ==========================================
// 5. MONITORING & SYNC TYPES
// ==========================================
export interface MockParticipantSummary {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  sector: SectorId;
  productCount: number;
  orderCount: number;
  defectCount: number;
  completedHomework: boolean;
  actualCopqRate: number;      // % kerugian cacat terhadap eksposur HPP
  totalRevenue: number;
  sampleProduct?: Product;     // Untuk Hot-Seat Bedah HPP
  sampleDefects?: DefectLog[];
}
