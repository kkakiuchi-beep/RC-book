"use client";

import { useState, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TimelinePost, Thread, AppUser } from "@/lib/types";
import { dummyPosts, dummyThreads, dummyUsers } from "@/lib/dummy-data";

export type SearchResultType = "post" | "thread" | "user";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  description: string;
  path: string;
  authorName?: string;
  createdAt: Date;
}

// ── Firestore データをセッション中キャッシュ ──────────────────
let _dataCache: {
  posts: TimelinePost[];
  threads: Thread[];
  users: AppUser[];
  ts: number;
} | null = null;
const DATA_TTL = 3 * 60 * 1000; // 3分

function matchQuery(q: string, ...targets: (string | null | undefined)[]): boolean {
  const lower = q.toLowerCase();
  return targets.some((t) => t?.toLowerCase().includes(lower));
}

async function fetchSearchData() {
  if (_dataCache && Date.now() - _dataCache.ts < DATA_TTL) {
    return _dataCache;
  }
  const [postSnap, threadSnap, userSnap] = await Promise.all([
    getDocs(query(collection(db, "timelinePosts"), orderBy("createdAt", "desc"))),
    getDocs(query(collection(db, "threads"), orderBy("createdAt", "desc"))),
    getDocs(collection(db, "users")),
  ]);
  const data = {
    posts: postSnap.empty
      ? dummyPosts
      : postSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as TimelinePost)),
    threads: threadSnap.empty
      ? dummyThreads
      : threadSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Thread)),
    users: userSnap.empty
      ? dummyUsers
      : userSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as unknown as AppUser)),
    ts: Date.now(),
  };
  _dataCache = data;
  return data;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query_, setQuery] = useState("");

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { posts, threads, users } = await fetchSearchData();

      const postResults: SearchResult[] = posts
        .filter((p) => matchQuery(q, p.content, p.authorName, p.departmentName, ...(p.tags ?? [])))
        .map((p) => ({
          type: "post",
          id: p.id,
          title: p.content.slice(0, 60) + (p.content.length > 60 ? "…" : ""),
          description: `${p.authorName}${p.departmentName ? ` · ${p.departmentName}` : ""}`,
          path: `/timeline/${p.id}`,
          authorName: p.authorName,
          createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(),
        }));

      const threadResults: SearchResult[] = threads
        .filter((t) => matchQuery(q, t.title, t.content, t.authorName))
        .map((t) => ({
          type: "thread",
          id: t.id,
          title: t.title,
          description: t.content.slice(0, 80) + (t.content.length > 80 ? "…" : ""),
          path: `/board/${t.id}`,
          authorName: t.authorName,
          createdAt: t.createdAt instanceof Date ? t.createdAt : new Date(),
        }));

      const userResults: SearchResult[] = users
        .filter((u) => matchQuery(q, u.displayName, u.email, u.departmentName))
        .map((u) => ({
          type: "user",
          id: u.uid,
          title: u.displayName,
          description: `${u.departmentName ?? "部署未設定"} · ${u.email}`,
          path: `/org`,
          createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(),
        }));

      setResults(
        [...postResults, ...threadResults, ...userResults].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )
      );
    } catch (e) {
      console.error("useSearch:", e);
      // フォールバック: ダミーデータで検索
      const postResults: SearchResult[] = dummyPosts
        .filter((p) => matchQuery(q, p.content, p.authorName))
        .map((p) => ({
          type: "post",
          id: p.id,
          title: p.content.slice(0, 60),
          description: p.authorName,
          path: `/timeline/${p.id}`,
          createdAt: p.createdAt,
        }));
      const threadResults: SearchResult[] = dummyThreads
        .filter((t) => matchQuery(q, t.title, t.content))
        .map((t) => ({
          type: "thread",
          id: t.id,
          title: t.title,
          description: t.content.slice(0, 80),
          path: `/board/${t.id}`,
          createdAt: t.createdAt,
        }));
      setResults([...postResults, ...threadResults]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, query: query_, search };
}
