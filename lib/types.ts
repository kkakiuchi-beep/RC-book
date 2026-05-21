// Firestore コレクション型定義
// すべての Date フィールドは Firestore Timestamp から toDate() で変換する

export type UserRole = "admin" | "manager" | "staff";

// ── users コレクション ─────────────────────────────────────
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  departmentId: string | null;
  departmentName: string | null;
  role: UserRole;
  // プロフィール追加情報
  instagramId: string | null;
  lineId: string | null;
  hobbies: string | null;
  skills: string | null;
  bio: string | null;       // ひとこと（名前の下に表示）
  canHelp: string | null;   // カンマ区切り「これは私に聞け！」
  needHelp: string | null;  // カンマ区切り「たすけてほしい！」
  createdAt: Date;
  updatedAt: Date;
}

// ── departments コレクション ───────────────────────────────
export interface Department {
  id: string;
  name: string;
  order: number;
}

// ── timelinePosts コレクション ─────────────────────────────
export interface TimelinePost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  departmentId: string | null;
  departmentName: string | null;
  content: string;
  tags: string[];
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── timelineComments コレクション ──────────────────────────
export interface TimelineComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  createdAt: Date;
}

// ── likes コレクション (id = postId__userId) ───────────────
export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

// ── threads コレクション (掲示板) ─────────────────────────
export type ThreadCategory = "雑談" | "質問" | "報告" | "提案";

export interface Thread {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  isAnonymous: boolean;
  category: ThreadCategory;
  title: string;
  content: string;
  isResolved: boolean;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── threadComments コレクション ────────────────────────────
export interface ThreadComment {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  isAnonymous: boolean;
  content: string;
  createdAt: Date;
}

// ── notifications コレクション ─────────────────────────────────
export type NotificationType = "comment" | "thread_comment" | "like" | "mention";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedId: string;
  relatedPath: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhotoURL: string | null;
  isRead: boolean;
  createdAt: Date;
}

// ── chats / chatMessages コレクション ─────────────────────────
export interface Chat {
  id: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  memberPhotoURLs: Record<string, string | null>;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageBy: string;
  unreadCounts: Record<string, number>;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  createdAt: Date;
}

// ── driveLinks コレクション ────────────────────────────────
export type DriveFileMime =
  | "application/pdf"
  | "application/vnd.google-apps.spreadsheet"
  | "application/vnd.google-apps.document"
  | "application/vnd.google-apps.presentation"
  | "application/vnd.google-apps.folder"
  | "image/png"
  | "image/jpeg"
  | "other";

export interface DriveLink {
  id: string;
  title: string;
  driveFileId: string | null;
  driveUrl: string;
  mimeType: DriveFileMime;
  departmentId: string | null;
  departmentName: string | null;
  addedBy: string;
  addedByName: string;
  createdAt: Date;
}
