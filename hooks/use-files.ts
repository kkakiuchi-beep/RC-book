"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DriveLink, DriveFileMime, AppUser } from "@/lib/types";
import { dummyDriveLinks } from "@/lib/dummy-data";

export function useFiles() {
  const [files, setFiles] = useState<DriveLink[]>(dummyDriveLinks);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "driveLinks"), orderBy("createdAt", "desc"))
      );
      if (!snap.empty) {
        setFiles(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title as string,
              driveFileId: (data.driveFileId as string | null) ?? null,
              driveUrl: data.driveUrl as string,
              mimeType: data.mimeType as DriveFileMime,
              departmentId: (data.departmentId as string | null) ?? null,
              departmentName: (data.departmentName as string | null) ?? null,
              addedBy: data.addedBy as string,
              addedByName: data.addedByName as string,
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            } as DriveLink;
          })
        );
      }
    } catch (e) {
      console.error("useFiles:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const addFile = async (
    title: string,
    driveUrl: string,
    mimeType: DriveFileMime,
    departmentId: string | null,
    departmentName: string | null,
    appUser: AppUser
  ) => {
    await addDoc(collection(db, "driveLinks"), {
      title,
      driveFileId: null,
      driveUrl,
      mimeType,
      departmentId,
      departmentName,
      addedBy: appUser.uid,
      addedByName: appUser.displayName,
      createdAt: serverTimestamp(),
    });
    await fetchFiles();
  };

  return { files, loading, addFile, refetch: fetchFiles };
}
