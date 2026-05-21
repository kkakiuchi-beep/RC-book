"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import type { AppUser } from "@/lib/types";

// テキストから @表示名 にマッチするユーザーを抽出
export function extractMentionedUsers(text: string, users: AppUser[]): AppUser[] {
  const tokens = new Set<string>();
  const pattern = /@([^\s@]+)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    tokens.add(m[1]);
  }
  return users.filter((u) => tokens.has(u.displayName));
}

const BASE_TEXTAREA =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "ring-offset-background placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionedUsersChange?: (users: AppUser[]) => void;
  placeholder?: string;
  /** 外側の wrapper div に当たる className（flex-1 など） */
  wrapperClassName?: string;
  /** textarea 要素のスタイル上書き（border-0, min-h など） */
  className?: string;
  /** メンション候補ユーザー（自分を除いておくこと） */
  allUsers: AppUser[];
  id?: string;
  required?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionedUsersChange,
  placeholder,
  wrapperClassName,
  className,
  allUsers,
  id,
  required,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);

  // カーソル直前の @word を検出
  const detectQuery = (text: string, cursor: number): string | null => {
    const before = text.slice(0, cursor);
    const m = before.match(/@([^\s@]*)$/);
    return m ? m[1] : null;
  };

  const filteredUsers =
    query !== null
      ? allUsers
          .filter(
            (u) =>
              u.displayName.toLowerCase().includes(query.toLowerCase()) ||
              (u.departmentName ?? "").toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 7)
      : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    const cursor = e.target.selectionStart ?? newVal.length;
    setQuery(detectQuery(newVal, cursor));
    onMentionedUsersChange?.(extractMentionedUsers(newVal, allUsers));
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // カーソル移動時も再チェック
    const ta = e.currentTarget;
    const cursor = ta.selectionStart ?? value.length;
    setQuery(detectQuery(value, cursor));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setQuery(null);
  };

  const handleSelect = (user: AppUser) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const newBefore = before.replace(/@([^\s@]*)$/, `@${user.displayName} `);
    const newValue = newBefore + after;
    onChange(newValue);
    onMentionedUsersChange?.(extractMentionedUsers(newValue, allUsers));
    setQuery(null);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  const showDropdown = query !== null && filteredUsers.length > 0;

  return (
    <div className={cn("relative", wrapperClassName)}>
      <textarea
        ref={textareaRef}
        id={id}
        required={required}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        className={cn(BASE_TEXTAREA, className)}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
          <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1 font-medium">メンション</p>
          <div className="max-h-44 overflow-y-auto pb-1">
            {filteredUsers.map((user) => (
              <button
                key={user.uid}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // blur を防ぐ
                  handleSelect(user);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
              >
                <UserAvatar
                  name={user.displayName}
                  uid={user.uid}
                  photoURL={user.photoURL}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">@{user.displayName}</p>
                  {user.departmentName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.departmentName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
