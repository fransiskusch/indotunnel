"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyDeviceCode } from "@/lib/api";
import Link from "next/link";

interface DeviceActivationFormProps {
  initialCode?: string;
}

const SURFACE = "rounded-md bg-[color:var(--surface-2)] p-6 sm:p-8";

export function DeviceActivationForm({ initialCode = "" }: DeviceActivationFormProps) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    const formatted = code.trim().toUpperCase();
    if (!formatted) {
      setError("Enter the code shown in your terminal.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyDeviceCode(formatted);
      setSuccess(true);
    } catch (err: any) {
      if (err?.code === "NOT_FOUND" || err?.status === 404) {
        setError("That code expired or never existed. Run 'indotunnel login' again.");
      } else {
        setError(err?.message || "Could not authorize the device. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={SURFACE} style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}>
        <p className="text-[20px] font-medium">Device authorized</p>
        <p className="mt-2 text-[16px]">
          Your terminal is signed in. You can close this window and return to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md px-4 py-2.5 text-[15px] font-medium transition-transform active:scale-[0.97]"
          style={{ backgroundColor: "var(--brand-ink)", color: "#ffffff" }}
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleApprove} className={SURFACE + " space-y-5"}>
      <label className="block text-[15px] font-medium text-[color:var(--ink)]">
        Device code
        <Input
          type="text"
          placeholder="ABCD-1234"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          className="mt-2 h-12 text-center text-[20px] tracking-[0.2em]"
          maxLength={12}
          autoFocus
        />
      </label>

      {error && <p className="text-[15px] text-[color:var(--danger)]">{error}</p>}

      <Button type="submit" disabled={loading || !code.trim()} className="w-full">
        {loading ? "Authorizing…" : "Approve device"}
      </Button>

      <p className="text-[15px] text-[color:var(--ink-muted)]">
        This creates one API key for this machine. Revoke it any time in
        settings.
      </p>
    </form>
  );
}
