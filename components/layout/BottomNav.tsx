"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Activity, LayoutGrid, Users, MessageSquare,
  Shield, HelpCircle, FolderOpen,
} from "lucide-react";
import { canAccessAdmin } from "@/lib/permissions";

const BASE_ITEMS = [
  { label: "TL", href: "/timeline", icon: Activity },
  { label: "掲示板", href: "/board", icon: LayoutGrid },
  { label: "組織図", href: "/org", icon: Users },
  { label: "ファイル", href: "/files", icon: FolderOpen },
  { label: "相談", href: "/consult", icon: HelpCircle },
  { label: "チャット", href: "/chat", icon: MessageSquare },
] as const;

const ADMIN_ITEM = { label: "管理", href: "/admin", icon: Shield } as const;

export function BottomNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const items = canAccessAdmin(appUser) ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

  return (
    <div className="flex items-stretch overflow-x-auto scrollbar-none pb-safe">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] min-w-[52px] transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5 flex-shrink-0", active && "stroke-[2.5px]")} />
            <span className="text-[9px] font-medium leading-none whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
