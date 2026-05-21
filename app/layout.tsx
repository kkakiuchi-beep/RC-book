import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "社内ポータル", template: "%s | 社内ポータル" },
  description: "社内向けポータルサイト",
  icons: {
    icon: "/company-logo.png",
    apple: "/company-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
