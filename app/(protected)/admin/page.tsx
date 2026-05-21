"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Shield, Users, Building2, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { AppUser, Department, UserRole } from "@/lib/types";
import {
  canChangeRoles,
  canManageDepts,
  canAccessAdmin,
  ROLE_LABELS,
  ROLE_BADGE_VARIANT,
} from "@/lib/permissions";
import { dummyUsers, dummyDepts } from "@/lib/dummy-data";

// ─── 部署ダイアログ ────────────────────────────────────────────
interface DeptDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Department | null;
  onSave: (name: string, order: number) => Promise<void>;
}

function DeptDialog({ open, onOpenChange, initial, onSave }: DeptDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [order, setOrder] = useState(String(initial?.order ?? ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setOrder(String(initial?.order ?? ""));
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), Number(order) || 0);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "部署を編集" : "部署を追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">部署名</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 営業部"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-order">表示順（数字が小さいほど先頭）</Label>
            <Input
              id="dept-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="例: 1"
              min={0}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="submit" disabled={saving || !name.trim()} className="w-full">
              {saving ? "保存中…" : initial ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ロール変更ドロップダウン ──────────────────────────────────
function RoleDropdown({
  user,
  onChangeRole,
}: {
  user: AppUser;
  onChangeRole: (uid: string, role: UserRole) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async (value: string) => {
    setLoading(true);
    try {
      await onChangeRole(user.uid, value as UserRole);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="h-7 px-2 gap-1 text-xs font-medium"
        >
          <Badge
            variant={ROLE_BADGE_VARIANT[user.role] as "default" | "secondary" | "warning"}
            className="text-[10px] px-1.5"
          >
            {ROLE_LABELS[user.role]}
          </Badge>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuLabel>ロールを変更</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={user.role} onValueChange={handleChange}>
          <DropdownMenuRadioItem value="admin">管理者</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="manager">マネージャー</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="staff">一般</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── メインページ ──────────────────────────────────────────────
export default function AdminPage() {
  const { appUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>(dummyUsers);
  const [usersLoading, setUsersLoading] = useState(true);
  const [depts, setDepts] = useState<Department[]>(dummyDepts);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [deptDialog, setDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // admin / manager 以外はリダイレクト
  useEffect(() => {
    if (!authLoading && appUser && !canAccessAdmin(appUser)) {
      router.replace("/timeline");
    }
  }, [appUser, authLoading, router]);

  // ── ユーザー取得 ──
  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      if (!snap.empty) {
        setUsers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              email: data.email ?? "",
              displayName: data.displayName ?? "",
              photoURL: data.photoURL ?? null,
              departmentId: data.departmentId ?? null,
              departmentName: data.departmentName ?? null,
              role: data.role ?? "staff",
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
              updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
            } as AppUser;
          })
        );
      }
    } catch (e) {
      console.error("admin fetchUsers:", e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ── 部署取得 ──
  const fetchDepts = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "departments"), orderBy("order", "asc"))
      );
      if (!snap.empty) {
        setDepts(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name as string,
            order: d.data().order as number,
          }))
        );
      }
    } catch (e) {
      console.error("admin fetchDepts:", e);
    } finally {
      setDeptsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && appUser && canAccessAdmin(appUser)) {
      fetchUsers();
      fetchDepts();
    }
  }, [authLoading, appUser, fetchUsers, fetchDepts]);

  // ── ロール変更（admin のみ） ──
  const changeRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
      toast.success(`ロールを「${ROLE_LABELS[newRole]}」に変更しました`);
    } catch {
      toast.error("ロールの変更に失敗しました");
    }
  };

  // ── 部署保存 ──
  const saveDept = async (name: string, order: number) => {
    try {
      if (editingDept) {
        await updateDoc(doc(db, "departments", editingDept.id), { name, order });
        setDepts((prev) =>
          prev
            .map((d) => (d.id === editingDept.id ? { ...d, name, order } : d))
            .sort((a, b) => a.order - b.order)
        );
        toast.success("部署を更新しました");
      } else {
        const ref = await addDoc(collection(db, "departments"), { name, order });
        setDepts((prev) =>
          [...prev, { id: ref.id, name, order }].sort((a, b) => a.order - b.order)
        );
        toast.success("部署を追加しました");
      }
    } catch {
      toast.error("保存に失敗しました");
      throw new Error("save failed");
    } finally {
      setEditingDept(null);
    }
  };

  // ── 部署削除 ──
  const deleteDept = async (dept: Department) => {
    if (!confirm(`「${dept.name}」を削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, "departments", dept.id));
      setDepts((prev) => prev.filter((d) => d.id !== dept.id));
      toast.success("部署を削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  if (authLoading || (!authLoading && !canAccessAdmin(appUser))) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground text-sm">確認中...</div>
      </div>
    );
  }

  const isAdminUser = canChangeRoles(appUser);
  const canDepts = canManageDepts(appUser);

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">管理画面</h1>
          <p className="text-xs text-muted-foreground">
            {isAdminUser ? "管理者専用エリア" : "マネージャーエリア"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users" className="flex-1 sm:flex-none gap-1.5">
            <Users className="w-3.5 h-3.5" />
            ユーザー管理
            <span className="text-xs text-muted-foreground">({users.length})</span>
          </TabsTrigger>
          {canDepts && (
            <TabsTrigger value="depts" className="flex-1 sm:flex-none gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              部署管理
              <span className="text-xs text-muted-foreground">({depts.length})</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ユーザー管理タブ ── */}
        <TabsContent value="users" className="space-y-2 mt-4">
          {/* manager の場合は自部署のみ表示する旨のメモ */}
          {!isAdminUser && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              自部署（{appUser?.departmentName ?? "未設定"}）のメンバーのみ表示しています
            </p>
          )}

          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="w-20 h-7 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {users
                // manager は自部署のみ表示
                .filter((u) =>
                  isAdminUser
                    ? true
                    : u.departmentId === appUser?.departmentId
                )
                .map((u) => (
                  <div
                    key={u.uid}
                    className="bg-card rounded-xl border px-4 py-3.5 flex items-center gap-3"
                  >
                    <UserAvatar name={u.displayName} photoURL={u.photoURL} uid={u.uid} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{u.displayName}</p>
                        <Badge
                          variant={ROLE_BADGE_VARIANT[u.role] as "default" | "secondary" | "warning"}
                          className="text-[10px] px-1.5"
                        >
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                      {u.departmentName && (
                        <p className="text-xs text-muted-foreground">{u.departmentName}</p>
                      )}
                    </div>
                    {/* ロール変更は admin のみ、自分自身は変更不可 */}
                    {isAdminUser && u.uid !== appUser?.uid && (
                      <RoleDropdown user={u} onChangeRole={changeRole} />
                    )}
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ── 部署管理タブ（admin のみ） ── */}
        {canDepts && (
          <TabsContent value="depts" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingDept(null);
                  setDeptDialog(true);
                }}
              >
                <Plus className="w-4 h-4" />
                部署を追加
              </Button>
            </div>

            {deptsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : depts.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="部署がありません"
                description="「部署を追加」から作成してください"
              />
            ) : (
              <div className="space-y-2">
                {depts.map((dept) => {
                  const memberCount = users.filter((u) => u.departmentId === dept.id).length;
                  return (
                    <div
                      key={dept.id}
                      className="bg-card rounded-xl border px-4 py-3.5 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{dept.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          表示順: {dept.order}　·　{memberCount}名
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptDialog(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteDept(dept)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <DeptDialog
        open={deptDialog}
        onOpenChange={(v) => {
          setDeptDialog(v);
          if (!v) setEditingDept(null);
        }}
        initial={editingDept}
        onSave={saveDept}
      />
    </div>
  );
}
