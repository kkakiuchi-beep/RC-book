/**
 * ダミーデータ — Firestore が空の場合 / 開発時の UI 確認用
 * 型は lib/types.ts に準拠
 */
import type {
  AppUser,
  Department,
  TimelinePost,
  Thread,
  ThreadComment,
  DriveLink,
} from "./types";

const ago = (ms: number) => new Date(Date.now() - ms);
const min = 60_000;
const hr = 3_600_000;
const day = 86_400_000;

// ── departments ────────────────────────────────────────────
export const dummyDepts: Department[] = [
  { id: "dept-exec", name: "経営管理部", order: 1 },
  { id: "dept-sales", name: "営業部", order: 2 },
  { id: "dept-dev", name: "開発部", order: 3 },
  { id: "dept-hr", name: "人事・総務部", order: 4 },
];

// ── users ──────────────────────────────────────────────────
const base = { instagramId: null, lineId: null, hobbies: null, skills: null };

export const dummyUsers: AppUser[] = [
  { ...base, uid: "u1", email: "i.kakiuchi@rc-group.co.jp", displayName: "垣内 一郎", photoURL: null, departmentId: "dept-exec", departmentName: "経営管理部", role: "admin", createdAt: ago(30 * day), updatedAt: ago(1 * day) },
  { ...base, uid: "u2", email: "t.yamada@rc-group.co.jp", displayName: "山田 太郎", photoURL: null, departmentId: "dept-exec", departmentName: "経営管理部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(2 * day) },
  { ...base, uid: "u3", email: "t.tanaka@rc-group.co.jp", displayName: "田中 達也", photoURL: null, departmentId: "dept-sales", departmentName: "営業部", role: "manager", createdAt: ago(30 * day), updatedAt: ago(3 * day) },
  { ...base, uid: "u4", email: "m.takahashi@rc-group.co.jp", displayName: "高橋 美穂", photoURL: null, departmentId: "dept-sales", departmentName: "営業部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(4 * day) },
  { ...base, uid: "u5", email: "k.kobayashi@rc-group.co.jp", displayName: "小林 健太", photoURL: null, departmentId: "dept-sales", departmentName: "営業部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(5 * day) },
  { ...base, uid: "u6", email: "h.suzuki@rc-group.co.jp", displayName: "鈴木 花子", photoURL: null, departmentId: "dept-dev", departmentName: "開発部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(6 * day) },
  { ...base, uid: "u7", email: "s.nakamura@rc-group.co.jp", displayName: "中村 さくら", photoURL: null, departmentId: "dept-dev", departmentName: "開発部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(7 * day) },
  { ...base, uid: "u8", email: "t.matsumoto@rc-group.co.jp", displayName: "松本 拓也", photoURL: null, departmentId: "dept-dev", departmentName: "開発部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(8 * day) },
  { ...base, uid: "u9", email: "m.ito@rc-group.co.jp", displayName: "伊藤 美咲", photoURL: null, departmentId: "dept-hr", departmentName: "人事・総務部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(9 * day) },
  { ...base, uid: "u10", email: "k.sato@rc-group.co.jp", displayName: "佐藤 健一", photoURL: null, departmentId: "dept-hr", departmentName: "人事・総務部", role: "staff", createdAt: ago(30 * day), updatedAt: ago(10 * day) },
];

// ── timelinePosts ──────────────────────────────────────────
export const dummyPosts: TimelinePost[] = [
  { id: "p1", authorId: "u2", authorName: "山田 太郎", authorPhotoURL: null, departmentId: "dept-exec", departmentName: "経営管理部", content: "全社ミーティングのお知らせです。今週金曜日 15:00 より第1会議室にて開催します。議題は Q2 の業績振り返りと下半期の方針についてです。全員参加をお願いします 🙏", tags: ["お知らせ"], isPinned: true, likeCount: 24, commentCount: 5, createdAt: ago(3 * hr), updatedAt: ago(3 * hr) },
  { id: "p2", authorId: "u3", authorName: "田中 達也", authorPhotoURL: null, departmentId: "dept-sales", departmentName: "営業部", content: "今月の売上目標を 110% で達成しました！チームの皆さんのおかげです。来月もよろしくお願いします 🎉", tags: ["成果報告"], isPinned: false, likeCount: 18, commentCount: 3, createdAt: ago(5 * hr), updatedAt: ago(5 * hr) },
  { id: "p3", authorId: "u6", authorName: "鈴木 花子", authorPhotoURL: null, departmentId: "dept-dev", departmentName: "開発部", content: "新機能 v2.4 のリリースが完了しました。ユーザー画面のレスポンスが平均 40% 改善されています。不具合があればお気軽にご連絡ください 🛠️", tags: ["リリース"], isPinned: false, likeCount: 11, commentCount: 2, createdAt: ago(1 * day), updatedAt: ago(1 * day) },
  { id: "p4", authorId: "u9", authorName: "伊藤 美咲", authorPhotoURL: null, departmentId: "dept-hr", departmentName: "人事・総務部", content: "健康診断の日程が確定しました。6/2（月）〜6/13（金）の期間で実施します。受診日の予約は 5/23 までに社内サイトから行ってください。", tags: ["HR"], isPinned: false, likeCount: 9, commentCount: 0, createdAt: ago(2 * day), updatedAt: ago(2 * day) },
  { id: "p5", authorId: "u7", authorName: "中村 さくら", authorPhotoURL: null, departmentId: "dept-dev", departmentName: "開発部", content: "コードレビューのガイドラインを更新しました。PRには最低2名のApprovalが必要です。詳細は社内Wikiをご確認ください。", tags: ["開発"], isPinned: false, likeCount: 7, commentCount: 4, createdAt: ago(3 * day), updatedAt: ago(3 * day) },
  { id: "p6", authorId: "u10", authorName: "佐藤 健一", authorPhotoURL: null, departmentId: "dept-hr", departmentName: "人事・総務部", content: "オフィスのエアコンフィルター清掃を実施しました。引き続き快適な環境を保てるよう努めます。", tags: [], isPinned: false, likeCount: 4, commentCount: 0, createdAt: ago(4 * day), updatedAt: ago(4 * day) },
];

// ── threads ────────────────────────────────────────────────
export const dummyThreads: Thread[] = [
  { id: "t1", authorId: "u5", authorName: "小林 健太", authorPhotoURL: null, isAnonymous: false, category: "質問", title: "有給休暇の申請方法を教えてください", content: "入社して初めて有給を取得しようと思っていますが、どのシステムから申請すればよいですか？また、何日前までに申請が必要ですか？", isResolved: true, commentCount: 3, createdAt: ago(2 * day), updatedAt: ago(1 * day) },
  { id: "t2", authorId: "u6", authorName: "鈴木 花子", authorPhotoURL: null, isAnonymous: false, category: "提案", title: "週次の開発定例をオンラインに移行しませんか？", content: "最近リモート勤務メンバーが増えてきたため、週次の開発定例をオンラインに移行することを提案します。Google Meetを使えば全員が参加しやすくなると思います。", isResolved: false, commentCount: 5, createdAt: ago(3 * day), updatedAt: ago(12 * hr) },
  { id: "t3", authorId: "u3", authorName: "匿名", authorPhotoURL: null, isAnonymous: true, category: "雑談", title: "おすすめのランチスポットを教えてください！", content: "最近オフィス周辺のランチスポットを開拓中です。皆さんのおすすめを教えてください 🍱", isResolved: false, commentCount: 8, createdAt: ago(5 * day), updatedAt: ago(2 * day) },
  { id: "t4", authorId: "u9", authorName: "伊藤 美咲", authorPhotoURL: null, isAnonymous: false, category: "報告", title: "新入社員研修プログラムの改定について", content: "今年度から新入社員研修プログラムを改定します。主な変更点は OJT 期間の延長（1ヶ月→2ヶ月）とメンター制度の導入です。詳細は添付の資料をご確認ください。", isResolved: false, commentCount: 2, createdAt: ago(7 * day), updatedAt: ago(6 * day) },
  { id: "t5", authorId: "u8", authorName: "松本 拓也", authorPhotoURL: null, isAnonymous: false, category: "質問", title: "VPN 接続が不安定なのですが…", content: "在宅勤務時に VPN 接続が頻繁に切れてしまいます。同じ症状の方はいますか？解決策があれば教えてください。", isResolved: false, commentCount: 4, createdAt: ago(8 * day), updatedAt: ago(7 * day) },
];

// ── threadComments ─────────────────────────────────────────
export const dummyThreadComments: ThreadComment[] = [
  { id: "c1", threadId: "t1", authorId: "u9", authorName: "伊藤 美咲", authorPhotoURL: null, isAnonymous: false, content: "ポータルの「各種申請」→「有給申請」から手続きできます。原則として3営業日前までの申請をお願いしています。", createdAt: ago(2 * day - 2 * hr) },
  { id: "c2", threadId: "t1", authorId: "u10", authorName: "佐藤 健一", authorPhotoURL: null, isAnonymous: false, content: "補足ですが、繁忙期（3月・9月）は2週間前までにご相談いただけると助かります。", createdAt: ago(1 * day - 3 * hr) },
  { id: "c3", threadId: "t1", authorId: "u5", authorName: "小林 健太", authorPhotoURL: null, isAnonymous: false, content: "ありがとうございます！無事に申請できました 😊", createdAt: ago(1 * day) },
  { id: "c4", threadId: "t2", authorId: "u7", authorName: "中村 さくら", authorPhotoURL: null, isAnonymous: false, content: "賛成です！Meetのリンクを固定URLにしておくと毎週楽ですよね。", createdAt: ago(3 * day - 4 * hr) },
  { id: "c5", threadId: "t2", authorId: "u8", authorName: "松本 拓也", authorPhotoURL: null, isAnonymous: false, content: "ハイブリッドも良いかもしれません。会議室でも参加できるようにしつつ、オンラインも繋げる形で。", createdAt: ago(12 * hr) },
];

// ── driveLinks / fileItems ─────────────────────────────────
export const dummyDriveLinks: DriveLink[] = [
  { id: "d1", title: "2025年度 会社説明資料", driveFileId: null, driveUrl: "https://drive.google.com/file/d/example1", mimeType: "application/pdf", departmentId: null, departmentName: null, addedBy: "u2", addedByName: "山田 太郎", createdAt: ago(5 * day) },
  { id: "d2", title: "第2四半期 売上レポート", driveFileId: null, driveUrl: "https://docs.google.com/spreadsheets/d/example2", mimeType: "application/vnd.google-apps.spreadsheet", departmentId: "dept-sales", departmentName: "営業部", addedBy: "u3", addedByName: "田中 達也", createdAt: ago(3 * day) },
  { id: "d3", title: "在宅勤務申請フォーム", driveFileId: null, driveUrl: "https://docs.google.com/document/d/example3", mimeType: "application/vnd.google-apps.document", departmentId: "dept-hr", departmentName: "人事・総務部", addedBy: "u9", addedByName: "伊藤 美咲", createdAt: ago(10 * day) },
  { id: "d4", title: "採用説明会スライド 2025", driveFileId: null, driveUrl: "https://docs.google.com/presentation/d/example4", mimeType: "application/vnd.google-apps.presentation", departmentId: "dept-hr", departmentName: "人事・総務部", addedBy: "u9", addedByName: "伊藤 美咲", createdAt: ago(15 * day) },
  { id: "d5", title: "システム設計書 v3", driveFileId: null, driveUrl: "https://drive.google.com/file/d/example5", mimeType: "application/pdf", departmentId: "dept-dev", departmentName: "開発部", addedBy: "u7", addedByName: "中村 さくら", createdAt: ago(20 * day) },
  { id: "d6", title: "プロジェクトロードマップ", driveFileId: null, driveUrl: "https://docs.google.com/spreadsheets/d/example6", mimeType: "application/vnd.google-apps.spreadsheet", departmentId: "dept-dev", departmentName: "開発部", addedBy: "u6", addedByName: "鈴木 花子", createdAt: ago(25 * day) },
];

/** dummyDriveLinks の別名エクスポート（後方互換性のため） */
export const fileItems: DriveLink[] = dummyDriveLinks;
