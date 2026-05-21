# 社内ポータル

Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + Firebase による社内向けポータルサイト。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` に以下を記入：

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API キー |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 認証ドメイン |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | プロジェクト ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage バケット |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | メッセージング送信者 ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | アプリ ID |
| `NEXT_PUBLIC_ALLOWED_DOMAIN` | ログイン許可ドメイン例: `rc-group.co.jp` |

### 3. Firebase の設定

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** → ログイン方法 → **Google** を有効化
3. **Firestore Database** を作成（本番ルールは後述）
4. **セキュリティルール**を `firestore.rules` の内容で設定

### 4. 開発サーバー起動

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

---

## ページ構成

| URL | 説明 |
|-----|------|
| `/login` | Google ログイン（会社ドメイン限定） |
| `/timeline` | 社内タイムライン（投稿・いいね） |
| `/board` | 相談掲示板（スレッド一覧） |
| `/board/[threadId]` | スレッド詳細・コメント |
| `/org` | 組織図（部署別メンバー・検索） |
| `/files` | Google Drive ファイル共有 |
| `/profile` | プロフィール設定（表示名・部署・写真） |
| `/admin` | 管理画面（admin / manager） |

---

## ディレクトリ構成

```
company-portal/
├── app/
│   ├── layout.tsx              # ルートレイアウト (AuthProvider + Toaster)
│   ├── login/page.tsx          # ログイン画面
│   └── (protected)/            # 認証必須ルート群
│       ├── layout.tsx          # 認証ガード + AppLayout
│       ├── timeline/           # タイムライン
│       ├── board/              # 掲示板
│       │   └── [threadId]/     # スレッド詳細
│       ├── org/                # 組織図
│       ├── files/              # ファイル
│       └── admin/              # 管理画面
├── components/
│   ├── layout/                 # AppLayout, Sidebar, BottomNav
│   ├── shared/                 # EmptyState, UserAvatar
│   ├── timeline/               # PostCard, PostForm
│   ├── board/                  # ThreadCard, ThreadForm, CommentSection
│   ├── files/                  # AddFileDialog
│   └── ui/                     # shadcn/ui コンポーネント
├── hooks/
│   ├── use-timeline.ts         # タイムライン (onSnapshot)
│   ├── use-board.ts            # 掲示板スレッド・コメント
│   ├── use-org.ts              # 組織図データ
│   └── use-files.ts            # Drive ファイル
├── lib/
│   ├── auth.tsx                # AuthContext (user + appUser + role)
│   ├── firebase.ts             # Firebase 初期化
│   ├── types.ts                # Firestore 型定義
│   ├── dummy-data.ts           # 開発用ダミーデータ
│   ├── drive.ts                # Google Drive Picker スタブ
│   └── utils.ts                # cn, relativeTime, avatarColor
├── public/
│   └── logo-placeholder.svg   # 仮ロゴ（あとで差し替え）
└── firestore.rules             # Firestore セキュリティルール
```

---

## Firestore コレクション

| コレクション | 説明 |
|-------------|------|
| `users` | ログインユーザー情報・ロール |
| `departments` | 部署マスタ |
| `timelinePosts` | タイムライン投稿 |
| `timelineComments` | 投稿コメント |
| `likes` | いいね (`{postId}__{userId}`) |
| `threads` | 掲示板スレッド |
| `threadComments` | スレッドコメント |
| `driveLinks` | Drive ファイルリンク |

---

## 管理者の設定方法

初回ログイン後、Firestore コンソールで `users/{uid}` の `role` フィールドを `"admin"` に変更してください。

---

## Google Drive Picker の実装

`lib/drive.ts` の `openDrivePicker()` にコメントアウトされた実装例があります。  
Google Cloud Console で Drive API と Picker API を有効化し、環境変数を追加してください：

```env
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

---

## 技術スタック

| カテゴリ | 採用技術 |
|---------|---------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript (strict) |
| スタイル | Tailwind CSS v3 |
| UIコンポーネント | shadcn/ui (New York) |
| 認証・DB | Firebase v11 (Auth + Firestore) |
| アイコン | Lucide React |
| トースト | Sonner |
