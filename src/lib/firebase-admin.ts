// src/lib/firebase-admin.ts
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId = process.env.FIREBASE_PROJECT_ID || 'phrasal-tracker-2pz3c';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.projectId) {
      projectId = parsed.projectId;
    }
  }
} catch {
  // Graceful fallback
}

if (!getApps().length) {
  try {
    initializeApp({
      projectId,
    });
  } catch (err) {
    console.warn('Firebase admin initialization warning:', err);
  }
}

let authInstance: any;
try {
  authInstance = getAuth();
} catch {
  authInstance = {
    verifyIdToken: async () => {
      throw new Error('Firebase Admin Auth not available');
    },
  };
}

export const adminAuth = authInstance;
