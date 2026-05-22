"use client";

import Link from "next/link";
import { Bell, CheckCheck, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useNotifications } from "@/hooks/use-notifications";
import { relativeTime, cn } from "@/lib/utils";

export default function NotificationsPage() {
  const {
    notifications,
    loading,
    fetchError,
    unreadCount,
    desktopPermission,
    requestDesktopPermission,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">通知</h1>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={markAllAsRead}>
            <CheckCheck className="w-3.5 h-3.5" />
            すべて既読
          </Button>
        )}
      </div>

      {/* デスクトップ通知の許可バナー */}
      {desktopPermission === "default" && (
        <button
          type="button"
          onClick={requestDesktopPermission}
          className="w-full flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4 text-left hover:bg-primary/10 transition-colors"
        >
          <BellRing className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">デスクトップ通知を有効にする</p>
            <p className="text-xs text-muted-foreground">ブラウザがバックグラウンドでも通知を受け取れます</p>
          </div>
          <span className="text-xs text-primary font-medium flex-shrink-0">許可する →</span>
        </button>
      )}

      {desktopPermission === "denied" && (
        <div className="flex items-center gap-3 bg-muted rounded-xl p-4">
          <BellOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">デスクトップ通知がブロックされています</p>
            <p className="text-xs text-muted-foreground">ブラウザの設定からこのサイトの通知を許可してください</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-4 flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && fetchError && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm space-y-1">
          <p className="font-medium">通知の読み込みに失敗しました</p>
          <p className="text-xs opacity-80">{fetchError}</p>
        </div>
      )}

      {!loading && !fetchError && notifications.length === 0 && (
        <EmptyState icon={Bell} title="通知はありません" description="コメントやいいねが届くとここに表示されます" />
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.relatedPath}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-secondary/50",
                n.isRead ? "bg-card" : "bg-primary/5 border-primary/20"
              )}
            >
              <div className="relative flex-shrink-0">
                <UserAvatar
                  name={n.fromUserName}
                  uid={n.fromUserId}
                  photoURL={n.fromUserPhotoURL}
                  size="sm"
                />
                {!n.isRead && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-snug", !n.isRead && "font-medium")}>
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{relativeTime(n.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
