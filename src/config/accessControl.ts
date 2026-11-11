// src/config/accessControl.ts
// Single source of truth for Role-Based Access Control and Support Contacts

import { UserRole, AccountStatus, BusinessSector, SectorPresetInfo } from '../types/account';

// Superadmin email verified and locked
export const SUPERADMIN_EMAIL = 'asa482@ums.ac.id';

// Official Admin WhatsApp Support Contact
export const ADMIN_PHONE_RAW = '6285196436006';
export const ADMIN_PHONE_DISPLAY = '+6285196436006';
export const ADMIN_WA_LINK = `https://wa.me/${ADMIN_PHONE_RAW}?text=${encodeURIComponent(
  'Halo Admin TITAN UMKM, saya ingin mengaktifkan akun / memperpanjang langganan usaha saya.'
)}`;

export function getActivationWaLink(businessName: string, email: string): string {
  const text = `Halo Admin TITAN UMKM, saya pemilik usaha "${businessName || '-'}" (${email}) ingin mengajukan aktivasi / perpanjangan akun aplikasi TITAN UMKM. Mohon bantuannya.`;
  return `https://wa.me/${ADMIN_PHONE_RAW}?text=${encodeURIComponent(text)}`;
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}

export interface EffectiveAccess {
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canAccessAdminConsole: boolean;
  canManageUsers: boolean;
  canManageAdmins: boolean;
  canWrite: boolean; // False if account is inactive
  status: AccountStatus;
  isReadOnly: boolean;
}

export function computeEffectiveAccess(
  email?: string | null,
  role: UserRole = 'user',
  status: AccountStatus = 'active'
): EffectiveAccess {
  const isSuper = isSuperAdminEmail(email) || role === 'superadmin';
  const isAdmin = isSuper || role === 'admin';

  // Superadmin always has full write access regardless of status
  const canWrite = isSuper ? true : status === 'active' || status === 'trial';

  return {
    role: isSuper ? 'superadmin' : role,
    isSuperAdmin: isSuper,
    isAdmin,
    canAccessAdminConsole: isAdmin,
    canManageUsers: isAdmin,
    canManageAdmins: isSuper, // Only superadmin can promote/demote admins
    canWrite,
    status: isSuper ? 'active' : status,
    isReadOnly: !canWrite,
  };
}

export const SECTOR_PRESETS: Record<BusinessSector, SectorPresetInfo> = {
  mebel: {
    id: 'mebel',
    title: 'Mebel & Kerajinan Kayu',
    subtitle: 'Kayu Solid, Mahoni, Teak & Rotan',
    icon: 'fa-chair',
    badgeText: 'Paling Populer di Jepara',
    description: 'Didesain khusus untuk siklus produksi mebel: SPK Tukang Borongan, Kasbon bertahap, QC 14 Cacat Kayu, dan Rapor Laba Bersih Riil.',
    features: [
      'Preset Kayu Solid (Jati, Mahoni, Sungkai, Mindi, Rotan)',
      'SPK Borongan Tukang (Konstruksi, Ukir, Amplas, Finishing)',
      'Manajemen Kasbon & QC Lolos Bertahap',
      'Rapor Laba Bersih Riil (Selisih Upah Standar vs Riil)',
    ],
    materialsSample: ['Kayu Jati Log/Papan', 'Kayu Mahoni Perhutani', 'Amplas Roll #120-#400', 'Cat Melamin/Politur', 'Sekrup & Lem Epoxy'],
  },
  fnb: {
    id: 'fnb',
    title: 'Kuliner & F&B',
    subtitle: 'Resto, Kafe, Katering & Bakery',
    icon: 'fa-utensils',
    badgeText: 'Perputaran Cepat',
    description: 'Fokus pada HPP Resep Makanan/Minuman, bahan baku mudah basi (yield & waste factor), dan pencatatan kas harian.',
    features: [
      'Kalkulator HPP Porsi & Resep',
      'Waste Factor & Susut Bahan Segar',
      'Target Margin 50-70%',
      'Cek Stok Harian Bahan Basah & Kering',
    ],
    materialsSample: ['Beras / Tepung Terigu', 'Minyak Goreng Sawit', 'Daging Ayam / Sapi', 'Bumbu Dapur Segar', 'Kemasan Paper Box / Cup'],
  },
  fashion: {
    id: 'fashion',
    title: 'Fashion, Konveksi & Batik',
    subtitle: 'Batik Tulis/Cap, Garmen & Hijab',
    icon: 'fa-shirt',
    badgeText: 'Tradisional & Modern',
    description: 'Didesain untuk konveksi pakaian, batik motif, penjahit, dan bordir dengan perhitungan ongkos jahit per potong (makloon).',
    features: [
      'Kalkulator Bahan Kain per Meter / Yard',
      'Ongkos Jahit Makloon & Potong Pola',
      'QC Jahitan & Warna Batik',
      'Manajemen Ukuran (S, M, L, XL, All Size)',
    ],
    materialsSample: ['Kain Katun Primisima', 'Kain Rayon / Viscose', 'Malam / Lilin Batik', 'Benang Jahit & Kancing', 'Pewarna Remasol / Indigosol'],
  },
  custom: {
    id: 'custom',
    title: 'Usaha Lainnya / Custom',
    subtitle: 'Jasa, Bengkel, Percetakan, dll.',
    icon: 'fa-shapes',
    badgeText: 'Fleksibel',
    description: 'Format universal dengan kalkulator HPP bahan baku, tenaga kerja langsung, dan overhead yang dapat disesuaikan bebas.',
    features: [
      'Struktur HPP Standar (Bahan + Upah + Overhead)',
      'Target Laba Bebas (Markup %)',
      'Laporan Kas & Laba Rugi Sederhana',
      'Cocok untuk Segala Bidang Usaha Mikro',
    ],
    materialsSample: ['Bahan Utama', 'Bahan Penolong', 'Kemasan / Packaging'],
  },
};
