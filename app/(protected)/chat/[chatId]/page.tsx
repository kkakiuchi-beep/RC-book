"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useChatRoom } from "@/hooks/use-chat-room";
import { useAuth } from "@/lib/auth";
import { relativeTime, cn } from "@/lib/utils";

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const { chat, messages, loading, sendMessage } = useChatRoom(chatId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが来たら一番下へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const otherUid = chat?.memberIds.find((id) => id !== appUser?.uid) ?? "";
  const otherName = chat?.memberNames[otherUid] ?? "";
  const otherPhoto = chat?.memberPhotoURLs[otherUid] ?? null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input);
      setInput("");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 && "justify-end")}>
              <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 pb-4 border-b mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" className="w-8 h-8 -ml-1" onClick={() => router.push("/chat")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <UserAvatar name={otherName} uid={otherUid} photoURL={otherPhoto} size="sm" />
        <p className="font-semibold text-sm">{otherName}</p>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            まだメッセージはありません。最初のメッセージを送りましょう！
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.authorId === appUser?.uid;
          return (
            <div key={msg.id} className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
              {!isMe && (
                <UserAvatar name={msg.authorName} uid={msg.authorId} photoURL={msg.authorPhotoURL} size="sm" />
              )}
              <div className={cn("max-w-[75%] space-y-1", isMe && "items-end flex flex-col")}>
                <div
                  className={cn(
                    "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-muted-foreground px-1">{relativeTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
