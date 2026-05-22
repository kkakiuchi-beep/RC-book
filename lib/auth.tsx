"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/lib/types";

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_TIMEOUT_MS = 5_000; // Firestore 応答待ちの上限

async function fetchAppUser(uid: string, firebaseUser: User): Promise<AppUser> {
  const defaultUser: AppUser = {
    uid,
    email: firebaseUser.email ?? "",
    displayName: firebaseUser.displayName ?? "",
    photoURL: firebaseUser.photoURL,
    departmentId: null,
    departmentName: null,
    role: "staff",
    bio: null,
    instagramId: null,
    lineId: null,
    hobbies: null,
    skills: null,
    canHelp: null,
    needHelp: null,
    joinedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    // 5秒以内に応答がなければデフォルト値で続行
    const snap = await Promise.race([
      getDoc(doc(db, "users", uid)),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), DEFAULT_TIMEOUT_MS)
      ),
    ]);
    if (snap && snap.exists()) {
      const d = snap.data();
      return {
        uid,
        email: firebaseUser.email ?? "",
        displayName: firebaseUser.displayName ?? "",
        photoURL: firebaseUser.photoURL,
        departmentId: d.departmentId ?? null,
        departmentName: d.departmentName ?? null,
        role: d.role ?? "staff",
        instagramId: d.instagramId ?? null,
        lineId: d.lineId ?? null,
        bio: d.bio ?? null,
        hobbies: d.hobbies ?? null,
        skills: d.skills ?? null,
        canHelp: d.canHelp ?? null,
        needHelp: d.needHelp ?? null,
        joinedAt: d.joinedAt?.toDate() ?? null,
        createdAt: d.createdAt?.toDate() ?? new Date(),
        updatedAt: d.updatedAt?.toDate() ?? new Date(),
      };
    }
  } catch {
    // Firestore アクセス不可 / タイムアウト → デフォルト値を返す
  }
  return defaultUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase が 10 秒以内に応答しない場合は強制的にローディングを解除
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 10_000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimer);
      setUser(firebaseUser);
      if (firebaseUser) {
        const au = await fetchAppUser(firebaseUser.uid, firebaseUser);
        setAppUser(au);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    if (ALLOWED_DOMAIN) {
      provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
    }
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email ?? "";
    if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await signOut(auth);
      throw new Error("DOMAIN_MISMATCH");
    }
    // Firestore にユーザー情報を保存（初回: 作成、以降: 更新）
    try {
      const ref = doc(db, "users", result.user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(
          ref,
          {
            email: result.user.email,
            displayName: result.user.displayName ?? "",
            photoURL: result.user.photoURL ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(ref, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName ?? "",
          photoURL: result.user.photoURL ?? null,
          departmentId: null,
          departmentName: null,
          role: "staff",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      // Firestore への保存失敗はログインをブロックしない
      console.warn("Firestore user upsert failed:", e);
    }
  };

  const refreshAppUser = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const au = await fetchAppUser(currentUser.uid, currentUser);
      setAppUser(au);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signInWithGoogle, logOut, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
