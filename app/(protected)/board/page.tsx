"use client";

import { useState } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadCard } from "@/components/board/ThreadCard";
import { ThreadForm } from "@/components/board/ThreadForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreads } from "@/hooks/use-board";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ThreadCategory } from "@/lib/types";

const CATEGORIES: Array<ThreadCategory | "すべて"> = ["すべて", "雑談", "質問", "報告", "提案"];

export default function BoardPage() {
  const { appUser } = useAuth();
  const { threads, loading, error, createThread } = useThreads();
  const [activeCategory, setActiveCategory] = useState<ThreadCategory | "すべて">("すべて");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered =
    activeCategory === "すべて"
      ? threads
      : threads.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">掲示板</h1>
        {appUser && (
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            新規スレッド
          </Button>
        )}
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:bg-secondary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-4 space-y-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
          データの読み込みに失敗しました。ダミーデータを表示しています。
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState icon={LayoutGrid} title="スレッドがありません" description="最初のスレッドを作成しましょう" />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((t) => <ThreadCard key={t.id} thread={t} />)}
        </div>
      )}

      <ThreadForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (title, content, category, isAnonymous, mentionedUserIds) => {
          if (!appUser) return;
          await createThread(title, content, category, isAnonymous, appUser, mentionedUserIds);
        }}
      />
    </div>
  );
}
