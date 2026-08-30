import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

// Safe initialization with config fallback
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: firebaseConfigData.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: firebaseConfigData.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: firebaseConfigData.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: firebaseConfigData.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: firebaseConfigData.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfigData.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;
