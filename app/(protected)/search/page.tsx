"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, LayoutGrid, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearch, type SearchResultType } from "@/hooks/use-search";
import { relativeTime, cn } from "@/lib/utils";

const TYPE_CONFIG: Record<SearchResultType, { label: string; icon: typeof Search; variant: "default" | "info" | "success" }> = {
  post: { label: "投稿", icon: FileText, variant: "default" },
  thread: { label: "スレッド", icon: LayoutGrid, variant: "info" },
  user: { label: "メンバー", icon: Users, variant: "success" },
};

type FilterType = "all" | SearchResultType;

export default function SearchPage() {
  const { results, loading, query, search } = useSearch();
  const [input, setInput] = useState(query);
  const [filter, setFilter] = useState<FilterType>("all");
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInput = (value: string) => {
    setInput(value);
    if (timerRef.current) {
  clearTimeout(timerRef.current);
}

timerRef.current = setTimeout(() => search(value), 350);
  };

  const filtered = filter === "all" ? results : results.filter((r) => r.type === filter);

  const counts = {
    all: results.length,
    post: results.filter((r) => r.type === "post").length,
    thread: results.filter((r) => r.type === "thread").length,
    user: results.filter((r) => r.type === "user").length,
  };

  return (
    <div className="space-y-4">
      {/* 検索ボックス */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="投稿・スレッド・メンバーを検索..."
          className="pl-10 pr-10"
        />
        {input && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setInput(""); search(""); }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* フィルタータブ */}
      {results.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {(["all", "post", "thread", "user"] as FilterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5",
                filter === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:bg-secondary"
              )}
            >
              {type === "all" ? "すべて" : TYPE_CONFIG[type].label}
              <span className="text-[11px] opacity-70">{counts[type]}</span>
            </button>
          ))}
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* 初期状態 */}
      {!loading && !input && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">キーワードを入力してください</p>
          <p className="text-xs mt-1">投稿・スレッド・メンバーを横断検索できます</p>
        </div>
      )}

      {/* 結果なし */}
      {!loading && input && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">「{input}」に一致する結果はありませんでした</p>
        </div>
      )}

      {/* 検索結果 */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((result) => {
            const cfg = TYPE_CONFIG[result.type];
            const Icon = cfg.icon;
            return (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                className="w-full text-left bg-card rounded-xl border px-4 py-3.5 hover:bg-secondary/50 transition-colors space-y-1.5"
                onClick={() => router.push(result.path)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <Badge variant={cfg.variant} className="text-[10px] px-1.5">{cfg.label}</Badge>
                  <p className="text-sm font-medium truncate flex-1">{result.title}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{result.description}</p>
                <p className="text-[11px] text-muted-foreground pl-5">{relativeTime(result.createdAt)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
