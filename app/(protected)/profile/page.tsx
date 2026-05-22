"use client";

import { useState, useEffect } from "react";
import { updateProfile } from "firebase/auth";
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil, Save, X, Instagram, AtSign, Target, HelpCircle, CalendarDays, Cake,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/permissions";
import { formatJoinedAt, formatBirthday } from "@/lib/utils";
import type { Department } from "@/lib/types";

const CURRENT_YEAR = new Date().getFullYear();
const JOIN_YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) => CURRENT_YEAR - i);

function parseTags(str: string | null | undefined): string[] {
  if (!str) return [];
  return str.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function ProfilePage() {
  const { appUser, refreshAppUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // フォーム state
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [skills, setSkills] = useState("");
  const [canHelp, setCanHelp] = useState("");
  const [needHelp, setNeedHelp] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [lineId, setLineId] = useState("");
  const [joinYear, setJoinYear] = useState<string>("");
  const [joinMonth, setJoinMonth] = useState<string>("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");
  const [depts, setDepts] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);

  useEffect(() => {
    if (appUser) {
      setBio(appUser.bio ?? "");
      setDisplayName(appUser.displayName);
      setDepartmentId(appUser.departmentId ?? "");
      setDepartmentName(appUser.departmentName ?? "");
      setHobbies(appUser.hobbies ?? "");
      setSkills(appUser.skills ?? "");
      setCanHelp(appUser.canHelp ?? "");
      setNeedHelp(appUser.needHelp ?? "");
      setInstagramId(appUser.instagramId ?? "");
      setLineId(appUser.lineId ?? "");
      setJoinYear(appUser.joinedAt ? String(appUser.joinedAt.getFullYear()) : "");
      setJoinMonth(appUser.joinedAt ? String(appUser.joinedAt.getMonth() + 1) : "");
      setBirthYear(appUser.birthday ? String(appUser.birthday.getFullYear()) : "");
      setBirthMonth(appUser.birthday ? String(appUser.birthday.getMonth() + 1) : "");
      setBirthDay(appUser.birthday ? String(appUser.birthday.getDate()) : "");
    }
  }, [appUser]);

  useEffect(() => {
    getDocs(query(collection(db, "departments"), orderBy("order", "asc")))
      .then((snap) => {
        if (!snap.empty) {
          setDepts(
            snap.docs.map((d) => ({
              id: d.id,
              name: d.data().name as string,
              order: d.data().order as number,
              parentId: (d.data().parentId as string | null) ?? null,
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setDeptsLoading(false));
  }, []);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setDepartmentId(id);
    const dept = depts.find((d) => d.id === id);
    setDepartmentName(dept?.name ?? "");
  };

  const handleSave = async () => {
    if (!appUser || !auth.currentUser) return;
    if (!displayName.trim()) {
      toast.error("表示名を入力してください");
      return;
    }
    setSaving(true);
    try {
      // Firebase Auth 表示名を更新
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });

      // 入社年月 → Date（月初）に変換
      const joinedAtDate =
        joinYear && joinMonth
          ? new Date(Number(joinYear), Number(joinMonth) - 1, 1)
          : null;

      // 誕生日 → Date に変換
      const birthdayDate =
        birthYear && birthMonth && birthDay
          ? new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay))
          : null;

      // Firestore 更新
      await updateDoc(doc(db, "users", appUser.uid), {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        departmentId: departmentId || null,
        departmentName: departmentName || null,
        hobbies: hobbies.trim() || null,
        skills: skills.trim() || null,
        canHelp: canHelp.trim() || null,
        needHelp: needHelp.trim() || null,
        instagramId: instagramId.trim() || null,
        lineId: lineId.trim() || null,
        joinedAt: joinedAtDate,
        birthday: birthdayDate,
        updatedAt: serverTimestamp(),
      });

      await refreshAppUser();
      toast.success("プロフィールを更新しました");
      setEditing(false);
    } catch (e) {
      console.error(e);
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!appUser) {
    return (
      <div className="space-y-3 max-w-2xl">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const skillTags = parseTags(appUser.skills);
  const canHelpTags = parseTags(appUser.canHelp);
  const needHelpTags = parseTags(appUser.needHelp);
  const hasSkillsSection =
    skillTags.length > 0 || canHelpTags.length > 0 || needHelpTags.length > 0;
  const hasSNS = !!(appUser.instagramId || appUser.lineId);

  return (
    <div className="space-y-3 max-w-2xl">
      {/* ── プロフィールヘッダー ── */}
      <div className="bg-card rounded-2xl border p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Googleアカウントのアイコン（変更不可） */}
          {appUser.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={appUser.photoURL}
              alt={appUser.displayName}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 ring-2 ring-border"
            />
          ) : (
            <div className="w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0">
              <UserAvatar name={appUser.displayName} uid={appUser.uid} size="lg" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold leading-snug">{appUser.displayName}</h1>
                {appUser.bio && (
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {appUser.bio}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-shrink-0"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    キャンセル
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    編集
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {appUser.departmentName && (
                <span className="text-xs bg-muted rounded-full px-2.5 py-0.5 text-muted-foreground">
                  {appUser.departmentName}
                </span>
              )}
              <Badge variant={ROLE_BADGE_VARIANT[appUser.role] as "default" | "warning"}>
                {ROLE_LABELS[appUser.role]}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{appUser.email}</span>
            </div>
            {appUser.joinedAt && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3 flex-shrink-0" />
                {formatJoinedAt(appUser.joinedAt)}
              </p>
            )}
            {appUser.birthday && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Cake className="w-3 h-3 flex-shrink-0" />
                {formatBirthday(appUser.birthday)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 編集フォーム ── */}
      {editing && (
        <div className="bg-card rounded-2xl border p-5 space-y-5">
          <h2 className="text-sm font-bold text-blue-600 border-b pb-2">プロフィール編集</h2>

          {/* 表示名 */}
          <div className="space-y-1.5">
            <Label htmlFor="name">表示名</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* ひとこと */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">ひとこと</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="例: コーヒーと料理が好きです"
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length} / 80</p>
          </div>

          {/* 部署 */}
          <div className="space-y-1.5">
            <Label>部署</Label>
            {deptsLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <select
                value={departmentId}
                onChange={handleDeptChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">未設定</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 入社年月 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              入社年月
            </Label>
            <div className="flex gap-2">
              <select
                value={joinYear}
                onChange={(e) => setJoinYear(e.target.value)}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">年を選択</option>
                {JOIN_YEARS.map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select
                value={joinMonth}
                onChange={(e) => setJoinMonth(e.target.value)}
                className="w-32 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">月を選択</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
            {joinYear && joinMonth && (
              <p className="text-xs text-muted-foreground">
                {formatJoinedAt(new Date(Number(joinYear), Number(joinMonth) - 1, 1))}
              </p>
            )}
          </div>

          {/* 誕生日 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5 text-muted-foreground" />
              誕生日
            </Label>
            <div className="flex gap-2">
              <select
                value={birthYear}
                onChange={(e) => {
                  setBirthYear(e.target.value);
                  // 月・日が選択済みの場合、その月の最大日数を超えていたらリセット
                  if (birthMonth && birthDay) {
                    const max = new Date(Number(e.target.value), Number(birthMonth), 0).getDate();
                    if (Number(birthDay) > max) setBirthDay(String(max));
                  }
                }}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">年を選択</option>
                {Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select
                value={birthMonth}
                onChange={(e) => {
                  setBirthMonth(e.target.value);
                  if (birthDay) {
                    const max = new Date(Number(birthYear) || 2000, Number(e.target.value), 0).getDate();
                    if (Number(birthDay) > max) setBirthDay(String(max));
                  }
                }}
                className="w-24 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="w-24 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">日</option>
                {Array.from(
                  { length: birthMonth ? new Date(Number(birthYear) || 2000, Number(birthMonth), 0).getDate() : 31 },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>
            </div>
            {birthYear && birthMonth && birthDay && (
              <p className="text-xs text-muted-foreground">
                {formatBirthday(new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay)))}
              </p>
            )}
          </div>

          {/* About */}
          <div className="space-y-1.5">
            <Label htmlFor="about">About（自己紹介・趣味・出身地など）</Label>
            <Textarea
              id="about"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              placeholder="自由に書いてください"
              className="resize-none min-h-[100px]"
              maxLength={400}
            />
            <p className="text-xs text-muted-foreground text-right">{hobbies.length} / 400</p>
          </div>

          {/* スキル */}
          <div className="space-y-1.5">
            <Label htmlFor="skills">スキル・得意分野</Label>
            <Input
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="例: Excel,プレゼン,動画編集（カンマ区切り）"
              maxLength={200}
            />
            {skills && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parseTags(skills).map((tag) => (
                  <span key={tag} className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* これは私に聞け！ */}
          <div className="space-y-1.5">
            <Label htmlFor="can-help" className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              これは私に聞け！
            </Label>
            <Input
              id="can-help"
              value={canHelp}
              onChange={(e) => setCanHelp(e.target.value)}
              placeholder="例: SNS広告,Canva（カンマ区切り）"
              maxLength={200}
            />
            {canHelp && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parseTags(canHelp).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* たすけてほしい！ */}
          <div className="space-y-1.5">
            <Label htmlFor="need-help" className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
              たすけてほしい！
            </Label>
            <Input
              id="need-help"
              value={needHelp}
              onChange={(e) => setNeedHelp(e.target.value)}
              placeholder="例: 関数,デザインスキル（カンマ区切り）"
              maxLength={200}
            />
            {needHelp && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parseTags(needHelp).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Instagram */}
          <div className="space-y-1.5">
            <Label htmlFor="instagram" className="flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5" />
              Instagram ID
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
              <Input
                id="instagram"
                value={instagramId}
                onChange={(e) => setInstagramId(e.target.value.replace(/^@/, ""))}
                placeholder="username"
                className="pl-7"
                maxLength={30}
              />
            </div>
          </div>

          {/* LINE ID */}
          <div className="space-y-1.5">
            <Label htmlFor="line" className="flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" />
              LINE ID
            </Label>
            <Input
              id="line"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder="line_id_example"
              maxLength={50}
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "保存中…" : "保存する"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {/* ── About ── */}
      {!editing && appUser.hobbies && (
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">
            About
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {appUser.hobbies}
          </p>
        </div>
      )}

      {/* ── Skills & Tags ── */}
      {!editing && hasSkillsSection && (
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
      {!editing && hasSNS && (
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-bold text-blue-600 border-b border-border pb-2 mb-3">
            SNS
          </h2>
          <div className="space-y-2">
            {appUser.instagramId && (
              <a
                href={`https://www.instagram.com/${appUser.instagramId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <Instagram className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="text-foreground">Instagram: {appUser.instagramId}</span>
              </a>
            )}
            {appUser.lineId && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5">
                <AtSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>LINE ID: {appUser.lineId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* まだ情報がない場合 */}
      {!editing && !appUser.hobbies && !hasSkillsSection && !hasSNS && (
        <div className="bg-card rounded-2xl border p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            まだプロフィール情報が登録されていません
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
            プロフィールを編集する
          </Button>
        </div>
      )}
    </div>
  );
}
