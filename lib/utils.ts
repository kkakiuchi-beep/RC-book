import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 日付を「3分前」「2時間前」「5日前」などに変換する */
export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  if (h < 24) return `${h}時間前`;
  if (d < 7) return `${d}日前`;
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

/** 入社日から「X年目」の文字列を返す。未来 or null なら null */
export function calcYearsIn(joinedAt: Date): string | null {
  const now = new Date();
  const months =
    (now.getFullYear() - joinedAt.getFullYear()) * 12 +
    (now.getMonth() - joinedAt.getMonth());
  if (months < 0) return null;
  return `${Math.floor(months / 12) + 1}年目`;
}

/** 入社日を「2022年4月入社（4年目）」形式で返す */
export function formatJoinedAt(joinedAt: Date): string {
  const year = joinedAt.getFullYear();
  const month = joinedAt.getMonth() + 1;
  const yearsIn = calcYearsIn(joinedAt);
  return `${year}年${month}月入社${yearsIn ? `（${yearsIn}）` : ""}`;
}

/** 誕生日を「1990年5月15日生まれ」形式で返す */
export function formatBirthday(birthday: Date): string {
  const year = birthday.getFullYear();
  const month = birthday.getMonth() + 1;
  const day = birthday.getDate();
  return `${year}年${month}月${day}日生まれ`;
}

/** 名前からイニシャルを生成（最大2文字） */
export function getInitials(name: string): string {
  return name.trim().slice(0, 2) || "??";
}

/** アバター用の deterministic カラーを返す */
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function avatarColor(uid: string): string {
  let hash = 0;
  for (const c of uid) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
