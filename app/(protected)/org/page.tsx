"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MessageSquare, Users,
  Instagram, AtSign, Target, HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOrg } from "@/hooks/use-org";
import { useChats } from "@/hooks/use-chats";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { AppUser, Department } from "@/lib/types";

// ── 部署カラーパレット ──────────────────────────────────────
const DEPT_COLORS = [
  "#3B5BA5", "#5B8DB8", "#4A9E7E", "#7B6EA3",
  "#C07040", "#C5A028", "#8B3A3A", "#5A7A40",
  "#2E7D77", "#607D8B",
];

function getDeptColor(deptId: string | null, depts: Department[]): string {
  if (!deptId) return "#94A3B8";
  const idx = depts.findIndex((d) => d.id === deptId);
  return idx >= 0 ? DEPT_COLORS[idx % DEPT_COLORS.length] : "#94A3B8";
}

type TabMode = "people" | "org";
type SortMode = "default" | "name" | "random";

export default function OrgPage() {
  const { appUser } = useAuth();
  const { users, depts, loading } = useOrg();
  const { startChat } = useChats();
  const router = useRouter();

  const [tab, setTab] = useState<TabMode>("people");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [randomSeed, setRandomSeed] = useState(1);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<AppUser | null>(null);

  const filtered = useMemo(() => {
    let result = users.filter((u) => {
      const matchDept = selectedDept === "all" || u.departmentId === selectedDept;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.departmentName ?? "").toLowerCase().includes(q) ||
        (u.skills ?? "").toLowerCase().includes(q) ||
        (u.canHelp ?? "").toLowerCase().includes(q);
      return matchDept && matchSearch;
    });

    if (sort === "name") {
      result = [...result].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "ja")
      );
    } else if (sort === "random") {
      result = [...result].sort((a, b) => {
        const ha = Math.sin(randomSeed + a.uid.split("").reduce((s, c) => s + c.charCodeAt(0), 0));
        const hb = Math.sin(randomSeed + b.uid.split("").reduce((s, c) => s + c.charCodeAt(0), 0));
        return ha - hb;
      });
    }
    return result;
  }, [users, selectedDept, search, sort, randomSeed]);

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

  const handleDMFromDialog = async () => {
    if (!selectedMember) return;
    setSelectedMember(null);
    await handleDM(selectedMember);
  };

  const handleBubbleClick = (deptId: string) => {
    setSelectedDept(deptId);
    setTab("people");
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as SortMode;
    setSort(val);
    if (val === "random") setRandomSeed(Date.now());
  };

  return (
    <div className="space-y-4">
      {/* タブ */}
      <div className="flex gap-0 border-b -mx-4 px-4 md:mx-0 md:px-0">
        {(["people", "org"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "people" ? "人を探す" : "組織を見る"}
          </button>
        ))}
      </div>

      {/* ── 人を探す ── */}
      {tab === "people" && (
        <>
          {/* 検索・フィルター */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="名前・スキル・部署・聞けること で検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="flex-1 h-9 rounded-full border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">すべての部署</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={handleSortChange}
                className="flex-1 h-9 rounded-full border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="default">デフォルト</option>
                <option value="name">名前順</option>
                <option value="random">ランダム</option>
              </select>
            </div>
          </div>

          {/* 件数・クリア */}
          {!loading && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{filtered.length}名</span>
              {(search || selectedDept !== "all") && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSelectedDept("all"); }}
                  className="text-primary hover:underline"
                >
                  クリア
                </button>
              )}
            </div>
          )}

          {/* スケルトン */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-xl border overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState icon={Users} title="該当するメンバーがいません" />
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((member) => {
                const color = getDeptColor(member.departmentId, depts);
                return (
                  <div
                    key={member.uid}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMember(member)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedMember(member);
                    }}
                    className="bg-card rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderTop: `3px solid ${color}` }}
                  >
                    <div className="p-3.5 flex items-start gap-3">
                      {/* カラーアバター */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 select-none"
                        style={{ backgroundColor: color }}
                      >
                        {member.displayName.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-snug">{member.displayName}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {member.departmentName && (
                            <span className="text-[11px] text-muted-foreground">{member.departmentName}</span>
                          )}
                          {member.role !== "staff" && (
                            <Badge
                              variant={ROLE_BADGE_VARIANT[member.role] as "default" | "warning"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {ROLE_LABELS[member.role]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* DM ボタン */}
                      {appUser && member.uid !== appUser.uid && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-primary -mt-0.5"
                          disabled={dmLoading === member.uid}
                          onClick={(e) => { e.stopPropagation(); handleDM(member); }}
                          aria-label={`${member.displayName}さんにDM`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 組織を見る ── */}
      {tab === "org" && (
        <BubbleChart
          users={users}
          depts={depts}
          loading={loading}
          onDeptClick={handleBubbleClick}
        />
      )}

      {/* メンバー詳細ダイアログ */}
      <Dialog open={!!selectedMember} onOpenChange={(o) => !o && setSelectedMember(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectedMember && (
            <MemberProfile
              member={selectedMember}
              appUser={appUser}
              depts={depts}
              onDM={handleDMFromDialog}
              dmLoading={!!dmLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── バブルチャート ──────────────────────────────────────────
function BubbleChart({
  users,
  depts,
  loading,
  onDeptClick,
}: {
  users: AppUser[];
  depts: Department[];
  loading: boolean;
  onDeptClick: (deptId: string) => void;
}) {
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      if (u.departmentId) {
        counts[u.departmentId] = (counts[u.departmentId] ?? 0) + 1;
      }
    });
    return counts;
  }, [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  const CX = 400;
  const CY = 310;
  const LAYOUT_R = 195;

  function wrapText(text: string, maxLen = 5): string[] {
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += maxLen) {
      lines.push(text.slice(i, i + maxLen));
    }
    return lines;
  }

  return (
    <div className="w-full">
      <p className="text-xs text-center text-muted-foreground mb-1">
        部署をクリックすると絞り込みができます
      </p>
      <svg
        viewBox="0 0 800 620"
        className="w-full"
        style={{ maxHeight: "65vh" }}
      >
        {/* 部署バブル */}
        {depts.map((dept, i) => {
          const angle = (i / depts.length) * 2 * Math.PI - Math.PI / 2;
          const count = memberCounts[dept.id] ?? 0;
          const bubbleR = 42 + Math.sqrt(count) * 9;
          const x = CX + LAYOUT_R * Math.cos(angle);
          const y = CY + LAYOUT_R * Math.sin(angle);
          const color = DEPT_COLORS[i % DEPT_COLORS.length];
          const lines = wrapText(dept.name);
          const lineH = 14;
          const totalH = lines.length * lineH;
          const badgeX = x + Math.cos(Math.PI / 4) * bubbleR;
          const badgeY = y + Math.sin(Math.PI / 4) * bubbleR;

          return (
            <g key={dept.id} onClick={() => onDeptClick(dept.id)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={bubbleR} fill={color} />
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={x}
                  y={y - totalH / 2 + lineH * li + lineH * 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={12}
                  fontWeight="600"
                >
                  {line}
                </text>
              ))}
              {/* カウントバッジ */}
              <circle cx={badgeX} cy={badgeY} r={13} fill="white" opacity={0.95} />
              <text
                x={badgeX}
                y={badgeY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={10}
                fontWeight="bold"
              >
                {count}
              </text>
            </g>
          );
        })}

        {/* 中央: 組織図 */}
        <circle cx={CX} cy={CY} r={68} fill="#3B5BA5" />
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={17}
          fontWeight="bold"
        >
          組織図
        </text>
      </svg>
    </div>
  );
}

// ── メンバープロフィール詳細 ────────────────────────────────
interface MemberProfileProps {
  member: AppUser;
  appUser: AppUser | null;
  depts: Department[];
  onDM: () => void;
  dmLoading: boolean;
}

function MemberProfile({ member, appUser, depts, onDM, dmLoading }: MemberProfileProps) {
  const isMe = appUser?.uid === member.uid;
  const color = getDeptColor(member.departmentId, depts);
  const skillTags = member.skills?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const canHelpTags = member.canHelp?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const needHelpTags = member.needHelp?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const hasSkillsSection = skillTags.length > 0 || canHelpTags.length > 0 || needHelpTags.length > 0;
  const hasSNS = !!(member.instagramId || member.lineId);

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="p-4 space-y-3">

        {/* ── ヘッダーカード ── */}
        <div className="bg-card rounded-2xl border p-4">
          <div className="flex items-start gap-3">
            {member.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photoURL}
                alt={member.displayName}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0 ring-2 ring-border"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex-shrink-0 ring-2 ring-border flex items-center justify-center text-white text-xl font-bold select-none"
                style={{ backgroundColor: color }}
              >
                {member.displayName.slice(0, 1)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold leading-snug">{member.displayName}</h3>
                  {member.bio && (
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{member.bio}</p>
                  )}
                </div>
                {!isMe && (
                  <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={onDM} disabled={dmLoading}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    DM
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {member.departmentName && (
                  <span className="text-xs bg-muted rounded-full px-2.5 py-0.5 text-muted-foreground">
                    {member.departmentName}
                  </span>
                )}
                {member.role !== "staff" && (
                  <Badge variant={ROLE_BADGE_VARIANT[member.role] as "default" | "warning"} className="text-[10px]">
                    {ROLE_LABELS[member.role]}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── About ── */}
        {member.hobbies && (
          <div className="bg-card rounded-2xl border p-4">
            <h4 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">About</h4>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{member.hobbies}</p>
          </div>
        )}

        {/* ── Skills & Tags ── */}
        {hasSkillsSection && (
          <div className="bg-card rounded-2xl border p-4 space-y-3">
            <h4 className="text-sm font-bold text-blue-600 border-b border-border pb-2">Skills &amp; Tags</h4>

            {skillTags.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">スキル・得意分野</p>
                <div className="flex flex-wrap gap-1.5">
                  {skillTags.map((tag) => (
                    <span key={tag} className="text-xs bg-sky-100 text-sky-700 rounded-full px-2.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {canHelpTags.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                  これは私に聞け！
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {canHelpTags.map((tag) => (
                    <span key={tag} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {needHelpTags.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
                  たすけてほしい！
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {needHelpTags.map((tag) => (
                    <span key={tag} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5">
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
          <div className="bg-card rounded-2xl border p-4">
            <h4 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">SNS</h4>
            <div className="space-y-2">
              {member.instagramId && (
                <a
                  href={`https://www.instagram.com/${member.instagramId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                >
                  <Instagram className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Instagram: {member.instagramId}</span>
                </a>
              )}
              {member.lineId && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5">
                  <AtSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>LINE ID: {member.lineId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 情報なし */}
        {!member.hobbies && !hasSkillsSection && !hasSNS && (
          <p className="text-xs text-muted-foreground text-center py-4">
            プロフィール情報はまだ登録されていません
          </p>
        )}
      </div>
    </div>
  );
}
