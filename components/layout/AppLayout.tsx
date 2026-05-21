"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-secondary/20">
      {/* PC サイドバー */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-shrink-0 bg-background">
        <Sidebar />
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー（スマホ + PC 共通） */}
        <Header />

        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full pb-20 md:pb-6">
            <div className="max-w-2xl mx-auto px-4 py-5 md:px-6">{children}</div>
          </div>
        </main>
      </div>

      {/* スマホ下部ナビ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t">
        <BottomNav />
      </nav>
    </div>
  );
}
