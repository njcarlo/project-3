"use client";

import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isContributor: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);

  useEffect(() => {
    // Complete any redirect-based sign-in (used as a popup fallback, e.g. on
    // mobile). Errors here surface on the next popup attempt too.
    getRedirectResult(auth).catch(() => {});

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        const token = await nextUser.getIdTokenResult();
        setIsAdmin(token.claims.admin === true);
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  // Live-subscribe to the signed-in user's own profile for their
  // admin-controlled contributor flag (a Firestore field, not a claim).
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsContributor(false);
      return;
    }
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      const profile = snap.data() as UserProfile | undefined;
      setIsContributor(profile?.contributor === true);
    });
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin,
      isContributor,
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        // Always let the user choose which Google account to use.
        provider.setCustomParameters({ prompt: "select_account" });
        try {
          await signInWithPopup(auth, provider);
        } catch (err) {
          const code =
            typeof err === "object" && err !== null && "code" in err
              ? String((err as { code: unknown }).code)
              : "";
          // Popups are commonly blocked on mobile / in-app browsers — fall
          // back to a full-page redirect there.
          if (
            code === "auth/popup-blocked" ||
            code === "auth/operation-not-supported-in-this-environment" ||
            code === "auth/cancelled-popup-request"
          ) {
            await signInWithRedirect(auth, provider);
            return;
          }
          // A user closing the popup isn't an error worth surfacing.
          if (code === "auth/popup-closed-by-user") return;
          throw err;
        }
      },
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUpWithEmail: async (email, password) => {
        await createUserWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [user, loading, isAdmin, isContributor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
