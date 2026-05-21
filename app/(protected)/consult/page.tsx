"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Target, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/hooks/use-chats";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/lib/types";

type ConsultMode = "canHelp" | "needHelp";

function parseTags(str: string | null | undefined): string[] {
  if (!str) return [];
  return str.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function ConsultPage() {
  const { users, loading } = useOrg();
  const { appUser } = useAuth();
  const { startChat } = useChats();
  const router = useRouter();

  const [mode, setMode] = useState<ConsultMode>("canHelp");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dmLoading, setDmLoading] = useState<string | null>(null);

  // タグ → ユーザー マップ
  const canHelpMap = useMemo(() => {
    const map: Record<string, AppUser[]> = {};
    users.forEach((u) => {
      parseTags(u.canHelp).forEach((tag) => {
        if (!map[tag]) map[tag] = [];
        map[tag].push(u);
      });
    });
    return map;
  }, [users]);

  const needHelpMap = useMemo(() => {
    const map: Record<string, AppUser[]> = {};
    users.forEach((u) => {
      parseTags(u.needHelp).forEach((tag) => {
        if (!map[tag]) map[tag] = [];
        map[tag].push(u);
      });
    });
    return map;
  }, [users]);

  const filteredCanHelp = useMemo(() => {
    const entries = Object.entries(canHelpMap);
    if (!search) return entries;
    return entries.filter(([tag]) => tag.toLowerCase().includes(search.toLowerCase()));
  }, [canHelpMap, search]);

  const filteredNeedHelp = useMemo(() => {
    const entries = Object.entries(needHelpMap);
    if (!search) return entries;
    return entries.filter(([tag]) => tag.toLowerCase().includes(search.toLowerCase()));
  }, [needHelpMap, search]);

  // ダイアログで表示するユーザー
  const dialogUsers: AppUser[] = selectedTag
    ? (mode === "canHelp" ? canHelpMap[selectedTag] : needHelpMap[selectedTag]) ?? []
    : [];

  const handleDM = async (other: AppUser) => {
    if (!appUser) return;
    setDmLoading(other.uid);
    try {
      const chatId = await startChat(other);
      router.push(`/chat/${chatId}`);
    } finally {
      setDmLoading(null);
    }
  };

  const handleTagClick = (tag: string, m: ConsultMode) => {
    setMode(m);
    setSelectedTag(tag);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">相談したい</h1>

      {/* 2カテゴリカード */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("canHelp")}
          className={cn(
            "rounded-xl border-2 p-5 text-center transition-all",
            mode === "canHelp"
              ? "border-blue-400 bg-blue-50"
              : "border-border bg-card hover:bg-secondary/50"
          )}
        >
          <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <p className="font-bold text-sm">これは私に聞け！</p>
          <p className="text-xs text-muted-foreground mt-0.5">みんなが答えられること</p>
        </button>
        <button
          type="button"
          onClick={() => setMode("needHelp")}
          className={cn(
            "rounded-xl border-2 p-5 text-center transition-all",
            mode === "needHelp"
              ? "border-rose-400 bg-rose-50"
              : "border-border bg-card hover:bg-secondary/50"
          )}
        >
          <HelpCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="font-bold text-sm">たすけてほしい！</p>
          <p className="text-xs text-muted-foreground mt-0.5">みんなが困っていること</p>
        </button>
      </div>

      {/* 検索バー */}
      <div className="bg-card rounded-xl border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="何に困っていますか？"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-muted/30 border-0"
          />
        </div>
      </div>

      {/* タグクラウド */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-wrap gap-2">
              {[80, 60, 100, 70, 90, 55].map((w, j) => (
                <Skeleton key={j} className="h-7 rounded-full" style={{ width: w }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* これは私に聞け！ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-blue-700">これは私に聞け！</h2>
            </div>
            {filteredCanHelp.length === 0 ? (
              <p className="text-xs text-muted-foreground">まだ登録されていません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredCanHelp.map(([tag, tagUsers]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag, "canHelp")}
                    className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                    <span className="text-xs text-blue-400">({tagUsers.length})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* たすけてほしい！ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-rose-700">たすけてほしい！</h2>
            </div>
            {filteredNeedHelp.length === 0 ? (
              <p className="text-xs text-muted-foreground">まだ登録されていません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredNeedHelp.map(([tag, tagUsers]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag, "needHelp")}
                    className="flex items-center gap-1 text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-3 py-1 hover:bg-rose-100 transition-colors"
                  >
                    {tag}
                    <span className="text-xs text-rose-400">({tagUsers.length})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* タグ詳細ダイアログ */}
      <Dialog open={!!selectedTag} onOpenChange={(o) => !o && setSelectedTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "canHelp" ? (
                <Target className="w-4 h-4 text-blue-600" />
              ) : (
                <HelpCircle className="w-4 h-4 text-rose-500" />
              )}
              <span>{selectedTag}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {dialogUsers.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                {u.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <UserAvatar name={u.displayName} uid={u.uid} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.departmentName ?? ""}</p>
                </div>
                {appUser && u.uid !== appUser.uid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs flex-shrink-0"
                    disabled={dmLoading === u.uid}
                    onClick={() => handleDM(u)}
                  >
                    <MessageSquare className="w-3 h-3" />
                    DM
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
