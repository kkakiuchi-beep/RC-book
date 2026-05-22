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
import {
  Shield, Users, Building2, Plus, Pencil, Trash2,
  ChevronDown, UserCog, ChevronRight,
} from "lucide-react";
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
import { invalidateOrgCache } from "@/hooks/use-org";

// ─── 部署ダイアログ ────────────────────────────────────────────
interface DeptDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Department | null;
  topDepts: Department[]; // 親部署の候補（トップレベルのみ）
  onSave: (name: string, order: number, parentId: string | null) => Promise<void>;
}

function DeptDialog({ open, onOpenChange, initial, topDepts, onSave }: DeptDialogProps) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setOrder(String(initial?.order ?? "0"));
      setParentId(initial?.parentId ?? "");
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), Number(order) || 0, parentId || null);
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
            <Label htmlFor="dept-parent">親部署（任意）</Label>
            <select
              id="dept-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">なし（トップレベル）</option>
              {topDepts
                .filter((d) => d.id !== initial?.id) // 自分自身は選べない
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">部署名</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={parentId ? "例: 1st" : "例: 営業部"}
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
              placeholder="0"
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

// ─── ユーザー部署変更ダイアログ ─────────────────────────────────
interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: AppUser | null;
  depts: Department[];
  onSave: (uid: string, departmentId: string | null, departmentName: string | null) => Promise<void>;
}

function UserEditDialog({ open, onOpenChange, user, depts, onSave }: UserEditDialogProps) {
  const [deptId, setDeptId] = useState(user?.departmentId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDeptId(user?.departmentId ?? "");
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const dept = depts.find((d) => d.id === deptId);
      await onSave(user.uid, deptId || null, dept?.name ?? null);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // 階層表示用：トップレベル→子の順に並べる
  const topDepts = depts.filter((d) => !d.parentId).sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{user?.displayName} の部署を変更</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="user-dept">部署</Label>
            <select
              id="user-dept"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">未設定</option>
              {topDepts.map((top) => {
                const children = depts
                  .filter((d) => d.parentId === top.id)
                  .sort((a, b) => a.order - b.order);
                return [
                  <option key={top.id} value={top.id}>{top.name}</option>,
                  ...children.map((c) => (
                    <option key={c.id} value={c.id}>　└ {c.name}</option>
                  )),
                ];
              })}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            現在: {user?.departmentName ?? "未設定"}
          </p>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : "変更する"}
          </Button>
        </DialogFooter>
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

// ─── 部署一覧（階層表示） ──────────────────────────────────────
function DeptTree({
  depts,
  users,
  onEdit,
  onDelete,
  onAddChild,
}: {
  depts: Department[];
  users: AppUser[];
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const topDepts = depts.filter((d) => !d.parentId).sort((a, b) => a.order - b.order);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const countMembers = (deptId: string): number => {
    const children = depts.filter((d) => d.parentId === deptId);
    return (
      users.filter((u) => u.departmentId === deptId).length +
      children.reduce((sum, c) => sum + countMembers(c.id), 0)
    );
  };

  return (
    <div className="space-y-2">
      {topDepts.map((top) => {
        const children = depts.filter((d) => d.parentId === top.id).sort((a, b) => a.order - b.order);
        const isOpen = expanded.has(top.id);
        const total = countMembers(top.id);

        return (
          <div key={top.id} className="bg-card rounded-xl border overflow-hidden">
            {/* トップレベル部署行 */}
            <div className="px-4 py-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(top.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
                />
                <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm">{top.name}</span>
                <span className="text-xs text-muted-foreground ml-1">{total}名</span>
                {children.length > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">
                    {children.length}チーム
                  </span>
                )}
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onAddChild(top.id)}
                >
                  <Plus className="w-3 h-3" />
                  子追加
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(top)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(top)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* 子部署 */}
            {isOpen && children.length > 0 && (
              <div className="border-t bg-muted/30">
                {children.map((child) => {
                  const childCount = users.filter((u) => u.departmentId === child.id).length;
                  return (
                    <div
                      key={child.id}
                      className="pl-10 pr-4 py-2.5 flex items-center gap-2 border-b last:border-b-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                      <span className="text-sm flex-1">{child.name}</span>
                      <span className="text-xs text-muted-foreground">{childCount}名</span>
                      <span className="text-[10px] text-muted-foreground">順: {child.order}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(child)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(child)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [userEditDialog, setUserEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!authLoading && appUser && !canAccessAdmin(appUser)) {
      router.replace("/timeline");
    }
  }, [appUser, authLoading, router]);

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
              bio: data.bio ?? null,
              instagramId: data.instagramId ?? null,
              lineId: data.lineId ?? null,
              hobbies: data.hobbies ?? null,
              skills: data.skills ?? null,
              canHelp: data.canHelp ?? null,
              needHelp: data.needHelp ?? null,
              joinedAt: (data.joinedAt as Timestamp)?.toDate() ?? null,
              birthday: (data.birthday as string | null) ?? null,
              createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
              updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
            } satisfies AppUser;
          })
        );
      }
    } catch (e) {
      console.error("admin fetchUsers:", e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

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
            parentId: (d.data().parentId as string | null) ?? null,
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

  const changeRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      toast.success(`ロールを「${ROLE_LABELS[newRole]}」に変更しました`);
    } catch {
      toast.error("ロールの変更に失敗しました");
    }
  };

  const changeUserDept = async (
    uid: string,
    departmentId: string | null,
    departmentName: string | null
  ) => {
    try {
      await updateDoc(doc(db, "users", uid), { departmentId, departmentName });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, departmentId, departmentName } : u))
      );
      invalidateOrgCache();
      toast.success(`部署を「${departmentName ?? "未設定"}」に変更しました`);
    } catch {
      toast.error("部署の変更に失敗しました");
      throw new Error("failed");
    }
  };

  const saveDept = async (name: string, order: number, parentId: string | null) => {
    try {
      if (editingDept) {
        await updateDoc(doc(db, "departments", editingDept.id), { name, order, parentId });
        setDepts((prev) =>
          prev.map((d) => (d.id === editingDept.id ? { ...d, name, order, parentId } : d))
        );
        toast.success("部署を更新しました");
      } else {
        const ref = await addDoc(collection(db, "departments"), { name, order, parentId });
        setDepts((prev) => [...prev, { id: ref.id, name, order, parentId }]);
        toast.success("部署を追加しました");
      }
      invalidateOrgCache();
    } catch {
      toast.error("保存に失敗しました");
      throw new Error("save failed");
    } finally {
      setEditingDept(null);
      setDefaultParentId(null);
    }
  };

  const deleteDept = async (dept: Department) => {
    const hasChildren = depts.some((d) => d.parentId === dept.id);
    const hasMembers = users.some((u) => u.departmentId === dept.id);
    if (hasChildren) {
      toast.error("子部署が存在します。先に子部署を削除してください");
      return;
    }
    if (hasMembers) {
      toast.error("この部署に所属しているメンバーがいます");
      return;
    }
    if (!confirm(`「${dept.name}」を削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, "departments", dept.id));
      setDepts((prev) => prev.filter((d) => d.id !== dept.id));
      invalidateOrgCache();
      toast.success("部署を削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const openAddChild = (parentId: string) => {
    setEditingDept(null);
    setDefaultParentId(parentId);
    setDeptDialog(true);
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
  const topDepts = depts.filter((d) => !d.parentId).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
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
                .filter((u) => isAdminUser ? true : u.departmentId === appUser?.departmentId)
                .map((u) => (
                  <div key={u.uid} className="bg-card rounded-xl border px-4 py-3.5 flex items-center gap-3">
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 sm:w-auto sm:px-2 sm:gap-1"
                        onClick={() => { setEditingUser(u); setUserEditDialog(true); }}
                        title="部署を変更"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">部署</span>
                      </Button>
                      {isAdminUser && u.uid !== appUser?.uid && (
                        <RoleDropdown user={u} onChangeRole={changeRole} />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ── 部署管理タブ ── */}
        {canDepts && (
          <TabsContent value="depts" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingDept(null);
                  setDefaultParentId(null);
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
              <DeptTree
                depts={depts}
                users={users}
                onEdit={(dept) => { setEditingDept(dept); setDefaultParentId(null); setDeptDialog(true); }}
                onDelete={deleteDept}
                onAddChild={openAddChild}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      <DeptDialog
        open={deptDialog}
        onOpenChange={(v) => {
          setDeptDialog(v);
          if (!v) { setEditingDept(null); setDefaultParentId(null); }
        }}
        initial={editingDept
          ? editingDept
          : defaultParentId
            ? { id: "", name: "", order: 0, parentId: defaultParentId }
            : null}
        topDepts={topDepts}
        onSave={saveDept}
      />

      <UserEditDialog
        open={userEditDialog}
        onOpenChange={(v) => { setUserEditDialog(v); if (!v) setEditingUser(null); }}
        user={editingUser}
        depts={depts}
        onSave={changeUserDept}
      />
    </div>
  );
}
