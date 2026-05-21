import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { NotificationType } from "./types";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
  relatedId: string;
  relatedPath: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhotoURL: string | null;
}

/** 自分自身への通知は作成しない */
export async function createNotification(p: CreateNotificationParams) {
  if (p.userId === p.fromUserId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      userId: p.userId,
      type: p.type,
      message: p.message,
      relatedId: p.relatedId,
      relatedPath: p.relatedPath,
      fromUserId: p.fromUserId,
      fromUserName: p.fromUserName,
      fromUserPhotoURL: p.fromUserPhotoURL ?? null,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("[通知] 作成失敗:", e);
  }
}
