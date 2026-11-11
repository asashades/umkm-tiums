// src/services/authService.ts
import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
  onAuthStateChanged,
  getRedirectResult,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { UserProfile, UserRole, AccountStatus, AuditLogEntry } from '../types/account';
import { SUPERADMIN_EMAIL, isSuperAdminEmail } from '../config/accessControl';

/**
 * Detects whether the current environment is an embedded in-app browser
 * (e.g., Instagram, WhatsApp, Facebook, TikTok) which often blocks Google OAuth popups.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
  return /FBAN|FBAV|Instagram|Line|MicroMessenger|WhatsApp|TikTok|musical_ly/i.test(ua);
}

/**
 * Signs in using Google OAuth Popup.
 * If popup fails due to popup blocker or mobile restrictions, falls back to signInWithRedirect.
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.warn('Popup blocked/closed, attempting redirect flow...', error);
      await signInWithRedirect(auth, googleProvider);
      // Flow redirects page, execution stops here
      throw error;
    }
    throw error;
  }
}

/**
 * Checks for any pending redirect result when app loads.
 */
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err) {
    console.error('Error handling redirect result:', err);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Loads or initializes the UserProfile in Firestore.
 * Ensures `asa482@ums.ac.id` is permanently assigned `superadmin` role and `active` status.
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const isSuper = isSuperAdminEmail(user.email);
  const now = new Date().toISOString();

  if (!snap.exists()) {
    // Brand new user registration
    const initialRole: UserRole = isSuper ? 'superadmin' : 'user';
    // During initial trial phase, all users get active access to test and evaluate the app
    const initialStatus: AccountStatus = 'active';

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Pengguna UMKM',
      photoURL: user.photoURL || undefined,
      businessName: '',
      ownerName: user.displayName || '',
      phoneWhatsApp: '',
      city: '',
      sector: 'mebel', // default preset
      sectorLabel: 'Mebel & Kerajinan Kayu',
      role: initialRole,
      status: initialStatus,
      statusReason: isSuper ? 'Superadmin Utama' : 'Uji Coba Tahap Awal',
      onboardingCompleted: false,
      createdAt: now,
      lastLoginAt: now,
    };

    await setDoc(userRef, {
      ...newProfile,
      serverCreatedAt: serverTimestamp(),
      serverLastLoginAt: serverTimestamp(),
    });

    // Write audit log for new user creation
    await recordAuditLog({
      actorUid: user.uid,
      actorEmail: user.email || '',
      actorRole: initialRole,
      action: 'SYSTEM_INIT',
      targetUid: user.uid,
      targetEmail: user.email || '',
      newValue: `Role: ${initialRole}, Status: ${initialStatus}`,
      notes: isSuper ? 'Inisialisasi Superadmin Utama UMS' : 'Pendaftaran Pengguna Baru',
    });

    return newProfile;
  }

  // Existing user
  const existingData = snap.data() as UserProfile;

  // Enforce superadmin rule: if email matches, role MUST be superadmin
  const roleToSet: UserRole = isSuper ? 'superadmin' : existingData.role || 'user';
  const statusToSet: AccountStatus = isSuper ? 'active' : existingData.status || 'active';

  const updatedProfile: UserProfile = {
    ...existingData,
    uid: user.uid,
    email: user.email || existingData.email,
    displayName: user.displayName || existingData.displayName,
    photoURL: user.photoURL || existingData.photoURL,
    role: roleToSet,
    status: statusToSet,
    lastLoginAt: now,
  };

  await updateDoc(userRef, {
    role: roleToSet,
    status: statusToSet,
    lastLoginAt: now,
    serverLastLoginAt: serverTimestamp(),
  });

  return updatedProfile;
}

/**
 * Updates user profile (used during onboarding and settings update)
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Records an entry in the centralized audit log collection in Firestore.
 */
export async function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const logsCol = collection(db, 'audit_logs');
    await addDoc(logsCol, {
      ...entry,
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
