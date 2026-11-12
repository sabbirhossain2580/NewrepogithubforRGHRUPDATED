// src/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

// Resilient Firebase config (does not crash if firebase-applet-config.json is deleted)
const firebaseConfig = {
  projectId: 'phrasal-tracker-2pz3c',
  appId: '1:850937953254:web:ef1265ca402e47d8ae8049',
  storageBucket: 'phrasal-tracker-2pz3c.appspot.com',
  apiKey: 'AIzaSyDummyKeyForAppletConfigOnly',
  authDomain: 'phrasal-tracker-2pz3c.firebaseapp.com',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();

// Scopes for Google Sheets and Google Drive integration
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

// In-memory access token cache (MANDATORY: Never store in localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let isSigningIn = false;

export const setCachedAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getCachedAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// Sign in with Google with Workspace scopes
export const signInWithGoogleWorkspace = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google OAuth access token.');
    }
    inMemoryAccessToken = credential.accessToken;
    return { user: result.user, accessToken: inMemoryAccessToken };
  } catch (error) {
    console.error('Google Sign-in with Workspace scopes failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Listener to clear token on sign-out
onAuthStateChanged(auth, (user) => {
  if (!user && !isSigningIn) {
    inMemoryAccessToken = null;
  }
});
