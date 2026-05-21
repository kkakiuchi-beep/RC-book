"use client";

import { useState, useEffect, useRef } from "react";
import { updateProfile } from "firebase/auth";
import {
  doc,
  updateDoc,
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Save, User, Instagram, AtSign } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/permissions";
import type { Department } from "@/lib/types";

export default function ProfilePage() {
  const { appUser, refreshAppUser } = useAuth();

  // 基本情報
  const [displayName, setDisplayName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [depts, setDepts] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);

  // SNS
  const [instagramId, setInstagramId] = useState("");
  const [lineId, setLineId] = useState("");

  // 自己紹介
  const [hobbies, setHobbies] = useState("");
  const [skills, setSkills] = useState("");

  // 写真プレビュー
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  // appUser が確定したらフォームに反映
  useEffect(() => {
    if (appUser) {
      setDisplayName(appUser.displayName);
      setDepartmentId(appUser.departmentId ?? "");
      setDepartmentName(appUser.departmentName ?? "");
      setInstagramId(appUser.instagramId ?? "");
      setLineId(appUser.lineId ?? "");
      setHobbies(appUser.hobbies ?? "");
      setSkills(appUser.skills ?? "");
    }
  }, [appUser]);

  // 部署一覧を取得
  useEffect(() => {
    getDocs(query(collection(db, "departments"), orderBy("order", "asc")))
      .then((snap) => {
        if (!snap.empty) {
          setDepts(
            snap.docs.map((d) => ({
              id: d.id,
              name: d.data().name as string,
              order: d.data().order as number,
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setDeptsLoading(false));
  }, []);

  // 写真ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 以下の画像を選択してください");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // 部署変更
  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setDepartmentId(id);
    const dept = depts.find((d) => d.id === id);
    setDepartmentName(dept?.name ?? "");
  };

  // 保存
  const handleSave = async () => {
    if (!appUser || !auth.currentUser) return;
    if (!displayName.trim()) {
      toast.error("表示名を入力してください");
      return;
    }
    setSaving(true);
    try {
      let newPhotoURL: string | null = appUser.photoURL;

      // 写真を Storage にアップロード
      if (photoFile) {
        const sRef = storageRef(storage, `avatars/${appUser.uid}`);
        await uploadBytes(sRef, photoFile);
        newPhotoURL = await getDownloadURL(sRef);
      }

      // Firebase Auth プロフィール更新
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        ...(newPhotoURL ? { photoURL: newPhotoURL } : {}),
      });

      // Firestore 更新
      await updateDoc(doc(db, "users", appUser.uid), {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
        departmentId: departmentId || null,
        departmentName: departmentName || null,
        instagramId: instagramId.trim() || null,
        lineId: lineId.trim() || null,
        hobbies: hobbies.trim() || null,
        skills: skills.trim() || null,
        updatedAt: serverTimestamp(),
      });

      // AuthContext の appUser を最新化
      await refreshAppUser();

      toast.success("プロフィールを更新しました");
      setPhotoFile(null);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
      }
    } catch (e) {
      console.error("profile save:", e);
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    displayName !== (appUser?.displayName ?? "") ||
    departmentId !== (appUser?.departmentId ?? "") ||
    instagramId !== (appUser?.instagramId ?? "") ||
    lineId !== (appUser?.lineId ?? "") ||
    hobbies !== (appUser?.hobbies ?? "") ||
    skills !== (appUser?.skills ?? "") ||
    photoFile !== null;

  if (!appUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-32" />
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <Skeleton className="w-20 h-20 rounded-full mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
      </div>
    );
  }

  const currentPhotoURL = photoPreview ?? appUser.photoURL;

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">プロフィール</h1>
          <p className="text-xs text-muted-foreground">アイコン・基本情報・SNSを編集</p>
        </div>
      </div>

      {/* アバター */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {currentPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentPhotoURL}
                alt={appUser.displayName}
                className="w-24 h-24 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-24 h-24">
                <UserAvatar name={appUser.displayName} uid={appUser.uid} size="lg" />
              </div>
            )}
            {/* カメラボタン */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              aria-label="写真を変更"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {photoFile && (
            <p className="text-xs text-muted-foreground">
              {photoFile.name}（保存するまで反映されません）
            </p>
          )}

          {/* ロールバッジ（変更不可） */}
          <Badge
            variant={ROLE_BADGE_VARIANT[appUser.role] as "default" | "secondary" | "warning"}
          >
            {ROLE_LABELS[appUser.role]}
          </Badge>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">基本情報</h2>

        {/* 表示名 */}
        <div className="space-y-1.5">
          <Label htmlFor="display-name">表示名</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 山田 太郎"
            maxLength={50}
          />
        </div>

        {/* メールアドレス（変更不可） */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">メールアドレス</Label>
          <Input value={appUser.email} disabled className="bg-muted/40 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Google アカウントに紐づいているため変更できません</p>
        </div>

        {/* 部署 */}
        <div className="space-y-1.5">
          <Label htmlFor="department">部署</Label>
          {deptsLoading ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : (
            <select
              id="department"
              value={departmentId}
              onChange={handleDeptChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <option value="">未設定</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* SNS・連絡先 */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">SNS・連絡先</h2>

        {/* Instagram ID */}
        <div className="space-y-1.5">
          <Label htmlFor="instagram-id" className="flex items-center gap-1.5">
            <Instagram className="w-3.5 h-3.5" />
            Instagram ID
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
            <Input
              id="instagram-id"
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
          <Label htmlFor="line-id" className="flex items-center gap-1.5">
            <AtSign className="w-3.5 h-3.5" />
            LINE ID
          </Label>
          <Input
            id="line-id"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="line_id_example"
            maxLength={50}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          入力した情報は社内メンバーに公開されます
        </p>
      </div>

      {/* 趣味・特技 */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">趣味・特技</h2>

        {/* 趣味 */}
        <div className="space-y-1.5">
          <Label htmlFor="hobbies">趣味</Label>
          <Textarea
            id="hobbies"
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
            placeholder="例: 読書、登山、料理..."
            className="resize-none min-h-[80px]"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">{hobbies.length} / 200</p>
        </div>

        {/* 特技 */}
        <div className="space-y-1.5">
          <Label htmlFor="skills">特技</Label>
          <Textarea
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="例: Excel、英会話、プレゼン..."
            className="resize-none min-h-[80px]"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">{skills.length} / 200</p>
        </div>
      </div>

      {/* 保存ボタン */}
      <Button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="w-full gap-2"
        size="lg"
      >
        <Save className="w-4 h-4" />
        {saving ? "保存中…" : "変更を保存"}
      </Button>
    </div>
  );
}
