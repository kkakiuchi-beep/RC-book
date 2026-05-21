"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import type { ThreadCategory } from "@/lib/types";

const CATEGORIES: ThreadCategory[] = ["雑談", "質問", "報告", "提案"];

interface ThreadFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (
    title: string,
    content: string,
    category: ThreadCategory,
    isAnonymous: boolean
  ) => Promise<void>;
}

export function ThreadForm({ open, onOpenChange, onSubmit }: ThreadFormProps) {
  const { appUser } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ThreadCategory>("雑談");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!appUser) return null;

  const reset = () => {
    setTitle(""); setContent(""); setCategory("雑談"); setIsAnonymous(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(title.trim(), content.trim(), category, isAnonymous);
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

          {/* 本文 */}
          <div className="space-y-1.5">
            <Label htmlFor="thread-content">内容</Label>
            <Textarea
              id="thread-content"
              placeholder="詳細を入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
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
