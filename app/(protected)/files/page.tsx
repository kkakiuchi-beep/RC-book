"use client";

import { useState } from "react";
import {
  FileText, FileSpreadsheet, Presentation, FolderOpen,
  FileImage, Plus, ExternalLink, FolderOpen as FolderIcon,
  Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AddFileDialog } from "@/components/files/AddFileDialog";
import { useFiles } from "@/hooks/use-files";
import { useAuth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/permissions";
import { relativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { DriveFileMime, DriveLink } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

interface MimeConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

const MIME_CONFIG: Record<DriveFileMime, MimeConfig> = {
  "application/pdf": { icon: FileText, color: "text-red-500", bgColor: "bg-red-50", label: "PDF" },
  "application/vnd.google-apps.spreadsheet": { icon: FileSpreadsheet, color: "text-emerald-600", bgColor: "bg-emerald-50", label: "スプレッドシート" },
  "application/vnd.google-apps.document": { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-50", label: "ドキュメント" },
  "application/vnd.google-apps.presentation": { icon: Presentation, color: "text-amber-500", bgColor: "bg-amber-50", label: "スライド" },
  "application/vnd.google-apps.folder": { icon: FolderOpen, color: "text-amber-600", bgColor: "bg-amber-50", label: "フォルダ" },
  "image/png": { icon: FileImage, color: "text-purple-500", bgColor: "bg-purple-50", label: "画像" },
  "image/jpeg": { icon: FileImage, color: "text-purple-500", bgColor: "bg-purple-50", label: "画像" },
  "other": { icon: FileText, color: "text-gray-500", bgColor: "bg-gray-50", label: "ファイル" },
};

export default function FilesPage() {
  const { appUser } = useAuth();
  const { files, loading, addFile, updateFile, deleteFile } = useFiles();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<DriveLink | null>(null);

  // 編集・削除の権限チェック（追加者本人 or 管理者）
  const canEdit = (file: DriveLink) =>
    !!appUser && (appUser.uid === file.addedBy || canAccessAdmin(appUser));

  const handleDelete = async (file: DriveLink) => {
    if (!confirm(`「${file.title}」を削除しますか？`)) return;
    try {
      await deleteFile(file.id);
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ファイル</h1>
        {appUser && (
          <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            追加
          </Button>
        )}
      </div>

      {loading && (
        <div className="bg-card rounded-xl border divide-y">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && files.length === 0 && (
        <EmptyState
          icon={FolderIcon}
          title="ファイルがありません"
          description="Google Drive のリンクを追加しましょう"
        />
      )}

      {!loading && files.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* PC ヘッダー */}
          <div className="hidden md:flex items-center px-4 py-2.5 border-b bg-secondary/40 text-xs font-medium text-muted-foreground gap-4">
            <span className="flex-1">名前</span>
            <span className="w-24">部署</span>
            <span className="w-20">追加日</span>
            <span className="w-14" />
          </div>

          <ul className="divide-y">
            {files.map((file) => {
              const cfg = MIME_CONFIG[file.mimeType];
              const Icon = cfg.icon;
              const editable = canEdit(file);

              return (
                <li key={file.id} className="group flex items-center gap-2 px-4 py-3 hover:bg-secondary/50 transition-colors">

                  {/* リンクエリア（flex-1） */}
                  <a
                    href={file.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    {/* ファイルアイコン */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bgColor}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>

                    {/* タイトル + メタ */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-snug">{file.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {/* 部署バッジ（常時表示） */}
                        {file.departmentName ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {file.departmentName}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">全社</span>
                        )}
                        {/* 日付（モバイルのみ） */}
                        <span className="text-[10px] text-muted-foreground md:hidden">
                          · {relativeTime(file.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* PC: 日付 */}
                    <span className="hidden md:block text-xs text-muted-foreground w-20 flex-shrink-0">
                      {relativeTime(file.createdAt)}
                    </span>

                    {/* 外部リンクアイコン */}
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 hidden sm:block" />
                  </a>

                  {/* 編集・削除ボタン（権限あるユーザーのみ） */}
                  {editable && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditingFile(file)}
                        title="編集"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(file)}
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 追加ダイアログ */}
      <AddFileDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={addFile}
      />

      {/* 編集ダイアログ */}
      <AddFileDialog
        open={!!editingFile}
        onOpenChange={(v) => { if (!v) setEditingFile(null); }}
        onSubmit={addFile}
        initial={editingFile}
        onUpdate={updateFile}
      />
    </div>
  );
}
