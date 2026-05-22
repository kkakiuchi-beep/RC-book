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
  arrayUnion,
  arrayRemove,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { createNotification } from "@/lib/notification";
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
    // チャットの最終メッセージを更新・相手の未読数を+1・自分の hiddenBy を解除
    const otherUid = chat?.memberIds.find((id) => id !== appUser.uid) ?? "";
    const otherUnread = chat?.unreadCounts[otherUid] ?? 0;
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: content.trim(),
      lastMessageAt: serverTimestamp(),
      lastMessageBy: appUser.uid,
      hiddenBy: arrayRemove(appUser.uid),
      ...(otherUid
        ? { [`unreadCounts.${otherUid}`]: otherUnread + 1 }
        : {}),
    });
    // 相手の未読が 0 → 1 になるときだけ通知（連続送信で重複させない）
    if (otherUid && otherUnread === 0) {
      await createNotification({
        userId: otherUid,
        type: "dm",
        message: `${appUser.displayName}さんからDMが届きました`,
        relatedId: chatId,
        relatedPath: `/chat/${chatId}`,
        fromUserId: appUser.uid,
        fromUserName: appUser.displayName,
        fromUserPhotoURL: appUser.photoURL ?? null,
      });
    }
  };

  /** チャットを自分の一覧から非表示にする（論理削除） */
  const deleteChat = async () => {
    if (!appUser) return;
    await updateDoc(doc(db, "chats", chatId), {
      hiddenBy: arrayUnion(appUser.uid),
    });
  };

  return { chat, messages, loading, sendMessage, deleteChat };
}
