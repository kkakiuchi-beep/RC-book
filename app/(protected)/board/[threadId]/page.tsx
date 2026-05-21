"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CommentSection } from "@/components/board/CommentSection";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { MentionContent } from "@/components/shared/MentionContent";
import { useThread } from "@/hooks/use-board";
import { useAuth } from "@/lib/auth";
import { canResolveThread, canDeleteThread } from "@/lib/permissions";
import { relativeTime } from "@/lib/utils";
import type { ThreadCategory } from "@/lib/types";
import { toast } from "sonner";

const CATEGORY_VARIANTS: Record<ThreadCategory, "default" | "secondary" | "success" | "warning" | "info" | "purple"> = {
  雑談: "secondary",
  質問: "info",
  報告: "warning",
  提案: "purple",
};

export default function ThreadDetailPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const {
    thread,
    comments,
    loading,
    addComment,
    toggleResolved,
    deleteThread,
    updateThread,
    deleteComment,
  } = useThread(threadId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleEditOpen = () => {
    if (!thread) return;
    setEditTitle(thread.title);
    setEditContent(thread.content);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      await updateThread(editTitle.trim(), editContent.trim());
      setEditOpen(false);
      toast.success("スレッドを更新しました");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteThread();
      toast.success("スレッドを削除しました");
      router.push("/board");
    } catch {
      toast.error("削除に失敗しました");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleToggleResolved = async () => {
    setResolving(true);
    try {
      await toggleResolved();
      toast.success(thread?.isResolved ? "未解決に戻しました" : "解決済みにしました");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        スレッドが見つかりません
      </div>
    );
  }

  const isAuthor = appUser?.uid === thread.authorId;
  const showMenu = isAuthor || (appUser && canDeleteThread(appUser, thread));

  return (
    <div className="space-y-4">
      {/* 戻るボタン */}
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.push("/board")}>
        <ArrowLeft className="w-4 h-4" />
        ボードに戻る
      </Button>

      {/* スレッド本体 */}
      <article className="bg-card rounded-xl border p-5 space-y-4">
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Badge variant={CATEGORY_VARIANTS[thread.category]}>{thread.category}</Badge>
            {thread.isResolved ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                解決済み
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Circle className="w-3 h-3" />
                未解決
              </Badge>
            )}
          </div>

          {/* 三点メニュー */}
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthor && (
                  <DropdownMenuItem onClick={handleEditOpen} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    編集
                  </DropdownMenuItem>
                )}
                {appUser && canDeleteThread(appUser, thread) && (
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    削除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h1 className="text-xl font-bold leading-snug">{thread.title}</h1>

        <div className="flex items-center gap-3">
          <UserAvatar
            name={thread.isAnonymous ? "匿" : thread.authorName}
            uid={thread.isAnonymous ? "anon" : thread.authorId}
            photoURL={thread.isAnonymous ? null : thread.authorPhotoURL}
            size="sm"
            href={thread.isAnonymous ? undefined : `/users/${thread.authorId}`}
          />
          <div>
            <p className="text-sm font-medium">{thread.authorName}</p>
            <p className="text-xs text-muted-foreground">{relativeTime(thread.createdAt)}</p>
          </div>
        </div>

        <MentionContent content={thread.content} className="text-sm leading-relaxed whitespace-pre-wrap block" />

        {/* 解決済みボタン */}
        {appUser && canResolveThread(appUser, thread) && (
          <div className="pt-2 border-t">
            <Button
              variant={thread.isResolved ? "outline" : "default"}
              size="sm"
              className="gap-2"
              onClick={handleToggleResolved}
              disabled={resolving}
            >
              {thread.isResolved ? (
                <>
                  <Circle className="w-4 h-4" />
                  {resolving ? "更新中..." : "未解決に戻す"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {resolving ? "更新中..." : "解決済みにする"}
                </>
              )}
            </Button>
          </div>
        )}
      </article>

      {/* コメント */}
      <CommentSection
        comments={comments}
        onAddComment={async (content, isAnonymous, mentionedUserIds) => {
          if (!appUser) return;
          await addComment(content, isAnonymous, appUser, mentionedUserIds);
        }}
        onDeleteComment={async (commentId) => {
          await deleteComment(commentId);
        }}
      />

      {/* 編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スレッドを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">タイトル</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="タイトルを入力..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">内容</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[120px] resize-none"
                placeholder="内容を入力..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editTitle.trim() || !editContent.trim() || saving}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スレッドを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この操作は取り消せません。スレッドとそのコメントがすべて削除されます。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
