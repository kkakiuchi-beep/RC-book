"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Department } from "@/lib/types";
import { dummyUsers, dummyDepts } from "@/lib/dummy-data";

// ── モジュールレベルキャッシュ ──────────────────────────────────
let _cache: { users: AppUser[]; depts: Department[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分

function isCacheValid() {
  return _cache !== null && Date.now() - _cache.ts < CACHE_TTL;
}

export function useOrg() {
  const [users, setUsers] = useState<AppUser[]>(
    isCacheValid() ? _cache!.users : dummyUsers
  );
  const [depts, setDepts] = useState<Department[]>(
    isCacheValid() ? _cache!.depts : dummyDepts
  );
  const [loading, setLoading] = useState(!isCacheValid());

  useEffect(() => {
    // キャッシュが有効なら Firestore を叩かない
    if (isCacheValid()) return;

    const fetchAll = async () => {
      try {
        const [uSnap, dSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(query(collection(db, "departments"), orderBy("order", "asc"))),
        ]);

        const fetchedUsers: AppUser[] = uSnap.empty
          ? dummyUsers
          : uSnap.docs.map((d) => {
              const data = d.data();
              return {
                uid: d.id,
                email: data.email ?? "",
                displayName: data.displayName ?? "",
                photoURL: data.photoURL ?? null,
                departmentId: data.departmentId ?? null,
                departmentName: data.departmentName ?? null,
                role: data.role ?? "staff",
                instagramId: data.instagramId ?? null,
                lineId: data.lineId ?? null,
                bio: data.bio ?? null,
                hobbies: data.hobbies ?? null,
                skills: data.skills ?? null,
                canHelp: data.canHelp ?? null,
                needHelp: data.needHelp ?? null,
                createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
              } as AppUser;
            });

        const fetchedDepts: Department[] = dSnap.empty
          ? dummyDepts
          : dSnap.docs.map((d) => ({
              id: d.id,
              name: d.data().name as string,
              order: d.data().order as number,
            }));

        _cache = { users: fetchedUsers, depts: fetchedDepts, ts: Date.now() };
        setUsers(fetchedUsers);
        setDepts(fetchedDepts);
      } catch (e) {
        console.error("useOrg:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { users, depts, loading };
}

/** プロフィール更新後などにキャッシュを強制リセットする */
export function invalidateOrgCache() {
  _cache = null;
}
