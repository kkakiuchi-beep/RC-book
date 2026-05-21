"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Thread, ThreadComment, AppUser, ThreadCategory } from "@/lib/types";
import { dummyThreads, dummyThreadComments } from "@/lib/dummy-data";
import { createNotification } from "@/lib/notification";

// ── モジュールレベルキャッシュ（スレッド一覧）────────────────────
let _threadsCache: { threads: Thread[]; ts: number } | null = null;
const THREADS_TTL = 60 * 1000; // 1分

function toThread(id: string, d: Record<string, unknown>): Thread {
  return {
    id,
    authorId: d.authorId as string,
    authorName: d.authorName as string,
    authorPhotoURL: (d.authorPhotoURL as string | null) ?? null,
    isAnonymous: (d.isAnonymous as boolean) ?? false,
    category: d.category as ThreadCategory,
    title: d.title as string,
    content: d.content as string,
    isResolved: (d.isResolved as boolean) ?? false,
    commentCount: (d.commentCount as number) ?? 0,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (d.updatedAt as Timestamp)?.toDate() ?? new Date(),
  };
}

function toComment(id: string, d: Record<string, unknown>): ThreadComment {
  return {
    id,
    threadId: d.threadId as string,
    authorId: d.authorId as string,
    authorName: d.authorName as string,
    authorPhotoURL: (d.authorPhotoURL as string | null) ?? null,
    isAnonymous: (d.isAnonymous as boolean) ?? false,
    content: d.content as string,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export function useThreads() {
  const isCacheValid = _threadsCache && Date.now() - _threadsCache.ts < THREADS_TTL;

  const [threads, setThreads] = useState<Thread[]>(
    isCacheValid ? _threadsCache!.threads : dummyThreads
  );
  const [loading, setLoading] = useState(!isCacheValid);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async (force = false) => {
    if (!force && _threadsCache && Date.now() - _threadsCache.ts < THREADS_TTL) {
      setThreads(_threadsCache.threads);
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(
        query(collection(db, "threads"), orderBy("createdAt", "desc"))
      );
      if (!snap.empty) {
        const fetched = snap.docs.map((d) => toThread(d.id, d.data()));
        _threadsCache = { threads: fetched, ts: Date.now() };
        setThreads(fetched);
      }
    } catch (err) {
      console.error("useThreads:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const createThread = async (
    title: string,
    content: string,
    category: ThreadCategory,
    isAnonymous: boolean,
    appUser: AppUser,
    mentionedUserIds: string[] = []
  ) => {
    const docRef = await addDoc(collection(db, "threads"), {
      authorId: appUser.uid,
      authorName: isAnonymous ? "匿名" : appUser.displayName,
      authorPhotoURL: isAnonymous ? null : (appUser.photoURL ?? null),
      isAnonymous,
      category,
      title,
      content,
      isResolved: false,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    _threadsCache = null; // キャッシュを無効化
    await fetchThreads(true);
    // メンション通知
    for (const uid of mentionedUserIds) {
      await createNotification({
        userId: uid,
        type: "mention",
        message: `${isAnonymous ? "匿名" : appUser.displayName}さんがあなたをメンションしました`,
        relatedId: docRef.id,
        relatedPath: `/board/${docRef.id}`,
        fromUserId: appUser.uid,
        fromUserName: appUser.displayName,
        fromUserPhotoURL: appUser.photoURL,
      });
    }
  };

  return { threads, loading, error, createThread, refetch: fetchThreads };
}

export function useThread(threadId: string) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const tdoc = await getDoc(doc(db, "threads", threadId));
      if (tdoc.exists()) {
        setThread(toThread(tdoc.id, tdoc.data()));
      } else {
        setThread(dummyThreads.find((t) => t.id === threadId) ?? null);
      }

      // threadId で絞り込み → 全件取得を回避
      const csnap = await getDocs(
        query(
          collection(db, "threadComments"),
          where("threadId", "==", threadId)
        )
      );
      const fetched = csnap.docs
        .map((d) => toComment(d.id, d.data()))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      setComments(
        fetched.length > 0
          ? fetched
          : dummyThreadComments.filter((c) => c.threadId === threadId)
      );
    } catch {
      setThread(dummyThreads.find((t) => t.id === threadId) ?? null);
      setComments(dummyThreadComments.filter((c) => c.threadId === threadId));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addComment = async (
    content: string,
    isAnonymous: boolean,
    appUser: AppUser,
    mentionedUserIds: string[] = []
  ) => {
    await addDoc(collection(db, "threadComments"), {
      threadId,
      authorId: appUser.uid,
      authorName: isAnonymous ? "匿名" : appUser.displayName,
      authorPhotoURL: isAnonymous ? null : (appUser.photoURL ?? null),
      isAnonymous,
      content,
      createdAt: serverTimestamp(),
    });
    try {
      await updateDoc(doc(db, "threads", threadId), {
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch { /* ダミーデータ時は無視 */ }

    if (thread && !isAnonymous) {
      await createNotification({
        userId: thread.authorId,
        type: "thread_comment",
        message: `${appUser.displayName}さんが「${thread.title}」にコメントしました`,
        relatedId: threadId,
        relatedPath: `/board/${threadId}`,
        fromUserId: appUser.uid,
        fromUserName: appUser.displayName,
        fromUserPhotoURL: appUser.photoURL,
      });
    }
    // メンション通知
    for (const uid of mentionedUserIds) {
      await createNotification({
        userId: uid,
        type: "mention",
        message: `${isAnonymous ? "匿名" : appUser.displayName}さんがあなたをメンションしました`,
        relatedId: threadId,
        relatedPath: `/board/${threadId}`,
        fromUserId: appUser.uid,
        fromUserName: appUser.displayName,
        fromUserPhotoURL: appUser.photoURL,
      });
    }
    await fetchAll();
  };

  const toggleResolved = async () => {
    if (!thread) return;
    await updateDoc(doc(db, "threads", threadId), {
      isResolved: !thread.isResolved,
      updatedAt: serverTimestamp(),
    });
    _threadsCache = null; // 一覧キャッシュも無効化
    await fetchAll();
  };

  const deleteThread = async () => {
    await deleteDoc(doc(db, "threads", threadId));
    _threadsCache = null;
  };

  const updateThread = async (title: string, content: string) => {
    await updateDoc(doc(db, "threads", threadId), {
      title,
      content,
      updatedAt: serverTimestamp(),
    });
    _threadsCache = null;
    await fetchAll();
  };

  const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, "threadComments", commentId));
    try {
      await updateDoc(doc(db, "threads", threadId), {
        commentCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } catch { /* ダミーデータ時は無視 */ }
    await fetchAll();
  };

  return {
    thread,
    comments,
    loading,
    addComment,
    toggleResolved,
    deleteThread,
    updateThread,
    deleteComment,
    refetch: fetchAll,
  };
}
