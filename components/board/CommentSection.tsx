"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/lib/auth";
import { canDeleteBoardComment } from "@/lib/permissions";
import { relativeTime } from "@/lib/utils";
import type { ThreadComment } from "@/lib/types";

interface CommentSectionProps {
  comments: ThreadComment[];
  onAddComment: (content: string, isAnonymous: boolean) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export function CommentSection({ comments, onAddComment, onDeleteComment }: CommentSectionProps) {
  const { appUser } = useAuth();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !appUser) return;
    setSubmitting(true);
    try {
      await onAddComment(content.trim(), isAnonymous);
      setContent("");
      toast.success("コメントしました");
    } catch {
      toast.error("コメントに失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId || !onDeleteComment) return;
    setDeleting(true);
    try {
      await onDeleteComment(deleteTargetId);
      toast.success("コメントを削除しました");
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">
        コメント <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>
      </h2>

      {/* コメント一覧 */}
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <UserAvatar
                name={c.isAnonymous ? "匿" : c.authorName}
                uid={c.isAnonymous ? "anon" : c.authorId}
                photoURL={c.isAnonymous ? null : c.authorPhotoURL}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.authorName}</p>
                <p className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</p>
              </div>
              {onDeleteComment && canDeleteBoardComment(appUser, c) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => setDeleteTargetId(c.id)}
                  aria-label="コメントを削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap pl-10">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            まだコメントはありません
          </p>
        )}
      </div>

      {/* コメント入力 */}
      {appUser && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-4 space-y-3">
          <div className="flex items-start gap-3">
            <UserAvatar name={appUser.displayName} uid={appUser.uid} photoURL={appUser.photoURL} size="sm" />
            <Textarea
              placeholder="コメントを入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 min-h-[72px] border-0 shadow-none focus-visible:ring-0 px-0 resize-none"
            />
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch id="anon-comment" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              <Label htmlFor="anon-comment" className="text-xs text-muted-foreground cursor-pointer">
                匿名で投稿
              </Label>
            </div>
            <Button type="submit" size="sm" disabled={!content.trim() || submitting} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {submitting ? "送信中..." : "送信"}
            </Button>
          </div>
        </form>
      )}

      {/* コメント削除確認ダイアログ */}
      <Dialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>コメントを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">この操作は取り消せません。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
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
