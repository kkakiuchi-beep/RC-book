import { cn } from "@/lib/utils";

interface MentionContentProps {
  content: string;
  className?: string;
}

/**
 * テキスト内の @メンション をハイライト表示するコンポーネント。
 * `whitespace-pre-wrap` は className で渡すこと。
 */
export function MentionContent({ content, className }: MentionContentProps) {
  const parts = content.split(/(@[^\s@]+)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^@[^\s@]+$/.test(part) ? (
          <span
            key={i}
            className="text-primary font-semibold bg-primary/10 rounded px-0.5"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}
