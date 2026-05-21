"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import type { ThreadCategory } from "@/lib/types";
import type { AppUser } from "@/lib/types";

const CATEGORIES: ThreadCategory[] = ["雑談", "質問", "報告", "提案"];

interface ThreadFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (
    title: string,
    content: string,
    category: ThreadCategory,
    isAnonymous: boolean,
    mentionedUserIds: string[]
  ) => Promise<void>;
}

export function ThreadForm({ open, onOpenChange, onSubmit }: ThreadFormProps) {
  const { appUser } = useAuth();
  const { users } = useOrg();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ThreadCategory>("雑談");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<AppUser[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!appUser) return null;

  const mentionUsers = users.filter((u) => u.uid !== appUser.uid);

  const reset = () => {
    setTitle(""); setContent(""); setCategory("雑談"); setIsAnonymous(false); setMentionedUsers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(
        title.trim(),
        content.trim(),
        category,
        isAnonymous,
        mentionedUsers.map((u) => u.uid)
      );
      toast.success("スレッドを作成しました");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新しいスレッド</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* カテゴリ */}
          <div className="space-y-1.5">
            <Label>カテゴリ</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div className="space-y-1.5">
            <Label htmlFor="thread-title">タイトル</Label>
            <Input
              id="thread-title"
              placeholder="スレッドのタイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 本文（メンション対応） */}
          <div className="space-y-1.5">
            <Label htmlFor="thread-content">内容</Label>
            <MentionTextarea
              id="thread-content"
              value={content}
              onChange={setContent}
              onMentionedUsersChange={setMentionedUsers}
              placeholder="詳細を入力... (@名前 でメンション)"
              wrapperClassName="w-full"
              className="min-h-[100px]"
              allUsers={mentionUsers}
              required
            />
          </div>

          {/* 匿名 */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">匿名で投稿</p>
              <p className="text-xs text-muted-foreground">名前を「匿名」として表示します</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
              {submitting ? "作成中..." : "作成する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
