/**
 * クライアントサイド権限チェックヘルパー
 *
 * ロール定義:
 *   admin   — 全操作可能
 *   manager — 自部署のモデレーション・ユーザー部署編集が可能
 *   staff   — 自分のコンテンツのみ操作可能
 */
import type { AppUser, TimelinePost, Thread } from "./types";

// ── ロール判定 ─────────────────────────────────────────────────
export const isAdmin = (u: AppUser | null | undefined): boolean =>
  u?.role === "admin";

export const isManager = (u: AppUser | null | undefined): boolean =>
  u?.role === "manager";

export const isAdminOrManager = (u: AppUser | null | undefined): boolean =>
  u?.role === "admin" || u?.role === "manager";

// ── 管理画面アクセス ───────────────────────────────────────────
/** admin / manager は管理画面にアクセス可能 */
export const canAccessAdmin = (u: AppUser | null | undefined): boolean =>
  isAdminOrManager(u);

// ── ユーザー・部署管理 ─────────────────────────────────────────
/** ロール変更は admin のみ */
export const canChangeRoles = (u: AppUser | null | undefined): boolean =>
  isAdmin(u);

/** 部署の作成・編集・削除は admin のみ */
export const canManageDepts = (u: AppUser | null | undefined): boolean =>
  isAdmin(u);

/**
 * ユーザーの部署割り当て変更
 * - admin: 全ユーザー対象
 * - manager: 自部署のユーザーのみ
 */
export const canAssignDept = (
  u: AppUser | null | undefined,
  targetUser: AppUser
): boolean => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  if (isManager(u) && u.departmentId === targetUser.departmentId) return true;
  return false;
};

// ── タイムライン ───────────────────────────────────────────────
/** 投稿のピン留めは admin / manager が可能 */
export const canPinPost = (u: AppUser | null | undefined): boolean =>
  isAdminOrManager(u);

/** 投稿の削除 */
export const canDeletePost = (
  u: AppUser | null | undefined,
  post: TimelinePost
): boolean => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  if (u.uid === post.authorId) return true;
  // manager は自部署の投稿を削除可能
  if (isManager(u) && u.departmentId && u.departmentId === post.departmentId)
    return true;
  return false;
};

/** 投稿の編集: author のみ */
export const canEditPost = (
  u: AppUser | null | undefined,
  post: TimelinePost
): boolean => {
  if (!u) return false;
  return u.uid === post.authorId;
};

// ── 掲示板 ────────────────────────────────────────────────────
/** スレッドの解決済みマーク: admin / manager / スレッド投稿者 */
export const canResolveThread = (
  u: AppUser | null | undefined,
  thread: Thread
): boolean => {
  if (!u) return false;
  if (isAdminOrManager(u)) return true;
  return u.uid === thread.authorId;
};

/** スレッドの削除 */
export const canDeleteThread = (
  u: AppUser | null | undefined,
  thread: Thread
): boolean => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  return u.uid === thread.authorId;
};

/** タイムラインコメントの削除: author / admin / manager */
export const canDeleteTimelineComment = (
  u: AppUser | null | undefined,
  comment: { authorId: string }
): boolean => {
  if (!u) return false;
  if (isAdminOrManager(u)) return true;
  return u.uid === comment.authorId;
};

/** 掲示板コメントの削除: author / admin / manager */
export const canDeleteBoardComment = (
  u: AppUser | null | undefined,
  comment: { authorId: string }
): boolean => {
  if (!u) return false;
  if (isAdminOrManager(u)) return true;
  return u.uid === comment.authorId;
};

// ── ロールの表示名 ────────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  staff: "一般",
};

export const ROLE_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "warning"
> = {
  admin: "default",
  manager: "warning",
  staff: "secondary",
};
