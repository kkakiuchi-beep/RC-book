import Link from "next/link";
import { MessageCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { relativeTime, cn } from "@/lib/utils";
import type { Thread, ThreadCategory } from "@/lib/types";

const CATEGORY_VARIANTS: Record<ThreadCategory, "default" | "secondary" | "success" | "warning" | "info" | "purple"> = {
  雑談: "secondary",
  質問: "info",
  報告: "warning",
  提案: "purple",
};

export function ThreadCard({ thread }: { thread: Thread }) {
  return (
    <Link href={`/board/${thread.id}`} className="block">
      <article className="bg-card rounded-xl border px-4 py-4 hover:bg-secondary/40 transition-colors space-y-2.5">
        {/* バッジ行 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={CATEGORY_VARIANTS[thread.category]}>{thread.category}</Badge>
          {thread.isResolved && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              解決済み
            </Badge>
          )}
        </div>

        {/* タイトル */}
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-semibold text-base leading-snug",
            thread.isResolved && "text-muted-foreground"
          )}>
            {thread.title}
          </p>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        </div>

        {/* プレビュー */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {thread.content}
        </p>

        {/* メタ */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
          <span>{thread.authorName}</span>
          <span>·</span>
          <span>{relativeTime(thread.createdAt)}</span>
          <span className="ml-auto flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {thread.commentCount}
          </span>
        </div>
      </article>
    </Link>
  );
}
