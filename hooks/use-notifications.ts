"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Notification } from "@/lib/types";

export function useNotifications() {
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", appUser.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId as string,
              type: data.type,
              message: data.message as string,
              relatedId: data.relatedId as string,
              relatedPath: data.relatedPath as string,
              fromUserId: data.fromUserId as string,
              fromUserName: data.fromUserName as string,
              fromUserPhotoURL: (data.fromUserPhotoURL as string | null) ?? null,
              isRead: (data.isRead as boolean) ?? false,
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            } as Notification;
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("useNotifications:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [appUser?.uid]); // オブジェクト参照ではなく uid で比較

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
    } catch (e) {
      console.error("markAsRead:", e);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { isRead: true });
    });
    await batch.commit();
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead };
}
