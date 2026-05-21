"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Activity, LayoutGrid, Users, FolderOpen, Shield, LogOut, MessageSquare, HelpCircle } from "lucide-react";
import { canAccessAdmin } from "@/lib/permissions";

const NAV_ITEMS = [
  { label: "タイムライン", href: "/timeline", icon: Activity },
  { label: "相談ボード", href: "/board", icon: LayoutGrid },
  { label: "組織図", href: "/org", icon: Users },
  { label: "相談したい", href: "/consult", icon: HelpCircle },
  { label: "ファイル", href: "/files", icon: FolderOpen },
  { label: "チャット", href: "/chat", icon: MessageSquare },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { appUser, logOut } = useAuth();

  return (
    <div className="flex flex-col w-full h-full border-r bg-background">
      {/* ロゴ */}
      <div className="flex items-center gap-2.5 px-4 py-4 h-16 flex-shrink-0">
        <Image
          src="/company-logo.png"
          alt="会社ロゴ"
          width={36}
          height={36}
          priority
          className="flex-shrink-0"
        />
        <span className="font-bold text-sm text-foreground leading-tight">社内ポータル</span>
      </div>

      <Separator />

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {canAccessAdmin(appUser) && (
          <>
            <Separator className="my-2" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              管理画面
            </Link>
          </>
        )}
      </nav>

      <Separator />

      {/* ユーザー情報 */}
      <div className="p-3 space-y-1">
        {appUser && (
          <Link
            href="/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors group"
          >
            <UserAvatar name={appUser.displayName} photoURL={appUser.photoURL} uid={appUser.uid} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight group-hover:text-foreground">{appUser.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{appUser.email}</p>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={logOut}
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </Button>
      </div>
    </div>
  );
}
