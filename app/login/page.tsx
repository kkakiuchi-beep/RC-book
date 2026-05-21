"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2 } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type ErrorType = "DOMAIN_MISMATCH" | "POPUP_CLOSED" | "UNKNOWN" | null;

const errorMessages: Record<Exclude<ErrorType, null>, string> = {
  DOMAIN_MISMATCH: "会社のGoogleアカウント以外ではログインできません。",
  POPUP_CLOSED: "ログインがキャンセルされました。",
  UNKNOWN: "ログインに失敗しました。もう一度お試しください。",
};

export default function LoginPage() {
  const { signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ErrorType>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/timeline");
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/timeline");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "DOMAIN_MISMATCH") {
        setError("DOMAIN_MISMATCH");
      } else if (
        msg.includes("popup-closed") ||
        msg.includes("cancelled-popup")
      ) {
        setError("POPUP_CLOSED");
      } else {
        setError("UNKNOWN");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-secondary/60 to-background px-4">
      <Card className="w-full max-w-sm shadow-lg border-0">
        <CardHeader className="items-center text-center pt-8 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-md">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">社内ポータル</h1>
          <p className="text-sm text-muted-foreground mt-1">
            社員専用システム
          </p>
        </CardHeader>

        <CardContent className="pb-8 space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={submitting}
            variant="outline"
            size="lg"
            className="w-full gap-3 font-medium text-base h-12 border-border hover:bg-secondary"
          >
            <GoogleIcon />
            {submitting ? "ログイン中..." : "Google でログイン"}
          </Button>

          {error && (
            <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">
                {errorMessages[error]}
              </p>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            会社のGoogleアカウント（@ドメイン）のみ
            <br />
            ご利用いただけます
          </p>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        © 2025 RC Group. All rights reserved.
      </p>
    </div>
  );
}
