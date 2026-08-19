import { initializeApp, FirebaseError } from 'firebase/app';
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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with resilient persistent multi-tab cache and auto long-polling
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

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
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Gracefully handle temporary offline / connectivity latency
  if (
    errorMessage.includes('unavailable') ||
    errorMessage.includes('client is offline') ||
    errorMessage.includes('network')
  ) {
    console.debug('Firestore connectivity status: operating in offline-first mode, sync queued.');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore notice: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function loginWithGoogle(): Promise<{
  user: User | null;
  error?: string;
  errorCode?: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        return { user: null };
      }
      return {
        user: null,
        error: error.message,
        errorCode: error.code,
      };
    }
    return {
      user: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Logout notice:', error);
  }
}

export async function ensureAuthUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    // Non-blocking fallback
    console.debug('Anonymous auth note:', err);
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

// Presence session interface
export interface PresenceSession {
  sessionId: string;
  isPlaying: boolean;
  station: 'kk' | 'kishore';
  lastSeen: number;
}

// Update presence in Firestore
export async function updatePresence(
  sessionId: string,
  isPlaying: boolean,
  station: 'kk' | 'kishore'
): Promise<void> {
  const path = `presence/${sessionId}`;
  try {
    await setDoc(doc(db, 'presence', sessionId), {
      sessionId,
      isPlaying,
      station,
      lastSeen: Date.now(),
    });
  } catch (err) {
    console.debug('Presence ping note:', err);
  }
}

// Remove presence on exit
export async function removePresence(sessionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'presence', sessionId));
  } catch {
    // Silently ignore on unload
  }
}

// Real-time Firestore presence subscription for live listener & online count
export function subscribeToPresence(
  onUpdate: (stats: { onlineCount: number; listeningCount: number }) => void
) {
  const colRef = collection(db, 'presence');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const now = Date.now();
      const cutoff = now - 35000; // active within last 35 seconds
      let online = 0;
      let listening = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PresenceSession;
        if (data.lastSeen && data.lastSeen >= cutoff) {
          online++;
          if (data.isPlaying) {
            listening++;
          }
        }
      });

      onUpdate({
        onlineCount: Math.max(1, online),
        listeningCount: listening,
      });
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'presence');
    }
  );
}

export { onAuthStateChanged };
export type { User };
