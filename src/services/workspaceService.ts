// src/services/workspaceService.ts
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Product,
  Order,
  DefectLog,
  ChecklistItem,
  BusinessProfile,
  MockParticipantSummary,
} from '../types/titan';
import {
  Quotation,
  Craftsman,
  LaborContract,
  LaborPayment,
} from '../types/furniture';
import { MOCK_CLASS_PARTICIPANTS } from '../config/mockSeedData';

export interface WorkspaceData {
  profile: BusinessProfile;
  products: Product[];
  orders: Order[];
  defects: DefectLog[];
  checklists: ChecklistItem[];
  quotations: Quotation[];
  craftsmen: Craftsman[];
  laborContracts: LaborContract[];
  laborPayments: LaborPayment[];
  updatedAt: string;
}

/**
 * Saves user workspace data atomically to Firestore.
 */
export async function saveUserWorkspace(uid: string, data: WorkspaceData): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', uid);
    await setDoc(docRef, {
      ...data,
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save workspace to Firestore:', err);
  }
}

/**
 * Loads user workspace from Firestore.
 */
export async function loadUserWorkspace(uid: string): Promise<WorkspaceData | null> {
  try {
    const docRef = doc(db, 'workspaces', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as WorkspaceData;
    }
    return null;
  } catch (err) {
    console.error('Failed to load workspace from Firestore:', err);
    return null;
  }
}

/**
 * Synchronizes the current user's live progress to the Classroom Training collection.
 */
export async function syncClassroomParticipant(
  uid: string,
  summary: MockParticipantSummary
): Promise<void> {
  try {
    const docRef = doc(db, 'training_participants', uid);
    await setDoc(docRef, {
      ...summary,
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Failed to sync training participant:', err);
  }
}

/**
 * Subscribes to live classroom participants from Firestore.
 */
export function subscribeToClassroomParticipants(
  callback: (participants: MockParticipantSummary[]) => void
): () => void {
  const colRef = collection(db, 'training_participants');
  return onSnapshot(colRef, (snapshot) => {
    const list: MockParticipantSummary[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as MockParticipantSummary);
    });
    callback(list);
  }, (err) => {
    console.warn('Classroom listener fallback:', err);
  });
}

/**
 * Initializes the default 35 training cohort participants in Firestore if not already present.
 * Ensures the lecturer's projector screen always has permanent, editable classroom data.
 */
export async function seedClassroomCohortIfNeeded(): Promise<void> {
  try {
    const testDoc = doc(db, 'training_participants', MOCK_CLASS_PARTICIPANTS[0].id);
    const snap = await getDoc(testDoc);
    if (!snap.exists()) {
      for (const p of MOCK_CLASS_PARTICIPANTS) {
        await setDoc(doc(db, 'training_participants', p.id), {
          ...p,
          serverUpdatedAt: serverTimestamp(),
        });
      }
      console.log('Seeded 35 classroom participants to Cloud Firestore.');
    }
  } catch (err) {
    console.warn('Cohort seed skipped or offline:', err);
  }
}
