"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useChatRoom } from "@/hooks/use-chat-room";
import { useAuth } from "@/lib/auth";
import { relativeTime, cn } from "@/lib/utils";

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const { chat, messages, loading, sendMessage, deleteChat } = useChatRoom(chatId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteChat();
      router.push("/chat");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-7rem)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 pb-4 border-b mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" className="w-8 h-8 -ml-1" onClick={() => router.push("/chat")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <UserAvatar name={otherName} uid={otherUid} photoURL={otherPhoto} size="sm" />
        <p className="font-semibold text-sm flex-1 min-w-0 truncate">{otherName}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              チャットを削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>チャットを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            あなたのチャット一覧から削除されます。相手には影響しません。新しいメッセージが届くと自動的に復元されます。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
