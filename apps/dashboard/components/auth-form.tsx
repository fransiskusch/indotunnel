"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, signup, ApiError } from "@/lib/api";
import Link from "next/link";

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
    <div className="w-full max-w-sm">
      <Link href="/" className="text-[18px] font-medium tracking-tight text-[color:var(--ink)]">
        IndoTunnel
      </Link>

      <h1
        className="mt-8 font-medium leading-[1.05] tracking-[-0.02em] text-[color:var(--ink)]"
        style={{ fontSize: "var(--step-head)" }}
      >
        {mode === "signup" ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-3 text-[16px] text-[color:var(--ink-muted)]">
        {mode === "signup"
          ? "Free to start. Your first tunnel is one command away."
          : "Pick up where you left off."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block text-[15px] font-medium text-[color:var(--ink)]">
          Email
          <Input
            type="email"
            placeholder="developer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
            required
          />
        </label>

        <label className="block text-[15px] font-medium text-[color:var(--ink)]">
          Password
          <Input
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2"
            required
          />
        </label>

        {error && <p className="text-[15px] text-[color:var(--danger)]">{error}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-[15px] text-[color:var(--ink-muted)]">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[color:var(--ink)] underline underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/signup" className="text-[color:var(--ink)] underline underline-offset-4">
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
