"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const ROUTE_TITLES: Record<string, string> = {
  "/timeline": "タイムライン",
  "/board": "掲示板",
  "/org": "組織図",
  "/files": "ファイル",
  "/profile": "プロフィール",
  "/admin": "管理画面",
  "/notifications": "通知",
  "/search": "検索",
  "/chat": "チャット",
};

function getTitle(pathname: string): string {
  for (const [key, label] of Object.entries(ROUTE_TITLES)) {
    if (pathname === key || pathname.startsWith(key + "/")) return label;
  }
  return "社内ポータル";
}

export function Header() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const title = getTitle(pathname);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b bg-background sticky top-0 z-30">
      {/* モバイルはロゴ＋タイトル、PCはサイドバーにロゴあるので非表示 */}
      <div className="flex items-center gap-2 md:hidden">
        <Image src="/company-logo.png" alt="ロゴ" width={28} height={28} priority />
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      </div>
      <h1 className="hidden md:block text-base font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-1">
        {/* 検索 */}
        <Link
          href="/search"
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
            pathname === "/search"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          aria-label="検索"
        >
          <Search className="w-5 h-5" />
        </Link>

        {/* 通知ベル */}
        <Link
          href="/notifications"
          className={cn(
            "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
            pathname === "/notifications"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          aria-label={`通知${unreadCount > 0 ? `（${unreadCount}件未読）` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
