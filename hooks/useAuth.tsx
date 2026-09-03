"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Failsafe timeout: If Firebase auth listener takes longer than 2.5s (e.g. inside sandboxed iframe),
    // release the loading screen so user can view the landing page and interact.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    // Attempt local persistence gracefully
    try {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn("Auth persistence warning (ignorable in iframe):", err);
      });
    } catch {
      // Ignored if persistence not supported
    }

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          clearTimeout(safetyTimer);
          setUser(currentUser);
          setLoading(false);
        },
        (err) => {
          clearTimeout(safetyTimer);
          console.error("Auth state error:", err);
          setError("Failed to monitor authentication state.");
          setLoading(false);
        }
      );
    } catch (e) {
      clearTimeout(safetyTimer);
      console.error("Failed to bind auth observer:", e);
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error("Sign-in error:", err);
      const message = err instanceof Error ? err.message : "Failed to sign in with Google.";
      setError(message.includes("popup-closed-by-user") 
        ? "Sign-in popup was closed. Please try again." 
        : message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: unknown) {
      console.error("Sign-out error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign out.");
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
