"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import type { useTimeline } from "@/hooks/use-timeline";
import type { AppUser } from "@/lib/types";

const TAGS = ["お知らせ", "成果報告", "リリース", "HR", "開発", "報告"] as const;

interface PostFormProps {
  onSubmit: ReturnType<typeof useTimeline>["createPost"];
}

export function PostForm({ onSubmit }: PostFormProps) {
  const { appUser } = useAuth();
  const { users } = useOrg();
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<AppUser[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!appUser) return null;

  // 自分を除いたメンション候補
  const mentionUsers = users.filter((u) => u.uid !== appUser.uid);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(
        content.trim(),
        selectedTags,
        appUser,
        mentionedUsers.map((u) => u.uid)
      );
      setContent("");
      setSelectedTags([]);
      setMentionedUsers([]);
      toast.success("投稿しました");
    } catch {
      toast.error("投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <UserAvatar name={appUser.displayName} photoURL={appUser.photoURL} uid={appUser.uid} size="md" />
        <MentionTextarea
          value={content}
          onChange={setContent}
          onMentionedUsersChange={setMentionedUsers}
          placeholder="いまどうしてる？ (@名前 でメンション)"
          wrapperClassName="flex-1"
          className="min-h-[72px] border-0 shadow-none focus-visible:ring-0 resize-none px-0 py-0 text-base"
          allUsers={mentionUsers}
        />
      </div>

      {/* タグ選択 */}
      <div className="flex items-center gap-2 flex-wrap pl-[52px]">
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className="focus-visible:outline-none"
          >
            <Badge
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer select-none"
            >
              {tag}
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex justify-end border-t pt-3">
        <Button type="submit" size="sm" disabled={!content.trim() || submitting} className="gap-2">
          <Send className="w-3.5 h-3.5" />
          {submitting ? "投稿中..." : "投稿する"}
        </Button>
      </div>
    </form>
  );
}
