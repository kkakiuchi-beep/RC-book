"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import type { DriveFileMime } from "@/lib/types";
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
}

export function AddFileDialog({ open, onOpenChange, onSubmit }: AddFileDialogProps) {
  const { appUser } = useAuth();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [mimeType, setMimeType] = useState<DriveFileMime>("application/pdf");
  const [submitting, setSubmitting] = useState(false);

  if (!appUser) return null;

  const reset = () => { setTitle(""); setUrl(""); setMimeType("application/pdf"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(title.trim(), url.trim(), mimeType, null, null, appUser);
      toast.success("ファイルを追加しました");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ファイルを追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file-title">タイトル</Label>
            <Input id="file-title" placeholder="ファイル名や説明" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file-url">Google Drive URL</Label>
            <Input id="file-url" type="url" placeholder="https://drive.google.com/..." value={url} onChange={(e) => setUrl(e.target.value)} required />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
            <Button type="submit" disabled={submitting || !title.trim() || !url.trim()}>
              {submitting ? "追加中..." : "追加する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
