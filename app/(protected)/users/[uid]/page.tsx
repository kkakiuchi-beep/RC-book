"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/hooks/use-chats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, MessageSquare, Instagram, AtSign, Target, HelpCircle,
} from "lucide-react";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

function parseTags(str: string | null | undefined): string[] {
  if (!str) return [];
  return str.split(",").map((t) => t.trim()).filter(Boolean);
}

function mapDocToUser(uid: string, d: Record<string, unknown>): AppUser {
  return {
    uid,
    email: (d.email as string) ?? "",
    displayName: (d.displayName as string) ?? "",
    photoURL: (d.photoURL as string | null) ?? null,
    departmentId: (d.departmentId as string | null) ?? null,
    departmentName: (d.departmentName as string | null) ?? null,
    role: (d.role as AppUser["role"]) ?? "staff",
    instagramId: (d.instagramId as string | null) ?? null,
    lineId: (d.lineId as string | null) ?? null,
    hobbies: (d.hobbies as string | null) ?? null,
    skills: (d.skills as string | null) ?? null,
    bio: (d.bio as string | null) ?? null,
    canHelp: (d.canHelp as string | null) ?? null,
    needHelp: (d.needHelp as string | null) ?? null,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (d.updatedAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const { startChat } = useChats();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dmLoading, setDmLoading] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (snap.exists()) {
          setUser(mapDocToUser(snap.id, snap.data() as Record<string, unknown>));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uid]);

  const handleDM = async () => {
    if (!user || !appUser) return;
    setDmLoading(true);
    try {
      const chatId = await startChat(user);
      router.push(`/chat/${chatId}`);
    } finally {
      setDmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 max-w-2xl">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        ユーザーが見つかりません
      </div>
    );
  }

  const isMe = appUser?.uid === uid;
  const skillTags = parseTags(user.skills);
  const canHelpTags = parseTags(user.canHelp);
  const needHelpTags = parseTags(user.needHelp);
  const hasSkillsSection = skillTags.length > 0 || canHelpTags.length > 0 || needHelpTags.length > 0;
  const hasSNS = !!(user.instagramId || user.lineId);

  return (
    <div className="space-y-3 max-w-2xl">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        戻る
      </Button>

      {/* ── ヘッダーカード ── */}
      <div className="bg-card rounded-2xl border p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 ring-2 ring-border"
            />
          ) : (
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex-shrink-0 ring-2 ring-border flex items-center justify-center bg-muted text-xl sm:text-2xl font-bold">
              {user.displayName.slice(0, 1)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold leading-snug">{user.displayName}</h1>
                {user.bio && (
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {user.bio}
                  </p>
                )}
              </div>
              {!isMe && (
                <Button
                  size="sm"
                  className="gap-1.5 flex-shrink-0"
                  onClick={handleDM}
                  disabled={dmLoading}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">DM を送る</span>
                  <span className="xs:hidden">DM</span>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {user.departmentName && (
                <span className="text-xs bg-muted rounded-full px-2.5 py-0.5 text-muted-foreground">
                  {user.departmentName}
                </span>
              )}
              <Badge variant={ROLE_BADGE_VARIANT[user.role] as "default" | "warning"}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <span className="text-xs text-muted-foreground break-all">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── About ── */}
      {user.hobbies && (
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">
            About
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{user.hobbies}</p>
        </div>
      )}

      {/* ── Skills & Tags ── */}
      {hasSkillsSection && (
        <div className="bg-card rounded-2xl border p-5 space-y-4">
          <h2 className="text-sm font-bold text-blue-600 border-b border-border pb-2">
            Skills &amp; Tags
          </h2>

          {skillTags.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">スキル・得意分野</p>
              <div className="flex flex-wrap gap-1.5">
                {skillTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm bg-sky-100 text-sky-700 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {canHelpTags.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                これは私に聞け！
              </p>
              <div className="flex flex-wrap gap-1.5">
                {canHelpTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {needHelpTags.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                たすけてほしい！
              </p>
              <div className="flex flex-wrap gap-1.5">
                {needHelpTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SNS ── */}
      {hasSNS && (
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">
            SNS
          </h2>
          <div className="space-y-2">
            {user.instagramId && (
              <a
                href={`https://www.instagram.com/${user.instagramId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <Instagram className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>Instagram: {user.instagramId}</span>
              </a>
            )}
            {user.lineId && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5">
                <AtSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>LINE ID: {user.lineId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 情報なし */}
      {!user.hobbies && !hasSkillsSection && !hasSNS && (
        <div className="bg-card rounded-2xl border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            まだプロフィール情報が登録されていません
          </p>
        </div>
      )}
    </div>
  );
}
