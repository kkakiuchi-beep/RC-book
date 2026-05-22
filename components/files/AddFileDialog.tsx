"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import type { DriveFileMime, Department, DriveLink } from "@/lib/types";
import type { useFiles } from "@/hooks/use-files";

const MIME_OPTIONS: { label: string; value: DriveFileMime }[] = [
  { label: "PDF", value: "application/pdf" },
  { label: "スプレッドシート", value: "application/vnd.google-apps.spreadsheet" },
  { label: "ドキュメント", value: "application/vnd.google-apps.document" },
  { label: "スライド", value: "application/vnd.google-apps.presentation" },
  { label: "フォルダ", value: "application/vnd.google-apps.folder" },
  { label: "その他", value: "other" },
];

interface AddFileDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: ReturnType<typeof useFiles>["addFile"];
  /** 編集モード：対象ファイル */
  initial?: DriveLink | null;
  /** 編集モード：更新コールバック */
  onUpdate?: ReturnType<typeof useFiles>["updateFile"];
}

export function AddFileDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
  onUpdate,
}: AddFileDialogProps) {
  const { appUser } = useAuth();
  const isEditMode = !!initial;

  const [depts, setDepts] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [mimeType, setMimeType] = useState<DriveFileMime>("application/pdf");
  const [departmentId, setDepartmentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 部署一覧を取得
  useEffect(() => {
    getDocs(query(collection(db, "departments"), orderBy("order", "asc")))
      .then((snap) => {
        setDepts(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name as string,
            order: d.data().order as number,
            parentId: (d.data().parentId as string | null) ?? null,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setDeptsLoading(false));
  }, []);

  // 編集モード: initial が変わったらフォームを初期化
  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setUrl(initial.driveUrl);
      setMimeType(initial.mimeType);
      setDepartmentId(initial.departmentId ?? "");
    }
  }, [initial]);

  if (!appUser) return null;

  const reset = () => {
    setTitle("");
    setUrl("");
    setMimeType("application/pdf");
    setDepartmentId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      const dept = depts.find((d) => d.id === departmentId);
      const deptId = departmentId || null;
      const deptName = dept?.name ?? null;

      if (isEditMode && onUpdate && initial) {
        await onUpdate(initial.id, title.trim(), url.trim(), mimeType, deptId, deptName);
        toast.success("ファイルを更新しました");
      } else {
        await onSubmit(title.trim(), url.trim(), mimeType, deptId, deptName, appUser);
        toast.success("ファイルを追加しました");
      }
      reset();
      onOpenChange(false);
    } catch {
      toast.error(isEditMode ? "更新に失敗しました" : "追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const topDepts = depts
    .filter((d) => !d.parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "ファイルを編集" : "ファイルを追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <Label htmlFor="file-title">タイトル</Label>
            <Input
              id="file-title"
              placeholder="ファイル名や説明"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file-url">Google Drive URL</Label>
            <Input
              id="file-url"
              type="url"
              placeholder="https://drive.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>ファイル種別</Label>
            <div className="flex gap-2 flex-wrap">
              {MIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMimeType(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    mimeType === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file-dept">部署（任意）</Label>
            {deptsLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <select
                id="file-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">全社（部署指定なし）</option>
                {topDepts.map((top) => {
                  const children = depts
                    .filter((d) => d.parentId === top.id)
                    .sort((a, b) => a.order - b.order);
                  return [
                    <option key={top.id} value={top.id}>{top.name}</option>,
                    ...children.map((c) => (
                      <option key={c.id} value={c.id}>　└ {c.name}</option>
                    )),
                  ];
                })}
              </select>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !url.trim()}>
              {submitting
                ? isEditMode ? "更新中..." : "追加中..."
                : isEditMode ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
