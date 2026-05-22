"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MessageSquare, Users,
  Instagram, AtSign, Target, HelpCircle, ArrowLeft, CalendarDays, Cake,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOrg } from "@/hooks/use-org";
import { useChats } from "@/hooks/use-chats";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/permissions";
import { cn, formatJoinedAt, formatBirthday } from "@/lib/utils";
import type { AppUser, Department } from "@/lib/types";

// ── 部署カラーパレット ──────────────────────────────────────
const DEPT_COLORS = [
  "#3B5BA5", "#5B8DB8", "#4A9E7E", "#7B6EA3",
  "#C07040", "#C5A028", "#8B3A3A", "#5A7A40",
  "#2E7D77", "#607D8B",
];

/** 子部署はルート部署の色を返す */
function getDeptColor(deptId: string | null, depts: Department[]): string {
  if (!deptId) return "#94A3B8";
  let id = deptId;
  for (let i = 0; i < 10; i++) {
    const dept = depts.find((d) => d.id === id);
    if (!dept || dept.parentId === null) break;
    id = dept.parentId;
  }
  const topLevel = depts.filter((d) => d.parentId === null);
  const idx = topLevel.findIndex((d) => d.id === id);
  return idx >= 0 ? DEPT_COLORS[idx % DEPT_COLORS.length] : "#94A3B8";
}

/** deptId の子孫 ID を再帰的に収集（自身を含む） */
function getDescendantIds(deptId: string, depts: Department[]): string[] {
  const children = depts.filter((d) => d.parentId === deptId);
  return [deptId, ...children.flatMap((c) => getDescendantIds(c.id, depts))];
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

  // 組織を見るタブ: 選択中の部署（バブルクリック後の詳細表示）
  const [focusedDeptId, setFocusedDeptId] = useState<string | null>(null);

  // 部署フィルター用: トップレベル → 子の順で並べる
  const deptSelectOptions = useMemo(() => {
    const topLevel = depts.filter((d) => d.parentId === null);
    const result: { id: string; label: string }[] = [];
    for (const parent of topLevel) {
      result.push({ id: parent.id, label: parent.name });
      const children = depts
        .filter((d) => d.parentId === parent.id)
        .sort((a, b) => a.order - b.order);
      for (const child of children) {
        result.push({ id: child.id, label: `　└ ${child.name}` });
      }
    }
    return result;
  }, [depts]);

  const filtered = useMemo(() => {
    let result = users.filter((u) => {
      let matchDept = false;
      if (selectedDept === "all") {
        matchDept = true;
      } else {
        const descendantIds = getDescendantIds(selectedDept, depts);
        matchDept = u.departmentId !== null && descendantIds.includes(u.departmentId);
      }
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
  }, [users, depts, selectedDept, search, sort, randomSeed]);

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
            onClick={() => {
              setTab(t);
              if (t === "org") setFocusedDeptId(null);
            }}
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
                {deptSelectOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
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
        focusedDeptId ? (
          <DeptDetail
            deptId={focusedDeptId}
            users={users}
            depts={depts}
            onBack={() => setFocusedDeptId(null)}
            onMemberClick={setSelectedMember}
          />
        ) : (
          <BubbleChart
            users={users}
            depts={depts}
            loading={loading}
            onDeptClick={setFocusedDeptId}
          />
        )
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
  // トップレベル部署のみ表示
  const topDepts = useMemo(
    () => depts.filter((d) => d.parentId === null).sort((a, b) => a.order - b.order),
    [depts]
  );

  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      if (u.departmentId) {
        // 子部署メンバーはルート部署のカウントに合算
        const rootId = (() => {
          let id = u.departmentId;
          for (let i = 0; i < 10; i++) {
            const d = depts.find((x) => x.id === id);
            if (!d || d.parentId === null) return id;
            id = d.parentId;
          }
          return id;
        })();
        counts[rootId] = (counts[rootId] ?? 0) + 1;
      }
    });
    return counts;
  }, [users, depts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  const n = topDepts.length;
  // 部署数に応じてレイアウト半径を調整（viewBox 400×400、中心200,200）
  // 制約: LAYOUT_R + getBubbleR(max) + BADGE_R < 200
  const LAYOUT_R = n <= 3 ? 118 : n <= 5 ? 128 : n <= 7 ? 138 : 146;
  const CENTER_R = 44;
  const BADGE_R = 11;
  const FONT_SIZE = 10;
  const BADGE_FONT = 9;
  const LINE_H = 13;

  const getBubbleR = (count: number) => 26 + Math.sqrt(count) * 6;

  const wrapText = (text: string, maxLen = 4): string[] => {
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += maxLen) {
      lines.push(text.slice(i, i + maxLen));
    }
    return lines;
  };

  return (
    <div className="w-full">
      <p className="text-xs text-center text-muted-foreground mb-2">
        部署をタップするとメンバーを確認できます
      </p>
      {/* min(100%, 480px): モバイルは全幅・PCは480px上限で中央揃え */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 400 400"
          style={{ width: "min(100%, 480px)", height: "auto" }}
          aria-label="組織図バブルチャート"
        >
          {topDepts.map((dept, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const count = memberCounts[dept.id] ?? 0;
            const bubbleR = getBubbleR(count);
            const cx = 200 + LAYOUT_R * Math.cos(angle);
            const cy = 200 + LAYOUT_R * Math.sin(angle);
            const color = DEPT_COLORS[i % DEPT_COLORS.length];
            const lines = wrapText(dept.name);
            const totalH = lines.length * LINE_H;
            // バッジは45°方向（右下）に配置
            const bx = cx + Math.cos(Math.PI / 4) * bubbleR;
            const by = cy + Math.sin(Math.PI / 4) * bubbleR;

            return (
              <g
                key={dept.id}
                onClick={() => onDeptClick(dept.id)}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`${dept.name} ${count}名`}
              >
                <circle cx={cx} cy={cy} r={bubbleR} fill={color} />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={cx}
                    y={cy - totalH / 2 + LINE_H * li + LINE_H * 0.65}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={FONT_SIZE}
                    fontWeight="700"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {line}
                  </text>
                ))}
                {/* メンバー数バッジ */}
                <circle cx={bx} cy={by} r={BADGE_R} fill="white" />
                <text
                  x={bx}
                  y={by}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize={BADGE_FONT}
                  fontWeight="bold"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {count}
                </text>
              </g>
            );
          })}

          {/* 中央ラベル */}
          <circle cx={200} cy={200} r={CENTER_R} fill="#3B5BA5" />
          <text
            x={200}
            y={200}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={13}
            fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            組織図
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── 部署詳細（バブルクリック後）─────────────────────────────
function DeptDetail({
  deptId,
  users,
  depts,
  onBack,
  onMemberClick,
}: {
  deptId: string;
  users: AppUser[];
  depts: Department[];
  onBack: () => void;
  onMemberClick: (member: AppUser) => void;
}) {
  const dept = depts.find((d) => d.id === deptId);
  const color = getDeptColor(deptId, depts);
  const childDepts = depts
    .filter((d) => d.parentId === deptId)
    .sort((a, b) => a.order - b.order);
  const totalCount = users.filter((u) => {
    if (!u.departmentId) return false;
    return getDescendantIds(deptId, depts).includes(u.departmentId);
  }).length;
  const directMembers = users.filter((u) => u.departmentId === deptId);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <h2 className="font-bold text-base">{dept?.name}</h2>
          <span className="text-sm text-muted-foreground">{totalCount}名</span>
        </div>
      </div>

      {/* 子部署がある場合 → セクションに分けて表示 */}
      {childDepts.length > 0 ? (
        <div className="space-y-3">
          {/* 直属メンバー（いれば） */}
          {directMembers.length > 0 && (
            <MemberSection
              label="直属メンバー"
              members={directMembers}
              color={color}
              onMemberClick={onMemberClick}
            />
          )}
          {/* 子部署ごと */}
          {childDepts.map((child) => {
            const childMembers = users.filter((u) => u.departmentId === child.id);
            return (
              <MemberSection
                key={child.id}
                label={child.name}
                members={childMembers}
                color={color}
                onMemberClick={onMemberClick}
              />
            );
          })}
        </div>
      ) : (
        /* 子部署なし → 直接メンバー一覧 */
        directMembers.length > 0 ? (
          <MemberSection
            label={dept?.name ?? ""}
            members={directMembers}
            color={color}
            showLabel={false}
            onMemberClick={onMemberClick}
          />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            メンバーはいません
          </p>
        )
      )}
    </div>
  );
}

// ── メンバーセクション ──────────────────────────────────────
function MemberSection({
  label,
  members,
  color,
  showLabel = true,
  onMemberClick,
}: {
  label: string;
  members: AppUser[];
  color: string;
  showLabel?: boolean;
  onMemberClick: (member: AppUser) => void;
}) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      {showLabel && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40"
          style={{ borderLeft: `3px solid ${color}` }}
        >
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">{members.length}名</span>
        </div>
      )}
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">メンバーなし</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
          {members.map((member) => (
            <button
              key={member.uid}
              type="button"
              onClick={() => onMemberClick(member)}
              className="flex items-center gap-2 bg-muted/40 rounded-lg p-2 min-w-0 text-left hover:bg-muted transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
                style={{ backgroundColor: color }}
              >
                {member.displayName.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate leading-snug">{member.displayName}</p>
                {member.role !== "staff" && (
                  <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[member.role]}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
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
              {member.joinedAt && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 flex-shrink-0" />
                  {formatJoinedAt(member.joinedAt)}
                </p>
              )}
              {member.birthday && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Cake className="w-3 h-3 flex-shrink-0" />
                  {formatBirthday(member.birthday)}
                </p>
              )}
            </div>
          </div>
        </div>

        {member.hobbies && (
          <div className="bg-card rounded-2xl border p-4">
            <h4 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">About</h4>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{member.hobbies}</p>
          </div>
        )}

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

        {!member.hobbies && !hasSkillsSection && !hasSNS && (
          <p className="text-xs text-muted-foreground text-center py-4">
            プロフィール情報はまだ登録されていません
          </p>
        )}
      </div>
    </div>
  );
}
