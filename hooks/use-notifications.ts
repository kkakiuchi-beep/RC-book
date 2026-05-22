"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Notification } from "@/lib/types";

function showDesktopNotification(n: Notification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notif = new Notification(n.fromUserName, {
    body: n.message,
    icon: "/company-logo.png",
    tag: n.id, // 同じ ID が来ても重複しない
  });
  notif.onclick = () => {
    window.focus();
    window.location.href = n.relatedPath;
  };
}

export function useNotifications() {
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>("default");

  // パーミッション状態を初期化
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setDesktopPermission(Notification.permission);
    }
  }, []);

  // デスクトップ通知の許可をリクエスト
  const requestDesktopPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setDesktopPermission(result);
  };

  // 初回ロード時の既存通知 ID を記憶（これらには通知しない）
  const isInitialLoad = useRef(true);
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!appUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", appUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => {
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
        });

        // 新しい順にソートして最大50件
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (isInitialLoad.current) {
          // 初回: 既存通知を「既知」として記録するだけ（デスクトップ通知は出さない）
          items.forEach((n) => knownIds.current.add(n.id));
          isInitialLoad.current = false;
        } else {
          // 2回目以降: 新着の未読だけデスクトップ通知
          const newUnread = items.filter(
            (n) => !knownIds.current.has(n.id) && !n.isRead
          );
          items.forEach((n) => knownIds.current.add(n.id));
          newUnread.forEach(showDesktopNotification);
        }

        setNotifications(items.slice(0, 50));
        setLoading(false);
      },
      (err) => {
        console.error("[通知] 読み取りエラー:", err);
        setFetchError(err.message ?? "不明なエラー");
        setLoading(false);
      }
    );
    return unsub;
  }, [appUser?.uid]);

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

  return {
    notifications,
    loading,
    fetchError,
    unreadCount,
    desktopPermission,
    requestDesktopPermission,
    markAsRead,
    markAllAsRead,
  };
}
