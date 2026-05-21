"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  doc,
  increment,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TimelinePost, TimelineComment, AppUser } from "@/lib/types";
import { dummyPosts } from "@/lib/dummy-data";
import { createNotification } from "@/lib/notification";

function toPost(id: string, d: Record<string, unknown>): TimelinePost {
  return {
    id,
    authorId: d.authorId as string,
    authorName: d.authorName as string,
    authorPhotoURL: (d.authorPhotoURL as string | null) ?? null,
    departmentId: (d.departmentId as string | null) ?? null,
    departmentName: (d.departmentName as string | null) ?? null,
    content: d.content as string,
    tags: (d.tags as string[]) ?? [],
    isPinned: (d.isPinned as boolean) ?? false,
    likeCount: (d.likeCount as number) ?? 0,
    commentCount: (d.commentCount as number) ?? 0,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (d.updatedAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export function useTimeline() {
  const [posts, setPosts] = useState<TimelinePost[]>(dummyPosts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(
      collection(db, "timelinePosts"),
      orderBy("isPinned", "desc"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.empty ? dummyPosts : snap.docs.map((d) => toPost(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        console.error("useTimeline:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, "timelinePosts", postId));
  };

  const updatePost = async (postId: string, content: string) => {
    await updateDoc(doc(db, "timelinePosts", postId), {
      content,
      updatedAt: serverTimestamp(),
    });
  };

  const createPost = async (content: string, tags: string[], appUser: AppUser) => {
    await addDoc(collection(db, "timelinePosts"), {
      authorId: appUser.uid,
      authorName: appUser.displayName,
      authorPhotoURL: appUser.photoURL ?? null,
      departmentId: appUser.departmentId ?? null,
      departmentName: appUser.departmentName ?? null,
      content,
      tags,
      isPinned: false,
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  /** いいねトグル（楽観的更新） */
  const toggleLike = async (post: TimelinePost, appUser: AppUser) => {
    const likeId = `${post.id}__${appUser.uid}`;
    const likeRef = doc(db, "likes", likeId);
    const isLiked = likedPostIds.has(post.id);

    // 楽観的更新
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(post.id) : next.add(post.id);
      return next;
    });

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, "timelinePosts", post.id), { likeCount: increment(-1) });
      } else {
        await setDoc(likeRef, {
          postId: post.id,
          userId: appUser.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "timelinePosts", post.id), { likeCount: increment(1) });
        await createNotification({
          userId: post.authorId,
          type: "like",
          message: `${appUser.displayName}さんが投稿にいいねしました`,
          relatedId: post.id,
          relatedPath: `/timeline/${post.id}`,
          fromUserId: appUser.uid,
          fromUserName: appUser.displayName,
          fromUserPhotoURL: appUser.photoURL,
        });
      }
    } catch (e) {
      // ロールバック
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        isLiked ? next.add(post.id) : next.delete(post.id);
        return next;
      });
      console.error("toggleLike:", e);
    }
  };

  /**
   * いいね済み投稿IDを初期化
   * N+1 を避けるため userId で1回だけクエリする
   */
  const initLikedPostIds = async (uid: string) => {
    try {
      const snap = await getDocs(
        query(collection(db, "likes"), where("userId", "==", uid))
      );
      setLikedPostIds(
        new Set(snap.docs.map((d) => d.data().postId as string))
      );
    } catch (e) {
      console.error("initLikedPostIds:", e);
    }
  };

  return { posts, loading, error, createPost, deletePost, updatePost, toggleLike, likedPostIds, initLikedPostIds };
}

/** 単一投稿 + コメント */
export function usePost(postId: string) {
  const [post, setPost] = useState<TimelinePost | null>(null);
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const pSnap = await getDoc(doc(db, "timelinePosts", postId));
        if (pSnap.exists()) setPost(toPost(pSnap.id, pSnap.data()));

        // postId で絞り込み → 全件取得を回避
        const cSnap = await getDocs(
          query(
            collection(db, "timelineComments"),
            where("postId", "==", postId)
          )
        );
        const fetched = cSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              postId: data.postId as string,
              authorId: data.authorId as string,
              authorName: data.authorName as string,
              authorPhotoURL: (data.authorPhotoURL as string | null) ?? null,
              content: data.content as string,
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            } as TimelineComment;
          })
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        setComments(fetched);
      } catch (e) {
        console.error("usePost:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [postId]);

  const addComment = async (content: string, appUser: AppUser) => {
    if (!post) return;
    await addDoc(collection(db, "timelineComments"), {
      postId,
      authorId: appUser.uid,
      authorName: appUser.displayName,
      authorPhotoURL: appUser.photoURL ?? null,
      content,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "timelinePosts", postId), {
      commentCount: increment(1),
    });
    await createNotification({
      userId: post.authorId,
      type: "comment",
      message: `${appUser.displayName}さんが投稿にコメントしました`,
      relatedId: postId,
      relatedPath: `/timeline/${postId}`,
      fromUserId: appUser.uid,
      fromUserName: appUser.displayName,
      fromUserPhotoURL: appUser.photoURL,
    });
    setComments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        postId,
        authorId: appUser.uid,
        authorName: appUser.displayName,
        authorPhotoURL: appUser.photoURL,
        content,
        createdAt: new Date(),
      },
    ]);
  };

  const editPost = async (content: string) => {
    await updateDoc(doc(db, "timelinePosts", postId), {
      content,
      updatedAt: serverTimestamp(),
    });
    setPost((prev) => (prev ? { ...prev, content, updatedAt: new Date() } : prev));
  };

  const removePost = async () => {
    await deleteDoc(doc(db, "timelinePosts", postId));
  };

  const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, "timelineComments", commentId));
    try {
      await updateDoc(doc(db, "timelinePosts", postId), { commentCount: increment(-1) });
    } catch { /* ダミーデータ時は無視 */ }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return { post, comments, loading, addComment, editPost, removePost, deleteComment };
}
