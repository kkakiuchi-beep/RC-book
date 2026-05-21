"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, MessageSquare, Instagram, AtSign, Smile, Star, Mail, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useOrg } from "@/hooks/use-org";
import { useChats } from "@/hooks/use-chats";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/lib/types";

export default function OrgPage() {
  const { appUser } = useAuth();
  const { users, depts, loading } = useOrg();
  const { startChat } = useChats();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("全部署");
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<AppUser | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchDept = selectedDept === "全部署" || u.departmentId === selectedDept;
      const matchSearch =
        !search ||
        u.displayName.includes(search) ||
        u.email.includes(search) ||
        (u.departmentName ?? "").includes(search);
      return matchDept && matchSearch;
    });
  }, [users, selectedDept, search]);

  const grouped = depts
    .filter((d) => selectedDept === "全部署" || d.id === selectedDept)
    .map((d) => ({ dept: d, members: filtered.filter((u) => u.departmentId === d.id) }))
    .filter((g) => g.members.length > 0);

  const handleDM = async (other: AppUser, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!appUser) return;
    setDmLoading(other.uid);
    try {
      const chatId = await startChat(other);
      router.push(`/chat/${chatId}`);
    } finally {
      setDmLoading(null);
    }
  };

  const handleDMFromDialog = async () => {
    if (!selectedMember) return;
    setSelectedMember(null);
    await handleDM(selectedMember);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">組織図</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="名前・部署で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        {["全部署", ...depts.map((d) => d.id)].map((id) => {
          const label = id === "全部署" ? "全部署" : depts.find((d) => d.id === id)?.name ?? id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedDept(id)}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
                selectedDept === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:bg-secondary"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <EmptyState icon={Users} title="該当するメンバーがいません" />
      )}

      {!loading && grouped.map(({ dept, members }) => (
        <section key={dept.id}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full inline-block" />
            {dept.name}
            <span className="font-normal">({members.length}名)</span>
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.map((member) => (
              <button
                key={member.uid}
                type="button"
                onClick={() => setSelectedMember(member)}
                className="bg-card rounded-xl border px-4 py-3.5 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors w-full"
              >
                <UserAvatar name={member.displayName} photoURL={member.photoURL} uid={member.uid} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{member.displayName}</p>
                    {member.role !== "staff" && (
                      <Badge
                        variant={ROLE_BADGE_VARIANT[member.role] as "default" | "warning"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                  {/* SNS バッジ */}
                  {(member.instagramId || member.lineId) && (
                    <div className="flex gap-2 mt-1">
                      {member.instagramId && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Instagram className="w-2.5 h-2.5" />
                          @{member.instagramId}
                        </span>
                      )}
                      {member.lineId && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <AtSign className="w-2.5 h-2.5" />
                          {member.lineId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* 自分自身以外に DM ボタン表示 */}
                {appUser && member.uid !== appUser.uid && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                    disabled={dmLoading === member.uid}
                    onClick={(e) => handleDM(member, e)}
                    aria-label={`${member.displayName}さんにDM`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* メンバー詳細ダイアログ */}
      <Dialog open={!!selectedMember} onOpenChange={(o) => !o && setSelectedMember(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {selectedMember && <MemberProfile member={selectedMember} appUser={appUser} onDM={handleDMFromDialog} dmLoading={!!dmLoading} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── メンバープロフィール詳細 ──────────────────────────────────

interface MemberProfileProps {
  member: AppUser;
  appUser: AppUser | null;
  onDM: () => void;
  dmLoading: boolean;
}

function MemberProfile({ member, appUser, onDM, dmLoading }: MemberProfileProps) {
  const isMe = appUser?.uid === member.uid;

  return (
    <div>
      {/* ヘッダー背景 */}
      <div className="h-20 bg-gradient-to-br from-primary/20 to-primary/5" />

      {/* アバター・名前 */}
      <div className="px-5 pb-5">
        <div className="-mt-10 mb-3 flex items-end justify-between">
          {member.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photoURL}
              alt={member.displayName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-background"
            />
          ) : (
            <div className="w-20 h-20 ring-4 ring-background rounded-full">
              <UserAvatar name={member.displayName} uid={member.uid} size="lg" />
            </div>
          )}
          {!isMe && (
            <Button size="sm" className="gap-1.5 mb-1" onClick={onDM} disabled={dmLoading}>
              <MessageSquare className="w-3.5 h-3.5" />
              DM を送る
            </Button>
          )}
        </div>

        <div className="space-y-0.5 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold">{member.displayName}</h3>
            {member.role !== "staff" && (
              <Badge variant={ROLE_BADGE_VARIANT[member.role] as "default" | "warning"} className="text-[10px]">
                {ROLE_LABELS[member.role]}
              </Badge>
            )}
          </div>
          {member.departmentName && (
            <p className="text-sm text-muted-foreground">{member.departmentName}</p>
          )}
        </div>

        {/* 詳細情報 */}
        <div className="space-y-2.5">
          {/* メール */}
          <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="メール">
            <a href={`mailto:${member.email}`} className="text-primary hover:underline text-sm">
              {member.email}
            </a>
          </InfoRow>

          {/* 部署 */}
          {member.departmentName && (
            <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="部署">
              <span className="text-sm">{member.departmentName}</span>
            </InfoRow>
          )}

          {/* Instagram */}
          {member.instagramId && (
            <InfoRow icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram">
              <a
                href={`https://www.instagram.com/${member.instagramId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                @{member.instagramId}
              </a>
            </InfoRow>
          )}

          {/* LINE ID */}
          {member.lineId && (
            <InfoRow icon={<AtSign className="w-3.5 h-3.5" />} label="LINE ID">
              <span className="text-sm">{member.lineId}</span>
            </InfoRow>
          )}

          {/* 趣味 */}
          {member.hobbies && (
            <InfoRow icon={<Smile className="w-3.5 h-3.5" />} label="趣味">
              <p className="text-sm whitespace-pre-wrap">{member.hobbies}</p>
            </InfoRow>
          )}

          {/* 特技 */}
          {member.skills && (
            <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="特技">
              <p className="text-sm whitespace-pre-wrap">{member.skills}</p>
            </InfoRow>
          )}

          {/* 何も登録されていない場合 */}
          {!member.instagramId && !member.lineId && !member.hobbies && !member.skills && (
            <p className="text-xs text-muted-foreground text-center py-2">
              プロフィール情報はまだ登録されていません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
