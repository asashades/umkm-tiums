// src/types/account.ts
// Type definitions for User Account, Roles, Subscription Status, Onboarding, and Classroom Training

export type UserRole = 'superadmin' | 'admin' | 'user' | 'guest';

export type AccountStatus = 'active' | 'trial' | 'inactive';

export type BusinessSector = 'mebel' | 'fnb' | 'fashion' | 'custom';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  businessName: string;
  ownerName: string;
  phoneWhatsApp: string; // e.g. 628123456789
  city: string;
  sector: BusinessSector;
  sectorLabel: string;
  role: UserRole;
  status: AccountStatus;
  statusReason?: string;
  onboardingCompleted: boolean;
  createdAt: string; // ISO 8601
  lastLoginAt: string; // ISO 8601
  updatedAt?: string;
  // Classroom Training Mode Link
  trainingSessionId?: string;
  isTrainingParticipant?: boolean;
}

export interface TrainingSession {
  id: string; // Document ID / Session Code e.g. JEPARA-2026
  title: string; // e.g. Pelatihan UMKM Mebel Jepara 2026
  sessionCode: string; // Kode Sesi untuk join cepat
  lecturerEmail: string; // asa482@ums.ac.id
  lecturerName: string;
  targetSector: BusinessSector;
  isActive: boolean;
  createdAt: string;
  notes?: string;
}

export interface ClassroomParticipantProgress {
  uid: string;
  participantName: string;
  businessName: string;
  sector: BusinessSector;
  stage: number; // 1: Input Bahan & Tukang, 2: Buat SPK Borongan, 3: QC & Lolos, 4: Rapor Keuangan
  stageLabel: string;
  productCount: number;
  contractCount: number;
  qcPassedCount: number;
  totalHppCalculated: number;
  needsAssistance: boolean;
  assistanceMessage?: string;
  lastActiveAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: 'UPDATE_STATUS' | 'PROMOTE_ADMIN' | 'REVOKE_ADMIN' | 'DELETE_USER' | 'SYSTEM_INIT';
  targetUid: string;
  targetEmail: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
}

export interface SectorPresetInfo {
  id: BusinessSector;
  title: string;
  subtitle: string;
  icon: string;
  badgeText: string;
  description: string;
  features: string[];
  materialsSample: string[];
}
