"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useChats } from "@/hooks/use-chats";
import { useAuth } from "@/lib/auth";
import { relativeTime, cn } from "@/lib/utils";

export default function ChatPage() {
  const { appUser } = useAuth();
  const { chats, loading } = useChats();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">チャット</h1>
      <p className="text-sm text-muted-foreground -mt-2">
        組織図ページのメンバーカードから DM を開始できます
      </p>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      )}

      {!loading && chats.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="チャットがありません"
          description="組織図のメンバーカードから DM を始めましょう"
        />
      )}

      {!loading && chats.length > 0 && (
        <div className="space-y-2">
          {chats.map((chat) => {
            const otherUid = chat.memberIds.find((id) => id !== appUser?.uid) ?? "";
            const otherName = chat.memberNames[otherUid] ?? "不明";
            const otherPhoto = chat.memberPhotoURLs[otherUid] ?? null;
            const unread = (appUser ? chat.unreadCounts[appUser.uid] : 0) ?? 0;
            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center gap-3 bg-card rounded-xl border px-4 py-3.5 hover:bg-secondary/50 transition-colors"
              >
                <UserAvatar name={otherName} uid={otherUid} photoURL={otherPhoto} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-sm truncate", unread > 0 ? "font-semibold" : "font-medium")}>
                      {otherName}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                      {relativeTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={cn(
                      "text-xs truncate",
                      unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {chat.lastMessage || "まだメッセージはありません"}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
