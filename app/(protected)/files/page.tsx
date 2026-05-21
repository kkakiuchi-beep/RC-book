"use client";

import { useState } from "react";
import {
  FileText, FileSpreadsheet, Presentation, FolderOpen,
  FileImage, Plus, ExternalLink, FolderOpen as FolderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AddFileDialog } from "@/components/files/AddFileDialog";
import { useFiles } from "@/hooks/use-files";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";
import type { DriveFileMime } from "@/lib/types";
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
  const { files, loading, addFile } = useFiles();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ファイル</h1>
        {appUser && (
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            追加
          </Button>
        )}
      </div>

      {loading && (
        <div className="bg-card rounded-xl border divide-y">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && files.length === 0 && (
        <EmptyState icon={FolderIcon} title="ファイルがありません" description="Google Drive のリンクを追加しましょう" />
      )}

      {!loading && files.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* ヘッダー (PC のみ) */}
          <div className="hidden md:grid grid-cols-[1fr_7rem_8rem] gap-4 px-4 py-2.5 border-b bg-secondary/40 text-xs font-medium text-muted-foreground">
            <span>名前</span>
            <span>部署</span>
            <span>追加日</span>
          </div>

          <ul className="divide-y">
            {files.map((file) => {
              const cfg = MIME_CONFIG[file.mimeType];
              const Icon = cfg.icon;
              return (
                <li key={file.id}>
                  <a
                    href={file.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex md:grid md:grid-cols-[1fr_7rem_8rem] items-center gap-3 md:gap-4 px-4 py-3.5 hover:bg-secondary/50 transition-colors"
                  >
                    {/* アイコン + タイトル */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bgColor}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                          {file.departmentName ?? "全社"} · {relativeTime(file.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* PC: 部署 */}
                    <div className="hidden md:block">
                      {file.departmentName ? (
                        <Badge variant="secondary" className="text-xs">{file.departmentName}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">全社</span>
                      )}
                    </div>

                    {/* PC: 日付 */}
                    <div className="hidden md:flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{relativeTime(file.createdAt)}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddFileDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={addFile} />
    </div>
  );
}
