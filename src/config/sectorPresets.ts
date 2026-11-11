import { SectorId, CalcMode, ChecklistItem } from '../types/titan';
import { PaymentPlanTemplate } from '../types/furniture';

export interface SectorFeatureFlags {
  cubicCalculator: boolean;     // M1
  milestonePayments: boolean;   // M2
  quotations: boolean;          // M3
  laborContracts: boolean;      // M4
}

export const DEFAULT_FURNITURE_PAYMENT_PLAN: PaymentPlanTemplate[] = [
  { label: 'DP Awal', percent: 50, triggerStage: 'Persiapan' },
  { label: 'Termin Barang Mentah', percent: 30, triggerStage: 'Finishing' },
  { label: 'Pelunasan + Ongkir', percent: 20, triggerStage: 'Siap Kirim' },
];

export interface SectorDefinition {
  id: SectorId;
  name: string;
  icon: string; // Font Awesome class, e.g. "fa-solid fa-couch"
  defaultCalcMode: CalcMode;
  productLabel: string;
  mainMaterialLabel: string;
  auxiliaryMaterialLabel: string;
  laborLabel: string;
  overheadLabel: string;
  orderStages: string[];
  defectTypes: string[];
  defaultChecklists: Omit<ChecklistItem, 'id' | 'updatedAt'>[];
  features: SectorFeatureFlags;
  defaultPaymentPlan?: PaymentPlanTemplate[];
}

export const SECTOR_PRESETS: Record<SectorId, SectorDefinition> = {
  mebel: {
    id: 'mebel',
    name: 'Mebel & Kerajinan Kayu',
    icon: 'fa-solid fa-couch',
    defaultCalcMode: 'unit_based',
    productLabel: 'Model Mebel / Barang',
    mainMaterialLabel: 'Bahan Kayu / Papan Utama',
    auxiliaryMaterialLabel: 'Finishing, Hardware & Amplas',
    laborLabel: 'Upah Tukang (Rakit / Ukir / Finishing)',
    overheadLabel: 'Listrik Mesin, Gas & Penyusutan Alat',
    orderStages: ['Persiapan Kayu', 'Konstruksi & Rakit', 'Amplas & Finishing', 'Siap Kirim', 'Selesai'],
    features: {
      cubicCalculator: true,
      milestonePayments: true,
      quotations: true,
      laborContracts: true,
    },
    defaultPaymentPlan: DEFAULT_FURNITURE_PAYMENT_PLAN,
    defectTypes: [
      'Kayu retak / melengkung (MC tinggi)',
      'Ukuran komponen tidak presisi / miring',
      'Finishing belang / berembun / kasar',
      'Sambungan renggang / lem lepas',
      'Lecet sudut saat pengiriman',
    ],
    defaultChecklists: [
      // Level A: Audit Kesiapan Fasilitas & Titik Kritis Halal Barang Gunaan
      {
        level: 'halal_facility',
        sector: 'mebel',
        title: 'Verifikasi kuas plitur/cat bebas bulu babi (wajib sintetis/nilon atau uji bakar non-keratin)',
        isChecked: true,
      },
      {
        level: 'halal_facility',
        sector: 'mebel',
        title: 'Bahan finishing (thinner, NC/melamin) dan lem bebas dari kandungan najis/unsur hewani haram',
        isChecked: true,
      },
      {
        level: 'halal_facility',
        sector: 'mebel',
        title: 'Standar pelapis food-grade (beeswax/mineral oil) khusus produk kayu kontak makanan (woodenware)',
        isChecked: false,
      },
      {
        level: 'halal_facility',
        sector: 'mebel',
        title: 'Kebersihan area kerja bengkel (5R) bebas kontaminasi kotoran hewan atau najis',
        isChecked: true,
      },
      // Level B: Standar Operasional Prosedur (SOP) QC Harian Sebelum Kirim
      {
        level: 'daily_qc',
        sector: 'mebel',
        title: 'Pemeriksaan kekeringan kayu (Moisture Content aman) sebelum proses potong dan rakit',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'mebel',
        title: 'Pemeriksaan siku diagonal dan kekokohan konstruksi sambungan di permukaan datar',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'mebel',
        title: 'Pemeriksaan kehalusan amplas permukaan dan keseragaman warna finishing bebas bintik debu',
        isChecked: false,
      },
      {
        level: 'daily_qc',
        sector: 'mebel',
        title: 'Pemasangan pelindung sudut tebal (foam/karton) dan pembungkus sebelum kargo ekspedisi',
        isChecked: true,
      },
    ],
  },
  fnb: {
    id: 'fnb',
    name: 'Kuliner & Makanan Olahan (FnB)',
    icon: 'fa-solid fa-utensils',
    defaultCalcMode: 'batch_based',
    productLabel: 'Menu / Varian Produk',
    mainMaterialLabel: 'Bahan Baku Resep Utama',
    auxiliaryMaterialLabel: 'Bumbu, Topping & Kemasan',
    laborLabel: 'Upah Masak & Pengemasan',
    overheadLabel: 'Gas LPG, Listrik & Penyusutan Alat',
    orderStages: ['Persiapan Bahan', 'Proses Masak / Olah', 'Pengemasan & Label', 'Siap Kirim', 'Selesai'],
    features: {
      cubicCalculator: false,
      milestonePayments: false,
      quotations: false,
      laborContracts: false,
    },
    defectTypes: [
      'Adonan gagal / gosong / bantat',
      'Rasa atau warna tidak seragam antar-batch',
      'Kemasan bocor / segel kurang rapat',
      'Produk cepat melempem / tengik / berjamur',
      'Kerusakan kemasan saat pengiriman',
    ],
    defaultChecklists: [
      // Level A: Audit Kesiapan Fasilitas & Titik Kritis Halal Pangan
      {
        level: 'halal_facility',
        sector: 'fnb',
        title: 'Seluruh bahan baku, bumbu, minyak dan perisa memiliki sertifikat Halal resmi BPJPH',
        isChecked: true,
      },
      {
        level: 'halal_facility',
        sector: 'fnb',
        title: 'Peralatan masak dan tempat pencucian bebas najis serta dialiri air bersih yang suci',
        isChecked: true,
      },
      {
        level: 'halal_facility',
        sector: 'fnb',
        title: 'Higienitas pekerja (celemek, penutup kepala) dan dapur bersih bebas hama/serangga',
        isChecked: true,
      },
      {
        level: 'halal_facility',
        sector: 'fnb',
        title: 'Kelengkapan dokumen matriks bahan dan diagram alir proses untuk Self-Declare BPJPH',
        isChecked: false,
      },
      // Level B: Standar Operasional Prosedur (SOP) QC Harian Sebelum Kirim
      {
        level: 'daily_qc',
        sector: 'fnb',
        title: 'Penimbangan takaran resep baku menggunakan timbangan digital (tidak kira-kira)',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'fnb',
        title: 'Uji organoleptik (sampel rasa, aroma, kerenyahan) pada tiap batch sebelum dikemas',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'fnb',
        title: 'Pemeriksaan segel kemasan rapat (airtight) dan kode tanggal kedaluwarsa tercetak',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'fnb',
        title: 'Kerapatan paking dus/bubble wrap untuk mencegah produk hancur di perjalanan',
        isChecked: false,
      },
    ],
  },
  fashion: {
    id: 'fashion',
    name: 'Fashion, Konveksi & Batik',
    icon: 'fa-solid fa-shirt',
    defaultCalcMode: 'unit_based',
    productLabel: 'Model / Artikel Pakaian',
    mainMaterialLabel: 'Kain Utama & Furing',
    auxiliaryMaterialLabel: 'Benang, Kancing, Resleting & Kemasan',
    laborLabel: 'Upah Potong, Jahit & Obras',
    overheadLabel: 'Listrik Mesin Jahit, Setrika & Alat',
    orderStages: ['Potong Pola', 'Penjahitan & Obras', 'Finishing & Setrika', 'Siap Kirim', 'Selesai'],
    features: {
      cubicCalculator: false,
      milestonePayments: false,
      quotations: false,
      laborContracts: false,
    },
    defectTypes: [
      'Ukuran jahitan meleset dari size chart',
      'Jahitan loncat / kerut / tidak rapi',
      'Noda oli mesin / warna kain luntur',
      'Kancing atau resleting macet/lepas',
    ],
    defaultChecklists: [
      {
        level: 'halal_facility',
        sector: 'fashion',
        title: 'Pemeriksaan bahan kain dan lilin malam (batik) bebas dari lemak hewani tidak halal',
        isChecked: true,
      },
      {
        level: 'halal_facility',
        sector: 'fashion',
        title: 'Area penjahitan dan penyimpanan kain bersih bebas najis',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'fashion',
        title: 'Pemeriksaan akurasi ukuran sesuai toleransi pola/size chart',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'fashion',
        title: 'Pembersihan sisa benang (trimming) dan pengecekan fungsi resleting sebelum dikemas',
        isChecked: true,
      },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Usaha Produksi / Umum',
    icon: 'fa-solid fa-briefcase',
    defaultCalcMode: 'unit_based',
    productLabel: 'Nama Produk',
    mainMaterialLabel: 'Bahan Baku Utama',
    auxiliaryMaterialLabel: 'Bahan Penolong & Kemasan',
    laborLabel: 'Biaya Tenaga Kerja',
    overheadLabel: 'Biaya Operasional & Alat',
    orderStages: ['Persiapan Bahan', 'Pengerjaan Utama', 'Pemeriksaan Mutu', 'Siap Kirim', 'Selesai'],
    features: {
      cubicCalculator: false,
      milestonePayments: false,
      quotations: false,
      laborContracts: false,
    },
    defectTypes: [
      'Bahan baku awal cacat / rusak',
      'Spesifikasi produk tidak sesuai pesanan',
      'Kerusakan fungsi atau fisik',
      'Kemasan rusak saat pengiriman',
    ],
    defaultChecklists: [
      {
        level: 'halal_facility',
        sector: 'custom',
        title: 'Standar kebersihan fasilitas kerja dan kepatuhan bahan baku resmi',
        isChecked: true,
      },
      {
        level: 'daily_qc',
        sector: 'custom',
        title: 'Inspeksi kualitas akhir produk sebelum diserahkan ke pelanggan',
        isChecked: true,
      },
    ],
  },
};

export function getSectorFeatures(sector: SectorId): SectorFeatureFlags {
  return (
    (SECTOR_PRESETS[sector] || SECTOR_PRESETS.custom).features || {
      cubicCalculator: false,
      milestonePayments: false,
      quotations: false,
      laborContracts: false,
    }
  );
}
