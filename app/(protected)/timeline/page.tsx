"use client";

import { useEffect, useCallback } from "react";
import { Activity } from "lucide-react";
import { PostForm } from "@/components/timeline/PostForm";
import { PostCard } from "@/components/timeline/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeline } from "@/hooks/use-timeline";
import { useAuth } from "@/lib/auth";
import { canDeletePost, canEditPost } from "@/lib/permissions";
import { toast } from "sonner";

export default function TimelinePage() {
  const { appUser } = useAuth();
  const {
    posts,
    loading,
    error,
    createPost,
    deletePost,
    updatePost,
    toggleLike,
    likedPostIds,
    initLikedPostIds,
  } = useTimeline();

  // uid が変わった時だけいいね状態を取得（postIds 不要になった）
  useEffect(() => {
    if (appUser?.uid) {
      initLikedPostIds(appUser.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.uid]);

  // useCallback で参照を安定させ React.memo の効果を最大化
  const handleToggleLike = useCallback(
    (p: Parameters<typeof toggleLike>[0]) => {
      if (appUser) toggleLike(p, appUser);
    },
    [appUser, toggleLike]
  );

  return (
    <div className="space-y-4">
      <PostForm onSubmit={createPost} />

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
          データの読み込みに失敗しました。ダミーデータを表示しています。
        </div>
      )}

      {!loading && posts.length === 0 && (
        <EmptyState icon={Activity} title="まだ投稿がありません" description="最初の投稿をしてみましょう" />
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              appUser={appUser}
              isLiked={likedPostIds.has(post.id)}
              onToggleLike={handleToggleLike}
              onEdit={
                canEditPost(appUser, post)
                  ? async (content) => {
                      await updatePost(post.id, content);
                      toast.success("投稿を更新しました");
                    }
                  : undefined
              }
              onDelete={
                canDeletePost(appUser, post)
                  ? async () => {
                      await deletePost(post.id);
                      toast.success("投稿を削除しました");
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
