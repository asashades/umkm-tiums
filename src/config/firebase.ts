// src/config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'umkm-tiums.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'umkm-tiums',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'umkm-tiums.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1074450379942',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1074450379942:web:fbba1f7f208273a86fb067',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-K2T7YDE4K0',
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Enforce local persistence for seamless page refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence fallback:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const db = getFirestore(app);

// Try enabling offline persistence for Firestore; gracefully fallback if multiple tabs are open
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported by browser');
    }
  });
}
