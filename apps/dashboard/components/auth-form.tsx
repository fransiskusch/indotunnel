"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login, signup, ApiError } from "@/lib/api";
import Link from "next/link";
import { Terminal, Lock, Mail, ArrowRight } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") await signup(email, password);
      else await login(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-zinc-800 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="text-center pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <Terminal className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl font-bold justify-center text-white">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1">
          {mode === "signup" ? "Get your free IndoTunnel developer account" : "Sign in to access your tunnel gateway & logs"}
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-500" /> Email address
            </label>
            <Input
              type="email"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-zinc-500" /> Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={busy}>
            {busy ? (
              "Authenticating…"
            ) : (
              <span className="flex items-center justify-center gap-2">
                {mode === "signup" ? "Create Account" : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Link href="/signup" className="text-emerald-400 font-semibold hover:underline">
                Create one
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
