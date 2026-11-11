// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  UserProfile,
  UserRole,
  AccountStatus,
  BusinessSector,
} from '../types/account';
import {
  signInWithGoogle,
  signOutUser,
  syncUserProfile,
  updateUserProfile,
  handleRedirectResult,
} from '../services/authService';
import {
  EffectiveAccess,
  computeEffectiveAccess,
  SECTOR_PRESETS,
  SUPERADMIN_EMAIL,
} from '../config/accessControl';

interface AuthContextType {
  firebaseUser: User | null;
  user: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  access: EffectiveAccess;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: (sector?: BusinessSector) => void;
  logout: () => Promise<void>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  joinTrainingSession: (sessionCode: string) => Promise<boolean>;
  leaveTrainingSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'titan_umkm_guest_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  // Compute effective role, status, and permissions
  const access = computeEffectiveAccess(
    user?.email || firebaseUser?.email,
    user?.role,
    user?.status
  );

  // Initialize auth state and check redirect results
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    // Check if guest session previously active in localStorage
    const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest);
        setUser(guestData);
        setIsGuest(true);
      } catch {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    }

    // Check Google redirect result first
    handleRedirectResult()
      .then((redirectUser) => {
        if (redirectUser) {
          setFirebaseUser(redirectUser);
        }
      })
      .catch((err) => console.warn('Redirect check ignored:', err));

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        setFirebaseUser(currentUser);

        try {
          // Initialize or load user profile in Firestore
          const profile = await syncUserProfile(currentUser);
          setUser(profile);

          // Listen for real-time changes to user's profile/status in Firestore (e.g. Superadmin deactivation)
          const userDocRef = doc(db, 'users', currentUser.uid);
          unsubscribeFirestore = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const liveData = snap.data() as UserProfile;
              setUser(liveData);
            }
          });
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      } else {
        setFirebaseUser(null);
        // Only reset user if not in guest mode
        const currentGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (!currentGuest) {
          setUser(null);
          setIsGuest(false);
        }
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const loggedUser = await signInWithGoogle();
      setFirebaseUser(loggedUser);
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      const profile = await syncUserProfile(loggedUser);
      setUser(profile);
    } catch (err) {
      console.error('Google Sign In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = (sector: BusinessSector = 'mebel') => {
    const preset = SECTOR_PRESETS[sector] || SECTOR_PRESETS.mebel;
    const guestProfile: UserProfile = {
      uid: 'guest-' + Date.now(),
      email: 'tamu@demo.local',
      displayName: 'Tamu Evaluasi',
      businessName: 'Mebel Jepara Demo',
      ownerName: 'Tamu',
      phoneWhatsApp: '6281234567890',
      city: 'Jepara',
      sector: sector,
      sectorLabel: preset.title,
      role: 'guest',
      status: 'active',
      statusReason: 'Mode Tamu Tanpa Login',
      onboardingCompleted: true, // Bypass onboarding for instant exploration
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    setIsGuest(true);
    setUser(guestProfile);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      setIsGuest(false);
      setUser(null);
      await signOutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      ...data,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    if (isGuest) {
      setUser(updated);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    if (firebaseUser) {
      await updateUserProfile(firebaseUser.uid, {
        ...data,
        onboardingCompleted: true,
      });
      setUser(updated);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (isGuest) {
      setUser(updated);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    if (firebaseUser) {
      await updateUserProfile(firebaseUser.uid, data);
      setUser(updated);
    }
  };

  const joinTrainingSession = async (sessionCode: string): Promise<boolean> => {
    if (!sessionCode.trim()) return false;
    const code = sessionCode.trim().toUpperCase();
    await updateProfileData({
      trainingSessionId: code,
      isTrainingParticipant: true,
    });
    return true;
  };

  const leaveTrainingSession = async () => {
    await updateProfileData({
      trainingSessionId: undefined,
      isTrainingParticipant: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        isGuest,
        access,
        loginWithGoogle,
        loginAsGuest,
        logout,
        completeOnboarding,
        updateProfileData,
        joinTrainingSession,
        leaveTrainingSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
