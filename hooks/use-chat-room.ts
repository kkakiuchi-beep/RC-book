"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Chat, ChatMessage } from "@/lib/types";

export function useChatRoom(chatId: string) {
  const { appUser } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // チャット情報をリアルタイム取得
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setChat({
          id: snap.id,
          memberIds: data.memberIds as string[],
          memberNames: data.memberNames as Record<string, string>,
          memberPhotoURLs: data.memberPhotoURLs as Record<string, string | null>,
          lastMessage: (data.lastMessage as string) ?? "",
          lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate() ?? new Date(),
          lastMessageBy: (data.lastMessageBy as string) ?? "",
          unreadCounts: (data.unreadCounts as Record<string, number>) ?? {},
          createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        });
      }
    });
    return unsub;
  }, [chatId]);

  // メッセージをリアルタイム取得
  useEffect(() => {
    const q = query(
      collection(db, "chatMessages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              chatId: data.chatId as string,
              authorId: data.authorId as string,
              authorName: data.authorName as string,
              authorPhotoURL: (data.authorPhotoURL as string | null) ?? null,
              content: data.content as string,
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            } as ChatMessage;
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("useChatRoom messages:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [chatId]);

  /** 既読にする */
  const markRead = useCallback(async () => {
    if (!appUser) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`unreadCounts.${appUser.uid}`]: 0,
      });
    } catch { /* ignore */ }
  }, [chatId, appUser]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  /** メッセージ送信 */
  const sendMessage = async (content: string) => {
    if (!appUser || !content.trim()) return;
    await addDoc(collection(db, "chatMessages"), {
      chatId,
      authorId: appUser.uid,
      authorName: appUser.displayName,
      authorPhotoURL: appUser.photoURL ?? null,
      content: content.trim(),
      createdAt: serverTimestamp(),
    });
    // チャットの最終メッセージを更新・相手の未読数を+1
    const otherUid = chat?.memberIds.find((id) => id !== appUser.uid) ?? "";
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: content.trim(),
      lastMessageAt: serverTimestamp(),
      lastMessageBy: appUser.uid,
      ...(otherUid
        ? { [`unreadCounts.${otherUid}`]: (chat?.unreadCounts[otherUid] ?? 0) + 1 }
        : {}),
    });
  };

  return { chat, messages, loading, sendMessage };
}
