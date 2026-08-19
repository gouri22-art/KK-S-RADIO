import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
    }
  }
}
testConnection();

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function ensureAuthUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Silent auth fallback:', err);
    return null;
  }
}

export interface FavoriteSong {
  userId: string;
  trackId: string;
  title: string;
  artistId: 'kk' | 'kishore';
  youtubeId: string;
  createdAt: string;
}

export async function toggleFavorite(song: {
  id: string;
  title: string;
  artistId: 'kk' | 'kishore';
  youtubeId: string;
}, isFavorited: boolean): Promise<boolean> {
  let user = auth.currentUser;
  if (!user) {
    user = await ensureAuthUser();
  }
  if (!user) return false;
  const userId = user.uid;
  const path = `users/${userId}/favorites/${song.id}`;

  try {
    if (isFavorited) {
      await deleteDoc(doc(db, 'users', userId, 'favorites', song.id));
      return false;
    } else {
      const payload: FavoriteSong = {
        userId,
        trackId: song.id,
        title: song.title,
        artistId: song.artistId,
        youtubeId: song.youtubeId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userId, 'favorites', song.id), payload);
      return true;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return isFavorited;
  }
}

export function subscribeToFavorites(
  userId: string,
  onUpdate: (favorites: Record<string, FavoriteSong>) => void
) {
  const colRef = collection(db, 'users', userId, 'favorites');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const favs: Record<string, FavoriteSong> = {};
      snapshot.forEach((d) => {
        favs[d.id] = d.data() as FavoriteSong;
      });
      onUpdate(favs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/favorites`);
    }
  );
}

export async function saveUserPreferences(prefs: { defaultStation: 'kk' | 'kishore'; volume: number }) {
  const user = auth.currentUser;
  if (!user) return;
  const userId = user.uid;
  const path = `users/${userId}/preferences/settings`;
  try {
    await setDoc(doc(db, 'users', userId, 'preferences', 'settings'), {
      userId,
      defaultStation: prefs.defaultStation,
      volume: prefs.volume,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export { onAuthStateChanged };
export type { User };
