"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Pin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { UserAvatar } from "@/components/shared/UserAvatar";
import { relativeTime, cn } from "@/lib/utils";
import type { TimelinePost, AppUser } from "@/lib/types";

const TAG_VARIANTS: Record<string, "default" | "success" | "warning" | "info" | "purple"> = {
  お知らせ: "warning",
  成果報告: "success",
  リリース: "info",
  HR: "purple",
  開発: "info",
  報告: "default",
};

interface PostCardProps {
  post: TimelinePost;
  appUser?: AppUser | null;
  isLiked?: boolean;
  onToggleLike?: (post: TimelinePost) => void;
  onEdit?: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function PostCardInner({ post, appUser, isLiked = false, onToggleLike, onEdit, onDelete }: PostCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    if (appUser && onToggleLike) onToggleLike(post);
  };

  const handleEditOpen = () => {
    setEditContent(post.content);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editContent.trim() || !onEdit) return;
    setSaving(true);
    try {
      await onEdit(editContent.trim());
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const showMenu = !!(onEdit || onDelete);

  return (
    <article className="bg-card rounded-xl border px-4 py-4 space-y-3">
      {post.isPinned && (
        <div className="flex items-center gap-1 text-xs text-primary font-medium -mb-1">
          <Pin className="w-3 h-3" />
          ピン留め
        </div>
      )}

      <div className="flex items-start gap-3">
        <UserAvatar name={post.authorName} photoURL={post.authorPhotoURL} uid={post.authorId} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{post.authorName}</span>
            {post.departmentName && (
              <span className="text-xs text-muted-foreground">{post.departmentName}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{relativeTime(post.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {post.tags.map((tag) => (
            <Badge key={tag} variant={TAG_VARIANTS[tag] ?? "default"}>{tag}</Badge>
          ))}
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={handleEditOpen} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    編集
                  </DropdownMenuItem>
                )}
                {onDelete && (
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
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

      <div className="flex items-center gap-4 pt-1 border-t">
        {/* いいね */}
        <button
          type="button"
          onClick={handleLike}
          disabled={!appUser || !onToggleLike}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors min-h-[36px] px-1",
            isLiked ? "text-rose-500" : "text-muted-foreground hover:text-rose-400",
            (!appUser || !onToggleLike) && "cursor-default"
          )}
        >
          <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          <span>{post.likeCount}</span>
        </button>

        {/* コメント（投稿詳細へ） */}
        <Link
          href={`/timeline/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[36px] px-1"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount}</span>
        </Link>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投稿を編集</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[120px] resize-none"
            placeholder="投稿内容を入力..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEditSave} disabled={!editContent.trim() || saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投稿を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この操作は取り消せません。投稿とそのコメントがすべて削除されます。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

// props が変わっていないカードは再レンダリングしない
export const PostCard = memo(PostCardInner);
