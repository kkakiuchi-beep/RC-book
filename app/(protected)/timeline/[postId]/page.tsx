"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { PostCard } from "@/components/timeline/PostCard";
import { usePost } from "@/hooks/use-timeline";
import { useAuth } from "@/lib/auth";
import { canDeletePost, canEditPost, canDeleteTimelineComment } from "@/lib/permissions";
import { relativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const { post, comments, loading, addComment, editPost, removePost, deleteComment } = usePost(postId);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !appUser) return;
    setSubmitting(true);
    try {
      await addComment(content.trim(), appUser);
      setContent("");
      toast.success("コメントしました");
    } catch {
      toast.error("コメントに失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    setDeletingComment(true);
    try {
      await deleteComment(deleteCommentId);
      toast.success("コメントを削除しました");
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeletingComment(false);
      setDeleteCommentId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="text-center py-16 text-muted-foreground">投稿が見つかりません</div>;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.push("/timeline")}>
        <ArrowLeft className="w-4 h-4" />
        タイムラインに戻る
      </Button>

      <PostCard
        post={post}
        appUser={appUser}
        onEdit={
          canEditPost(appUser, post)
            ? async (c) => {
                await editPost(c);
                toast.success("投稿を更新しました");
              }
            : undefined
        }
        onDelete={
          canDeletePost(appUser, post)
            ? async () => {
                await removePost();
                toast.success("投稿を削除しました");
                router.push("/timeline");
              }
            : undefined
        }
      />

      {/* コメント一覧 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          コメント <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>
        </h2>
        {comments.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <UserAvatar name={c.authorName} uid={c.authorId} photoURL={c.authorPhotoURL} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.authorName}</p>
                <p className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</p>
              </div>
              {canDeleteTimelineComment(appUser, c) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => setDeleteCommentId(c.id)}
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
          <p className="text-center text-sm text-muted-foreground py-6">まだコメントはありません</p>
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
          <div className="flex justify-end border-t pt-3">
            <Button type="submit" size="sm" disabled={!content.trim() || submitting} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {submitting ? "送信中..." : "送信"}
            </Button>
          </div>
        </form>
      )}

      {/* コメント削除確認ダイアログ */}
      <Dialog open={!!deleteCommentId} onOpenChange={(o) => !o && setDeleteCommentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>コメントを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">この操作は取り消せません。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCommentId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteComment} disabled={deletingComment}>
              {deletingComment ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
