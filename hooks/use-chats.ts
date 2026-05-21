"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  doc,
  getDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Chat, AppUser } from "@/lib/types";

function chatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("__");
}

export function useChats() {
  const { appUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("memberIds", "array-contains", appUser.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChats(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              memberIds: data.memberIds as string[],
              memberNames: data.memberNames as Record<string, string>,
              memberPhotoURLs: data.memberPhotoURLs as Record<string, string | null>,
              lastMessage: (data.lastMessage as string) ?? "",
              lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate() ?? new Date(),
              lastMessageBy: (data.lastMessageBy as string) ?? "",
              unreadCounts: (data.unreadCounts as Record<string, number>) ?? {},
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            } as Chat;
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("useChats:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [appUser?.uid]); // オブジェクト参照ではなく uid で比較

  /** DM を開始（なければ作成）して chatId を返す */
  const startChat = async (other: AppUser): Promise<string> => {
    if (!appUser) throw new Error("not authenticated");
    const id = chatId(appUser.uid, other.uid);
    const ref = doc(db, "chats", id);

    // 未作成ドキュメントへの getDoc は Firestore ルールで弾かれる場合があるので try-catch
    let docExists = false;
    try {
      const snap = await getDoc(ref);
      docExists = snap.exists();
    } catch {
      // 権限エラー = ドキュメント未存在と見なして作成へ進む
      docExists = false;
    }

    if (!docExists) {
      await setDoc(ref, {
        memberIds: [appUser.uid, other.uid],
        memberNames: {
          [appUser.uid]: appUser.displayName,
          [other.uid]: other.displayName,
        },
        memberPhotoURLs: {
          [appUser.uid]: appUser.photoURL,
          [other.uid]: other.photoURL,
        },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        lastMessageBy: "",
        unreadCounts: { [appUser.uid]: 0, [other.uid]: 0 },
        createdAt: serverTimestamp(),
      });
    }
    return id;
  };

  return { chats, loading, startChat };
}
